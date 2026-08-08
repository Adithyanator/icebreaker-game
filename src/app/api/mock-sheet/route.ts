import { NextResponse } from 'next/server';

export async function GET() {
  const csvData = `Name,Centre\nAdithyan,KP\nDilshan,VB\nKalyani,PB\nSreyaa,STC\nAqsa,EJ\nSync Volunteer,VB`;
  return new NextResponse(csvData, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}
