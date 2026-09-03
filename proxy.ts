import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const isAuthenticated = request.cookies.has("librarian_session");

  if (request.nextUrl.pathname.startsWith("/user")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (request.nextUrl.pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/user", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/user/:path*"],
};
