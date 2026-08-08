import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth/admin';
import { exportResults } from '@/lib/services/health';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ format: string }> }
) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const format = resolvedParams.format === 'csv' ? 'csv' : 'json';
  const result = await exportResults(format);

  return new NextResponse(result.content, {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  });
}
