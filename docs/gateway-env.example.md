# Gateway env 예시

## 필수 env

### Database

```bash
DATABASE_URL=postgresql://postgres:password@db:5432/gateway?schema=public
```

### Gateway 서비스 매핑 (JSON only)

```bash
GATEWAY_SERVICES={"svc1.local":{"upstream":"http://nginx1:80"},"svc2.local":{"upstream":"http://nginx2:80"}}
```

## Better Auth URL (도메인 2개 이상일 때)

Better Auth는 기본적으로 **단일 `baseURL`(canonical origin)** 을 전제로 OAuth callback/redirect URL 등을 구성합니다.

- **권장**: 인증용 도메인을 1개로 고정 (예: `auth.example.com`)
  - 예:
    - `BETTER_AUTH_URL=https://auth.example.com`
    - 게이트웨이에서 세션이 없으면 항상 `https://auth.example.com/_gatefront/auth/sign-in?...` 로 보내는 구조 권장
  - 여러 서비스 도메인이 `*.example.com` 형태라면 **쿠키 도메인**을 `.example.com` 으로 맞추는 옵션을 추가해야 세션 공유가 가능합니다(라이브러리 지원 여부에 따라 설정 필요).

- **주의**: 서로 다른 최상위 도메인(예: `a.com`, `b.net`) 간에는 브라우저 쿠키를 공유할 수 없어 “하나의 로그인 세션”을 그대로 쓰는 구조가 어렵습니다.


