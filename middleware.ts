import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "./auth.config";

export function middleware(request: NextRequest) {
  if (process.env.AUTH_ENFORCED !== "true") return NextResponse.next();
  const protectedRoute = authConfig.protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));
  const session = request.cookies.get(authConfig.accessCookie);
  if (protectedRoute && !session) return NextResponse.redirect(new URL(authConfig.loginRoute, request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
