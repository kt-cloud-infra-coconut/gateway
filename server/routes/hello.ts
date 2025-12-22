import { Elysia, t } from 'elysia';

export const helloRoutes = new Elysia({ tags: ['Hello'] })
  .get(
    '/hello',
    () => ({
      message: 'Hello, world!',
      method: 'GET',
    }),
    {
      response: {
        200: t.Object({
          message: t.String(),
          method: t.String(),
        }),
      },
      detail: {
        summary: '기본 인사 (GET)',
        description: '서버 상태 확인용 기본 인사 메시지를 반환합니다.',
      },
    }
  )
  .put(
    '/hello',
    () => ({
      message: 'Hello, world!',
      method: 'PUT',
    }),
    {
      response: {
        200: t.Object({
          message: t.String({
            error: 'Message is required',
          }),
          method: t.String({
            error: 'Method is required',
          }),
        }),
        422: t.String(),
      },
      detail: {
        summary: '기본 인사 (PUT)',
      },
    }
  )
  .get(
    '/hello/:name',
    ({ params: { name } }) => ({
      message: `Hello, ${name}!`,
    }),
    {
      params: t.Object({
        name: t.Number(),
      }),
      response: {
        200: t.Object({
          message: t.String(),
        }),
        422: t.String(),
      },
      detail: {
        summary: '이름 기반 인사',
        description: '경로 파라미터로 전달된 이름으로 인사를 반환합니다.',
      },
    }
  );
