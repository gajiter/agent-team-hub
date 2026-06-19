import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    const expected = getTodayPassword()

    if (password !== expected) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    const token = generateToken(expected)
    const response = NextResponse.json({ success: true })

    response.cookies.set('hub_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    })

    return response
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })

  response.cookies.set('hub_auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
