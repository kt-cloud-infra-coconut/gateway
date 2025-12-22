import { createAuthClient } from 'better-auth/react';
import {
  adminClient,
  apiKeyClient,
  emailOTPClient,
  lastLoginMethodClient,
} from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  // 백엔드 API 경로인 /_gateback 을 기본 URL로 설정합니다.
  // 이 뒤에 자동으로 /signin/social 등이 붙어 호출됩니다.
  baseURL: window.location.origin + '/_gateback',
  plugins: [
    lastLoginMethodClient(),
    adminClient(),
    apiKeyClient(),
    emailOTPClient(),
  ],
});
