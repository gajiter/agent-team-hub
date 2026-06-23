import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createHash } from 'crypto'

function getTodayPassword(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function generateToken(password: string): string {
  return createHash('sha256').update(`hub_auth_${password}`).digest('hex')
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow login page, auth API, and office static assets
  if (pathname === '/login' || pathname.startsWith('/api/auth') || pathname.startsWith('/office')) {
    return NextResponse.next()
  }

  const cookie = request.cookies.get('hub_auth')
  const expectedToken = generateToken(getTodayPassword())

  if (!cookie || cookie.value !== expectedToken) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|fonts).*)',
  ],
}
