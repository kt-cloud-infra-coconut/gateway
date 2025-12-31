import { Elysia } from "elysia";
import { auth } from "../lib/auth";
import { authEventsTotal } from "../lib/metrics";

export const betterAuth = new Elysia({ name: "better-auth" })
  // better-auth 핸들러를 직접 처리하고 메트릭 기록
  .all("/*", async ({ request }) => {
    const url = new URL(request.url);

    // better-auth 핸들러 호출
    const response = await auth.handler(request);
    const statusCode = response.status;

    console.log(
      `[BETTER-AUTH] ${request.method} ${url.pathname} - Status: ${statusCode}`
    );

    // 이메일 OTP 로그인
    if (
      url.pathname.endsWith("/sign-in/email-otp") &&
      request.method === "POST"
    ) {
      if (statusCode >= 200 && statusCode < 300) {
        authEventsTotal.inc({ result: "success", reason: "email_otp_login" });
        console.log("✅ [METRIC] email_otp_login success");
      } else {
        authEventsTotal.inc({ result: "failure", reason: "email_otp_invalid" });
        console.log("❌ [METRIC] email_otp_invalid failure");
      }
    }

    // OTP 발송
    if (
      url.pathname.includes("/email-otp/send-verification-otp") &&
      request.method === "POST"
    ) {
      if (statusCode >= 200 && statusCode < 300) {
        authEventsTotal.inc({ result: "success", reason: "otp_sent" });
        console.log("📧 [METRIC] otp_sent success");
      } else {
        authEventsTotal.inc({ result: "failure", reason: "otp_send_failed" });
        console.log("❌ [METRIC] otp_send_failed");
      }
    }

    // 소셜 로그인
    if (
      (url.pathname.includes("/sign-in/social") ||
        url.pathname.includes("/callback/")) &&
      request.method === "POST"
    ) {
      const provider =
        url.searchParams.get("provider") ||
        url.pathname.split("/").pop() ||
        "unknown";
      if (statusCode >= 200 && statusCode < 400) {
        authEventsTotal.inc({
          result: "success",
          reason: `social_${provider}`,
        });
        console.log(`🔑 [METRIC] social_${provider} success`);
      } else {
        authEventsTotal.inc({
          result: "failure",
          reason: `social_${provider}_failed`,
        });
        console.log(`❌ [METRIC] social_${provider}_failed`);
      }
    }

    return response;
  })
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({
          headers,
        });

        if (!session) {
          authEventsTotal.inc({ result: "failure", reason: "no_session" });
          return status(401, "Unauthorized");
        }

        authEventsTotal.inc({ result: "success", reason: "session_ok" });

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });
