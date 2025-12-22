import { prisma } from '../db/prisma';

export type ServiceConfig = {
  host: string;
  upstream: string;
};

/**
 * 필수 환경 변수 (JSON)
 * - GATEWAY_SERVICES: '{"svc1.example.com":{"upstream":"http://svc1:8080"},"svc2.example.com":{"upstream":"http://svc2:8080"}}'
 */
export function readGatewayServicesFromEnv(): ServiceConfig[] {
  const json = process.env.GATEWAY_SERVICES;
  if (json && json.trim()) {
    try {
      const parsed = JSON.parse(json) as Record<string, { upstream: string }>;
      return Object.entries(parsed)
        .map(([host, v]) => ({ host, upstream: v?.upstream }))
        .filter((x) => x.host && x.upstream);
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * env 기반 서비스 목록을 DB에 upsert 합니다.
 * - host/upstream은 env를 source-of-truth로 유지합니다.
 * - name이 비어있으면 기본값으로 host를 사용합니다.
 */
export async function ensureServicesInDbFromEnv(): Promise<void> {
  const services = readGatewayServicesFromEnv();
  if (services.length === 0) return;

  const envHosts = services.map((s) => s.host);

  await Promise.all(
    services.map((s) =>
      prisma.service.upsert({
        where: { host: s.host },
        create: {
          host: s.host,
          upstream: s.upstream,
          name: s.host,
        },
        update: {
          upstream: s.upstream,
        },
      })
    )
  );

  // env를 source-of-truth로 삼기 위해, env에 없는 서비스는 DB에서 제거합니다.
  // (서비스 목록이 .env 변경 후에도 "그대로" 보이는 문제를 방지)
  await prisma.service.deleteMany({
    where: {
      host: { notIn: envHosts },
    },
  });
}

export async function getServiceByHost(host: string) {
  await ensureServicesInDbFromEnv();
  return prisma.service.findUnique({ where: { host } });
}
