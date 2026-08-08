import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth/admin';
import { exportBackup } from '@/lib/services/health';

export async function GET() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backup = await exportBackup();

  return new NextResponse(backup.content, {
    status: 200,
    headers: {
      'Content-Type': backup.contentType,
      'Content-Disposition': `attachment; filename="${backup.filename}"`,
    },
  });
}
