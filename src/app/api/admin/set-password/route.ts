import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { newPassword, secret } = await req.json()
  if (secret !== process.env.ADMIN_RESET_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!rawUrl || !key) {
    return NextResponse.json(
      { error: 'missing env vars', hasUrl: !!rawUrl, hasKey: !!key },
      { status: 500 }
    )
  }

  // Strip any path suffix — only keep the origin (e.g. https://xxx.supabase.co)
  const base = new URL(rawUrl).origin

  const listRes = await fetch(`${base}/auth/v1/admin/users?page=1&per_page=50`, {
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
  })

  if (!listRes.ok) {
    const body = await listRes.text()
    return NextResponse.json(
      { error: `listUsers ${listRes.status}`, urlUsed: `${base}/auth/v1/admin/users`, body },
      { status: 500 }
    )
  }

  const { users } = await listRes.json()
  const user = (users as { id: string; email: string }[]).find(
    (u) => u.email === 'g1713715863@gmail.com'
  )

  if (!user) {
    return NextResponse.json(
      { error: 'user not found', total: users?.length },
      { status: 404 }
    )
  }

  const updateRes = await fetch(`${base}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: newPassword }),
  })

  if (!updateRes.ok) {
    const body = await updateRes.text()
    return NextResponse.json(
      { error: `updateUser ${updateRes.status}`, body },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
