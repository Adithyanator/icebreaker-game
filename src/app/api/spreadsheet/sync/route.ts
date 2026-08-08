import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth/admin';
import { syncVolunteersFromSpreadsheet } from '@/lib/services/spreadsheet';

export async function POST(request: Request) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { spreadsheetUrl } = body;

    if (!spreadsheetUrl) {
      return NextResponse.json({ error: 'Spreadsheet URL is required.' }, { status: 400 });
    }

    const result = await syncVolunteersFromSpreadsheet(spreadsheetUrl);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sync failed.' }, { status: 400 });
  }
}
