import { Elysia } from 'elysia';
import { auth } from '../lib/auth';
import { prisma } from '../db/prisma';
import { getServiceByHost } from '../lib/services';
import {
  authEventsTotal,
  httpRequestDurationSeconds,
  httpRequestsTotal,
  maskClientIp,
  nowSeconds,
  rateLimitHitsTotal,
  safePathLabel,
} from '../lib/metrics';

function parseHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  return hostHeader.split(':')[0] ?? null;
}

type WindowCounter = { windowStartMs: number; count: number };
const counters = new Map<string, WindowCounter>();

function getClientIp(request: Request): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

function makeCounterKey(userId: string, serviceId: string): string {
  return `${userId}:${serviceId}`;
}

function checkRateLimit(opts: {
  key: string;
  windowSec: number;
  max: number;
}): { allowed: boolean; remaining: number; resetMs: number } {
  const windowMs = opts.windowSec * 1000;
  const now = Date.now();
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const existing = counters.get(opts.key);

  let counter: WindowCounter;
  if (!existing || existing.windowStartMs !== windowStartMs) {
    counter = { windowStartMs, count: 0 };
    counters.set(opts.key, counter);
  } else {
    counter = existing;
  }

  counter.count += 1;
  const remaining = Math.max(0, opts.max - counter.count);
  const resetMs = windowStartMs + windowMs;
  return { allowed: counter.count <= opts.max, remaining, resetMs };
}

function buildLoginRedirectUrl(reqUrl: URL): string {
  // 로그인 후 원래 주소로 복귀하도록 redirect 파라미터로 현재 경로/쿼리를 전달합니다.
  const redirect = `${reqUrl.pathname}${reqUrl.search}`;
  const login = new URL('/_gatefront/auth/sign-in', reqUrl.origin);
  login.searchParams.set('redirect', redirect);
  return login.toString();
}

