import { NextResponse } from 'next/server';
import * as store from '@/lib/store';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const thesis = await store.read(id);
  if (!thesis) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(thesis);
}
