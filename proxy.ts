import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'ccb_session'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const session = request.cookies.get(SESSION_COOKIE)
  if (session?.value !== process.env.AUTH_SECRET) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
