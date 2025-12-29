import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { helloRoutes } from './routes/hello';
import { userRoutes } from './routes/user';
import { proxyRoutes } from './routes/proxy';
import { adminRoutes } from './routes/admin';
import { metricsRoutes } from './routes/metrics';
import { prisma } from './db/prisma';
import { auth } from './lib/auth';
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
  nowSeconds,
  safePathLabel,
} from './lib/metrics';

// 게이트웨이 내부(인증/관리) 경로는 /_gateback 아래로 고정합니다.
const gateback = new Elysia({ prefix: '/_gateback' })
  .use(
    openapi({
      path: '/docs',
      exclude: {
        paths: ['/auth', '/auth/*'],
      },
    })
  )
  .use(
    cors({
      origin: [process.env.BETTER_AUTH_URL!],
      credentials: true,
    })
  )
  .use(helloRoutes)
  .use(userRoutes)
  .use(adminRoutes)
  // 내부 API 요청에 대한 모든 응답을 로그로 기록합니다.
  .onAfterResponse({ as: 'global' }, async ({ request, set }) => {
    try {
      const url = new URL(request.url);
      const host = request.headers.get('host')?.split(':')[0] ?? '(missing)';

      // 세션 정보를 가져와서 유저 ID 기록 시도 (쿠키만 사용하므로 바디 소비 없음)
      const session = await auth.api.getSession({ headers: request.headers });

      await prisma.accessLog.create({
        data: {
          host,
          path: url.pathname,
          method: request.method,
          status: (set.status as number) || 200,
          ip: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: session?.user?.id,
        },
      });

      // 메트릭: 내부 API(/_gateback/*) 트래픽/지연시간
      // - proxy.ts 는 자체적으로 측정하므로 여기서는 gateback만 처리합니다.
      // - Elysia set.status 를 기반으로 status label을 계산합니다.
      const status = String((set.status as number) || 200);
      const path = safePathLabel(url.pathname);
      httpRequestsTotal.inc({ method: request.method, path, status });
    } catch (e) {
      console.error('Gateback logging failed:', e);
    }
  });

// 최상위 앱은 prefix 없이 전체 트래픽을 받되,
// 1) /_gateback/* 은 우리 게이트웨이(인증/관리)로 처리
// 2) 그 외 /* 은 기본적으로 프록시 처리
const requestStart = new WeakMap<Request, number>();

const app = new Elysia()
  // /metrics 는 프록시보다 먼저 등록되어야 합니다.
  .use(metricsRoutes)
  .use(gateback)
  // gateback 이외 경로도 포함해 전체 요청에 대한 지연시간만 기록합니다.
  // (요청수/상태코드 카운트는 gateback/proxy에서 더 정확하게 기록)
  .onRequest(({ request }) => {
    requestStart.set(request, nowSeconds());
  })
  .onAfterResponse({ as: 'global' }, ({ request, set }) => {
    const start = requestStart.get(request);
    if (start == null) return;

    const url = new URL(request.url);
    const status = String((set.status as number) || 200);
    const path = safePathLabel(url.pathname);
    const duration = Math.max(0, nowSeconds() - start);
    httpRequestDurationSeconds.observe(
      { method: request.method, path, status },
      duration
    );
  })
  // 마지막에 프록시를 붙여, 미리 정의된 라우트(/_gateback 아래 라우트)를 우선 처리합니다.
  .use(proxyRoutes);

export type App = typeof app;
export default app;
