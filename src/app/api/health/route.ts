import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth/admin';
import { runPreEventValidation } from '@/lib/services/health';

export async function GET() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runPreEventValidation();
  return NextResponse.json(result);
}
