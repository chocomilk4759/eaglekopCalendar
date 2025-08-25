import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { getAdminClient } from '@/lib/supabaseAdminServer';

const INTERNAL_DOMAIN =
  process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN || 'eaglekop.invalid';

function idToEmail(id: string) {
  return `${id}@${INTERNAL_DOMAIN}`;
}


export async function POST(req: NextRequest) {
  try {
    const { id, newPassword } = await req.json() as { id: string; newPassword: string };
    if(!id || !newPassword) return NextResponse.json({ error: 'id/newPassword required' }, { status: 400 });

    const server = createServerSupabase();
    const { data: { user } } = await server.auth.getUser();
    if(!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    // only superadmin
    const { data: myRoles } = await server.from('user_roles').select('role,email').eq('email', user.email);
    const isSuper = (myRoles||[]).some(r=> r.role === 'superadmin');
    if(!isSuper) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const admin = getAdminClient();
    // find target user_id via user_roles
    const { data: target } = await admin.from('user_roles').select('user_id').eq('email', idToEmail(id)).maybeSingle();
    if(!target?.user_id) return NextResponse.json({ error: 'target not found' }, { status: 404 });

    const { error: updErr } = await admin.auth.admin.updateUserById(target.user_id, { password: newPassword });
    if(updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'server error' }, { status: 500 });
  }
}
