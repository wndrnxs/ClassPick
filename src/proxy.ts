import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "cp_session";

/**
 * 낙관적 인증 검사: 세션 쿠키가 없으면 워크스페이스 진입 전에 로그인으로 보냅니다.
 * (실제 세션 검증은 서버의 Data Access Layer에서 수행)
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && (pathname.startsWith("/app") || pathname.startsWith("/print") || pathname.startsWith("/student"))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/print/:path*", "/student/:path*"],
};
