import { NextResponse } from "next/server";

export async function middleware() {
  // Auth disabled — allow all routes through
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
