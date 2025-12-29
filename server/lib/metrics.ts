import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

// 단일 레지스트리를 사용해 /metrics 에서 노출합니다.
export const register = new Registry();

// Node/Bun 공용 기본 메트릭 (CPU, 메모리 등)
collectDefaultMetrics({ register });

// ==========================================
// 1) 기본 HTTP 트래픽/에러율 + 지연시간
// ==========================================
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'] as const,
  registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status'] as const,
  buckets: [0.05, 0.1, 0.3, 0.5, 1.0, 3.0, 5.0, 10.0],
  registers: [register],
});

// ==========================================
// 2) 인증/인가 이벤트
// ==========================================
export const authEventsTotal = new Counter({
  name: 'auth_events_total',
  help: 'Total number of authentication events',
  labelNames: ['result', 'reason'] as const, // result: success|failure
  registers: [register],
});

// ==========================================
// 3) 레이트리밋 차단
// ==========================================
export const rateLimitHitsTotal = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of requests blocked by rate limiting',
  labelNames: ['client_ip_masked'] as const,
  registers: [register],
});

// ==========================================
// 4) 감사(Audit) 이벤트
// ==========================================
export const auditEventsTotal = new Counter({
  name: 'audit_events_total',
  help: 'Total number of configuration changes or critical audit events',
  labelNames: ['type'] as const,
  registers: [register],
});

export function nowSeconds(): number {
  return performance.now() / 1000;
}

export function safePathLabel(pathname: string): string {
  // Prometheus 라벨 cardinality 폭증을 방지하기 위한 최소한의 정규화.
  // - UUID, 숫자 ID 등을 일반화(대략적인 규칙)합니다.
  return pathname
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi,
      '/:uuid'
    )
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

export function maskClientIp(ip: string | null): string {
  if (!ip) return 'unknown';

  // IPv4: /24 마스킹
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0/24`;

  // IPv6: 앞쪽 4그룹만 남김(대략적인 마스킹)
  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean);
    return `${parts.slice(0, 4).join(':')}::/64`;
  }

  return 'unknown';
}


