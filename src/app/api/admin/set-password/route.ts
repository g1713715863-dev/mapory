import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { newPassword, secret } = await req.json()
  if (secret !== process.env.ADMIN_RESET_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })

  const user = data.users.find(u => u.email === 'g1713715863@gmail.com')
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 })

  const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
