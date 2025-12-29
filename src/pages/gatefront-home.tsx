import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRightIcon,
  GaugeIcon,
  ShieldCheckIcon,
  LogInIcon,
  SettingsIcon,
  SparklesIcon,
} from "lucide-react";

export default function GatefrontHome() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="flex flex-col gap-12">
          {/* Hero */}
          <div className="rounded-2xl border bg-card p-10 shadow-lg">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="px-3 py-1">
                  <SparklesIcon className="mr-1.5 h-3 w-3" />
                  Gateway
                </Badge>
                <Badge variant="outline" className="font-mono px-3 py-1">
                  /_gatefront
                </Badge>
              </div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                접근 제어와 프록시를 한 곳에서
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
                로그인 후 서비스별 권한/레이트리밋을 관리하고, 접속 로그와
                메트릭으로 이상 징후를 빠르게 파악하세요.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="gap-2 shadow-md">
                  <Link to="/_gatefront/auth/sign-in">
                    로그인하기 <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="gap-2 border-2"
                >
                  <Link to="/_gatefront/admin">
                    어드민 열기 <SettingsIcon className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                💡 어드민 페이지는 관리자 권한이 필요합니다.
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="rounded-xl border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-lg">
                  로그인
                  <div className="rounded-lg bg-primary/10 p-2">
                    <LogInIcon className="h-5 w-5 text-primary" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground leading-relaxed">
                  이메일 OTP 또는 소셜 로그인으로 접속합니다.
                </div>
                <Button asChild className="w-full">
                  <Link to="/_gatefront/auth/sign-in">로그인 페이지로</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-lg">
                  어드민
                  <div className="rounded-lg bg-orange-500/10 p-2">
                    <ShieldCheckIcon className="h-5 w-5 text-orange-600" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground leading-relaxed">
                  사용자 권한, 서비스 정책, 접속 로그를 관리합니다.
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/_gatefront/admin">어드민으로</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-lg">
                  메트릭
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <GaugeIcon className="h-5 w-5 text-blue-600" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground leading-relaxed">
                  Prometheus가 scrape 할 수 있는 /metrics 엔드포인트를
                  제공합니다.
                </div>
                <Button
                  asChild
                  variant="secondary"
                  className="w-full justify-between"
                >
                  <a href="/metrics" target="_blank" rel="noreferrer">
                    /metrics 열기 <ArrowRightIcon className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features Grid */}
          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            <div className="mb-6">
              <div className="text-lg font-semibold mb-1">핵심 기능</div>
              <div className="text-sm text-muted-foreground">
                운영 시 자주 쓰는 흐름만 간결하게 정리했습니다.
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="rounded-lg bg-primary/10 p-3 h-fit">
                  <ShieldCheckIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold">세션 기반 접근 제어</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    세션 없으면 로그인으로 유도하고, 사용자/서비스 정책으로
                    허용·차단을 제어합니다.
                  </div>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="rounded-lg bg-blue-500/10 p-3 h-fit">
                  <GaugeIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold">
                    트래픽/지연시간/에러 메트릭
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    요청 수·상태코드·지연시간을 수집하고, 레이트리밋/감사
                    이벤트도 카운팅합니다.
                  </div>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="rounded-lg bg-orange-500/10 p-3 h-fit">
                  <SettingsIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold">서비스 정책 관리</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    기본 Allow 및 레이트리밋을 UI로 관리해 운영 대응을 빠르게
                    합니다.
                  </div>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="rounded-lg bg-green-500/10 p-3 h-fit">
                  <LogInIcon className="h-5 w-5 text-green-600" />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold">접속 로그/상세 보기</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    IP/지리/클라이언트 정보를 포함해 분석하기 좋게 상세 UI로
                    제공합니다.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground py-4">
            Gateway UI • Built with Bun + Elysia + React
          </div>
        </div>
      </div>
    </div>
  );
}
