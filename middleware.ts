import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "attendance_token";
const PUBLIC_PATHS = ["/login"];
const ADMIN_ONLY_PATHS = ["/employees", "/login-activity"];

function isAdminOnlyPath(pathname: string) {
  return ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let API auth routes, static assets, and the login page through untouched.
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const secret = process.env.JWT_SECRET;

  let role: unknown = null;
  let isAuthenticated = false;
  if (token && secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      isAuthenticated = true;
      role = payload.role;
    } catch {
      isAuthenticated = false;
    }
  }

  if (!isAuthenticated) {
    // API routes get a 401 JSON response, pages get redirected to /login.
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminOnlyPath(pathname) && role !== "admin") {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Admins only" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
