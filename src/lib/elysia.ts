import { treaty } from '@elysiajs/eden';
import type { App } from '../../server/elysia';

// 게이트웨이 내부 API는 /_gate 접두사를 사용합니다.
// server/elysia.ts 에서 prefix: '/_gate'를 사용하므로,
// 여기서 baseURL에 /_gate를 붙이면 중복될 수 있습니다.
// Eden Treaty 2는 인스턴스의 정의된 경로를 그대로 따릅니다.
export const app = treaty<App>(window.location.origin);
