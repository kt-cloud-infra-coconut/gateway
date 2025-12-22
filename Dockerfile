FROM oven/bun AS build

WORKDIR /app

COPY package.json package.json

COPY ./src ./src
COPY ./prisma ./prisma
COPY ./public ./public
COPY ./server ./server
COPY ./bunfig.toml ./bunfig.toml
COPY ./tsconfig.json ./tsconfig.json
COPY ./build.ts ./build.ts
COPY ./prisma.config.ts ./prisma.config.ts

RUN bun install

RUN bun prisma generate
RUN bun prisma db push

ENV NODE_ENV=production

CMD ["bun", "server/index.ts"]

EXPOSE 3000