export const proxyRoutes = new Elysia()
  // /_gateback 이외의 모든 경로는 기본적으로 프록시 대상으로 처리합니다. (서비스 경로 변경 불필요)
  .all('/*', async ({ request }) => {
    const start = nowSeconds();
    const url = new URL(request.url);
    const host = parseHost(request.headers.get('host'));

    // 게이트웨이 내부 경로는 여기서 프록시하지 않습니다.
    if (url.pathname.startsWith('/_gateback')) {
      const status = '404';
      const path = safePathLabel(url.pathname);
      httpRequestsTotal.inc({ method: request.method, path, status });
      httpRequestDurationSeconds.observe(
        { method: request.method, path, status },
        Math.max(0, nowSeconds() - start)
      );
      return new Response('Not Found', { status: 404 });
    }

    if (!host) {
      const msg = 'Missing Host header';
      await prisma.accessLog
        .create({
          data: {
            host: request.headers.get('host') ?? '(missing)',
            path: url.pathname,
            method: request.method,
            status: 400,
            ip: getClientIp(request) ?? undefined,
            userAgent: request.headers.get('user-agent') ?? undefined,
            blockedReason: 'MISSING_HOST',
          },
        })
        .catch(console.error);
      const status = '400';
      const path = safePathLabel(url.pathname);
      httpRequestsTotal.inc({ method: request.method, path, status });
      httpRequestDurationSeconds.observe(
        { method: request.method, path, status },
        Math.max(0, nowSeconds() - start)
      );
      return new Response(msg, { status: 400 });
    }

    const service = await getServiceByHost(host);
    if (!service) {
      const msg =
        'No upstream configured. Set GATEWAY_SERVICES JSON env (e.g. {"a.com":{"upstream":"http://a:8080"}}).';
      await prisma.accessLog
        .create({
          data: {
            host,
            path: url.pathname,
            method: request.method,
            status: 502,
            ip: getClientIp(request) ?? undefined,
            userAgent: request.headers.get('user-agent') ?? undefined,
            blockedReason: 'NO_SERVICE',
          },
        })
        .catch(console.error);
      const status = '502';
      const path = safePathLabel(url.pathname);
      httpRequestsTotal.inc({ method: request.method, path, status });
      httpRequestDurationSeconds.observe(
        { method: request.method, path, status },
        Math.max(0, nowSeconds() - start)
      );
      return new Response(msg, { status: 502 });
    }

    // 1) 세션 체크: 세션이 없으면 로그인 페이지로 리다이렉트
    //    (쿠키/헤더만 사용하므로 request body는 소비되지 않습니다.)
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      authEventsTotal.inc({ result: 'failure', reason: 'no_session' });
      await prisma.accessLog.create({
        data: {
          host,
          path: url.pathname,
          method: request.method,
          status: 302,
          upstream: service.upstream,
          ip: getClientIp(request) ?? undefined,
          userAgent: request.headers.get('user-agent') ?? undefined,
          serviceId: service.id,
          blockedReason: 'NO_SESSION',
        },
      });
      const status = '302';
      const path = safePathLabel(url.pathname);
      httpRequestsTotal.inc({ method: request.method, path, status });
      httpRequestDurationSeconds.observe(
        { method: request.method, path, status },
        Math.max(0, nowSeconds() - start)
      );
      return Response.redirect(buildLoginRedirectUrl(url), 302);
    }
    authEventsTotal.inc({ result: 'success', reason: 'session_ok' });

    // 2) 권한/레이트리밋 정책 계산 (유저별 override -> 서비스 기본)
    const userId = session.user.id as string;
    const policy = await prisma.userServicePolicy.findUnique({
      where: {
        userId_serviceId: {
          userId,
          serviceId: service.id,
        },
      },
    });

    const allow = policy?.allow ?? service.defaultAllow;
    if (!allow) {
      await prisma.accessLog.create({
        data: {
          host,
          path: url.pathname,
          method: request.method,
          status: 403,
          upstream: service.upstream,
          ip: getClientIp(request) ?? undefined,
          userAgent: request.headers.get('user-agent') ?? undefined,
          userId,
          serviceId: service.id,
          blockedReason: 'DENY',
        },
      });
      const status = '403';
      const path = safePathLabel(url.pathname);
      httpRequestsTotal.inc({ method: request.method, path, status });
      httpRequestDurationSeconds.observe(
        { method: request.method, path, status },
        Math.max(0, nowSeconds() - start)
      );
      return new Response('Forbidden', { status: 403 });
    }

    const windowSec =
      policy?.rateLimitWindowSec ?? service.defaultRateLimitWindowSec ?? null;
    const max = policy?.rateLimitMax ?? service.defaultRateLimitMax ?? null;

    if (windowSec && max && windowSec > 0 && max > 0) {
      const key = makeCounterKey(userId, service.id);
      const rl = checkRateLimit({ key, windowSec, max });
      if (!rl.allowed) {
        rateLimitHitsTotal.inc({
          client_ip_masked: maskClientIp(getClientIp(request)),
        });
        await prisma.accessLog.create({
          data: {
            host,
            path: url.pathname,
            method: request.method,
            status: 429,
            upstream: service.upstream,
            ip: getClientIp(request) ?? undefined,
            userAgent: request.headers.get('user-agent') ?? undefined,
            userId,
            serviceId: service.id,
            blockedReason: 'RATE_LIMIT',
          },
        });
        const status = '429';
        const path = safePathLabel(url.pathname);
        httpRequestsTotal.inc({ method: request.method, path, status });
        httpRequestDurationSeconds.observe(
          { method: request.method, path, status },
          Math.max(0, nowSeconds() - start)
        );
        return new Response('Too Many Requests', {
          status: 429,
          headers: {
            'retry-after': String(
              Math.max(1, Math.ceil((rl.resetMs - Date.now()) / 1000))
            ),
            'x-ratelimit-limit': String(max),
            'x-ratelimit-remaining': String(0),
          },
        });
      }
    }

    // 3) 경로를 바꾸지 않고 업스트림으로 그대로 프록시 (도메인으로만 서비스 구분)
    const strippedPath = url.pathname || '/';
    const upstreamUrl = new URL(service.upstream);
    upstreamUrl.pathname = strippedPath;
    upstreamUrl.search = url.search;

    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('content-length');
    headers.set('x-forwarded-host', host ?? '');
    headers.set('x-forwarded-proto', upstreamUrl.protocol.replace(':', ''));
    headers.set('x-forwarded-uri', `${url.pathname}${url.search}`);
    headers.set('x-gateway-user-id', userId);
    headers.set('x-gateway-service-id', service.id);

    // body 포함 요청도 처리하기 위해 clone 사용
    const proxied = new Request(upstreamUrl.toString(), {
      method: request.method,
      headers,
      body: request.body ? request.clone().body : undefined,
      redirect: 'manual',
    });

    const res = await fetch(proxied);
    const status = String(res.status);
    const path = safePathLabel(url.pathname);
    httpRequestsTotal.inc({ method: request.method, path, status });
    httpRequestDurationSeconds.observe(
      { method: request.method, path, status },
      Math.max(0, nowSeconds() - start)
    );
    // 비동기 로그 적재 (응답 지연 최소화)
    prisma.accessLog
      .create({
        data: {
          host,
          path: url.pathname,
          method: request.method,
          status: res.status,
          upstream: service.upstream,
          ip: getClientIp(request) ?? undefined,
          userAgent: request.headers.get('user-agent') ?? undefined,
          userId,
          serviceId: service.id,
        },
      })
      .catch(console.error);
    return res;
  });
