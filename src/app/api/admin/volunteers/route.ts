import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth/admin';
import { getAllVolunteers, addVolunteer, deleteVolunteer } from '@/lib/services/volunteers';
import { RESERVED_CODES } from '@/lib/constants';

export async function GET() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const volunteers = await getAllVolunteers();
  return NextResponse.json({ volunteers });
}

export async function POST(request: Request) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, centre } = await request.json();
    if (!name || !centre) {
      return NextResponse.json({ error: 'Name and Centre are required.' }, { status: 400 });
    }

    const allVols = await getAllVolunteers();
    const usedCodes = new Set(allVols.map((v) => v.code).concat(RESERVED_CODES));

    let newCode = '';
    do {
      newCode = String(Math.floor(100 + Math.random() * 900));
    } while (usedCodes.has(newCode));

    const volunteer = await addVolunteer(name, centre, newCode);
    return NextResponse.json({ volunteer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add volunteer' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get('id');
    let id = idStr ? parseInt(idStr, 10) : null;

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Volunteer ID is required' }, { status: 400 });
    }

    await deleteVolunteer(id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete volunteer' }, { status: 400 });
  }
}
