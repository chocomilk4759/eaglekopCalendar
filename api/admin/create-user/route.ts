export const runtime = 'nodejs'; // ⬅︎ 서비스 키 읽히도록 Node 런타임 강제

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { getAdminClient } from '@/lib/supabaseAdminServer';

const INTERNAL_DOMAIN =
  process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN || 'eaglekop.invalid';
const idToEmail = (id: string) => `${id}@${INTERNAL_DOMAIN}`;

export async function POST(req: NextRequest) {
  try {
    const { id, password, role } = await req.json() as { id: string; password: string; role: 'editor'|'admin' };
    if(!id || !password || !role) return NextResponse.json({ error: 'id/password/role required' }, { status: 400 });

    const server = createServerSupabase();
    const { data: { user } } = await server.auth.getUser();
    if(!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    // 권한 확인
    const { data: myRoles, error: roleErr } = await server.from('user_roles').select('role,email').eq('email', user.email);
    if(roleErr) return NextResponse.json({ error: 'role query failed' }, { status: 500 });
    const roles = new Set((myRoles||[]).map(r=> r.role as string));
    const isSuper = roles.has('superadmin');
    const isAdmin = roles.has('admin') || isSuper;
    if(!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if(role === 'admin' && !isSuper) return NextResponse.json({ error: 'only superadmin can create admin' }, { status: 403 });

    const admin = getAdminClient();
    // 사용자 생성 (이메일 확인된 상태)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: idToEmail(id),
      password,
      email_confirm: true,
      user_metadata: { id }
    });
    if(createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });

    // 역할 부여
    const { error: grantErr } = await admin
      .from('user_roles')
      .insert({ user_id: created.user?.id, email: idToEmail(id), role });
    if(grantErr) return NextResponse.json({ error: grantErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, user_id: created.user?.id });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'server error' }, { status: 500 });
  }
}
