import { cookies } from 'next/headers'

export async function requireAuth(): Promise<Response | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('ccb_session')
  if (session?.value !== process.env.AUTH_SECRET) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }
  return null
}
