import { Elysia } from "elysia";
import { register } from "../lib/metrics";

export const metricsRoutes = new Elysia({ tags: ["Metrics"] }).get(
  "/metrics",
  async () => {
    const body = await register.metrics();
    return new Response(body, {
      headers: {
        "content-type": register.contentType,
      },
    });
  },
  {
    detail: {
      summary: "Prometheus metrics",
      description:
        "Prometheus가 scrape 할 수 있는 텍스트 포맷 메트릭을 반환합니다.",
    },
  }
);
