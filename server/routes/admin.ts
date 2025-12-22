import { Elysia, t } from 'elysia';
import { prisma } from '../db/prisma';
import { betterAuth } from '../middleware/auth';
import { ensureServicesInDbFromEnv } from '../lib/services';
import type { Prisma } from '../../generated/prisma/client';

function requireAdmin(user: any) {
  const role = (user?.role ?? '').toString();
  if (role !== 'admin' && !role.split(',').includes('admin')) {
    return false;
  }
  return true;
}

export const adminRoutes = new Elysia({ prefix: '/admin', tags: ['Admin'] })
  .use(betterAuth)
  .guard(
    {
      auth: true,
    },
    (app) =>
      app
        .resolve(({ status, user }) => {
          if (!requireAdmin(user)) return status(403);
          return {};
        })
        .get(
          '/services',
          async () => {
            await ensureServicesInDbFromEnv();
            return await prisma.service.findMany({
              orderBy: { host: 'asc' },
            });
          },
          {
            response: t.Array(
              t.Object({
                id: t.String(),
                host: t.String(),
                upstream: t.String(),
                name: t.String(),
                defaultAllow: t.Boolean(),
                defaultRateLimitWindowSec: t.Optional(t.Nullable(t.Number())),
                defaultRateLimitMax: t.Optional(t.Nullable(t.Number())),
              })
            ),
          }
        )
        .patch(
          '/services/:id',
          async ({ params, body, status }) => {
            const svc = await prisma.service.findUnique({
              where: { id: params.id },
            });
            if (!svc) return status(404);
            return await prisma.service.update({
              where: { id: params.id },
              data: {
                name: body.name ?? undefined,
                defaultAllow: body.defaultAllow ?? undefined,
                defaultRateLimitWindowSec:
                  body.defaultRateLimitWindowSec ?? undefined,
                defaultRateLimitMax: body.defaultRateLimitMax ?? undefined,
              },
            });
          },
          {
            params: t.Object({ id: t.String() }),
            body: t.Object({
              name: t.Optional(t.String()),
              defaultAllow: t.Optional(t.Boolean()),
              defaultRateLimitWindowSec: t.Optional(t.Nullable(t.Number())),
              defaultRateLimitMax: t.Optional(t.Nullable(t.Number())),
            }),
          }
        )
        .get(
          '/users',
          async ({ query }) => {
            const take = Math.min(200, Number(query.limit ?? 50));
            const skip = Number(query.offset ?? 0);

            const q = query.q?.trim();
            const where: Prisma.UserWhereInput | undefined = q
              ? {
                  OR: [
                    { email: { contains: q, mode: 'insensitive' } },
                    { name: { contains: q, mode: 'insensitive' } },
                  ],
                }
              : undefined;

            const [users, total] = await Promise.all([
              prisma.user.findMany({
                where,
                take,
                skip,
                orderBy: { createdAt: 'desc' },
                select: {
                  id: true,
                  email: true,
                  name: true,
                  role: true,
                  banned: true,
                  createdAt: true,
                },
              }),
              prisma.user.count({ where }),
            ]);

            return { users, total, limit: take, offset: skip };
          },
          {
            query: t.Object({
              q: t.Optional(t.String()),
              limit: t.Optional(t.Union([t.String(), t.Number()])),
              offset: t.Optional(t.Union([t.String(), t.Number()])),
            }),
          }
        )
        .patch(
          '/users/:id/role',
          async ({ params, body, status }) => {
            const u = await prisma.user.findUnique({
              where: { id: params.id },
            });
            if (!u) return status(404);
            return await prisma.user.update({
              where: { id: params.id },
              data: {
                role: body.role,
              },
              select: { id: true, role: true },
            });
          },
          {
            params: t.Object({ id: t.String() }),
            body: t.Object({ role: t.Nullable(t.String()) }),
          }
        )
        .get(
          '/users/:id/policies',
          async ({ params, status }) => {
            const u = await prisma.user.findUnique({
              where: { id: params.id },
            });
            if (!u) return status(404);
            await ensureServicesInDbFromEnv();

            const services = await prisma.service.findMany({
              orderBy: { host: 'asc' },
            });
            const policies = await prisma.userServicePolicy.findMany({
              where: { userId: params.id },
            });
            const byServiceId = new Map(policies.map((p) => [p.serviceId, p]));

            return services.map((s) => {
              const p = byServiceId.get(s.id);
              return {
                service: s,
                policy: p ?? null,
              };
            });
          },
          { params: t.Object({ id: t.String() }) }
        )
        .put(
          '/users/:userId/policies/:serviceId',
          async ({ params, body, status }) => {
            const u = await prisma.user.findUnique({
              where: { id: params.userId },
            });
            if (!u) return status(404);
            const svc = await prisma.service.findUnique({
              where: { id: params.serviceId },
            });
            if (!svc) return status(404);

            const p = await prisma.userServicePolicy.upsert({
              where: {
                userId_serviceId: {
                  userId: params.userId,
                  serviceId: params.serviceId,
                },
              },
              create: {
                userId: params.userId,
                serviceId: params.serviceId,
                allow: body.allow,
                rateLimitWindowSec: body.rateLimitWindowSec,
                rateLimitMax: body.rateLimitMax,
              },
              update: {
                allow: body.allow,
                rateLimitWindowSec: body.rateLimitWindowSec,
                rateLimitMax: body.rateLimitMax,
              },
            });
            return p;
          },
          {
            params: t.Object({
              userId: t.String(),
              serviceId: t.String(),
            }),
            body: t.Object({
              allow: t.Optional(t.Nullable(t.Boolean())),
              rateLimitWindowSec: t.Optional(t.Nullable(t.Number())),
              rateLimitMax: t.Optional(t.Nullable(t.Number())),
            }),
          }
        )
        .get(
          '/logs',
          async ({ query }) => {
            const take = Math.min(500, Number(query.limit ?? 100));
            const skip = Number(query.offset ?? 0);
            const where: any = {};

            if (query.userId) where.userId = query.userId;
            if (query.serviceId) where.serviceId = query.serviceId;
            if (query.host) where.host = query.host;

            if (query.from)
              where.createdAt = {
                ...(where.createdAt ?? {}),
                gte: new Date(query.from),
              };
            if (query.to)
              where.createdAt = {
                ...(where.createdAt ?? {}),
                lte: new Date(query.to),
              };

            const [logs, total] = await Promise.all([
              prisma.accessLog.findMany({
                where,
                take,
                skip,
                orderBy: { createdAt: 'desc' },
                select: {
                  id: true,
                  createdAt: true,
                  host: true,
                  path: true,
                  method: true,
                  status: true,
                  upstream: true,
                  blockedReason: true,
                  userId: true,
                  serviceId: true,
                  ip: true,
                },
              }),
              prisma.accessLog.count({ where }),
            ]);

            return { logs, total, limit: take, offset: skip };
          },
          {
            query: t.Object({
              userId: t.Optional(t.String()),
              serviceId: t.Optional(t.String()),
              host: t.Optional(t.String()),
              from: t.Optional(t.String()),
              to: t.Optional(t.String()),
              limit: t.Optional(t.Union([t.String(), t.Number()])),
              offset: t.Optional(t.Union([t.String(), t.Number()])),
            }),
          }
        )
  );
