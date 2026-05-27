import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const { username, password } = await req.json()

  if (
    username !== process.env.AUTH_USERNAME ||
    password !== process.env.AUTH_PASSWORD
  ) {
    return Response.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('ccb_session', process.env.AUTH_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  })

  return Response.json({ ok: true })
}
