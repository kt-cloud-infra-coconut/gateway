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

# 빌드 시 DATABASE_URL이 없어도 generate가 가능하도록 더미 값 주입
ENV DATABASE_URL="postgresql://postgres:password@localhost:5432/placeholder"
RUN bun prisma generate

ENV NODE_ENV=production

# 컨테이너 시작 시 DB 푸시 후 서버 실행
CMD ["sh", "-c", "bun prisma db push && bun server/index.ts"]

EXPOSE 3000