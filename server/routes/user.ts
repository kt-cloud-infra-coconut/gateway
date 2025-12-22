import { Elysia, t } from 'elysia';
import { betterAuth } from '../middleware/auth';

export const userRoutes = new Elysia({ tags: ['User'] })
  .use(betterAuth)
  .get('/user', ({ user }) => user, {
    auth: true,
    response: {
      200: t.Object({
        id: t.String(),
        email: t.String(),
        name: t.String(),
        emailVerified: t.Boolean(),
        image: t.Optional(t.Nullable(t.String())),
        role: t.Optional(t.Nullable(t.String())),
        banned: t.Optional(t.Nullable(t.Boolean())),
        banReason: t.Optional(t.Nullable(t.String())),
        banExpires: t.Optional(t.Nullable(t.Date())),
      }),
      401: t.Literal('Unauthorized'),
    },
    detail: {
      summary: '현재 로그인 유저 정보',
      description:
        '세션을 확인하여 현재 로그인된 사용자의 상세 정보를 반환합니다.',
    },
  });
