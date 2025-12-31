import { serve } from "bun";
import index from "../public/index.html";
import app from "./elysia";
import { register } from "./lib/metrics";

const server = serve({
  port: 80,
  routes: {
    // /metrics는 최우선 처리 (Elysia 거치지 않음)
    "/metrics": async () => {
      const body = await register.metrics();
      return new Response(body, {
        headers: {
          "content-type": register.contentType,
        },
      });
    },

    // 게이트웨이 내부 API 및 인증 처리
    "/*": (req) => app.handle(req),

    // 그 외 모든 경로 및 SPA 폴백
    "/_gatefront": index,
    "/_gatefront/": index,
    "/_gatefront/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Gateway running at ${server.url}`);
