import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { runPipeline } from '@/lib/agents/orchestrator';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { thesis?: string } | null;
  const text = body?.thesis?.trim();
  if (!text || text.length < 20) {
    return NextResponse.json(
      { error: 'thesis must be at least 20 characters' },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  await store.create({
    id,
    text,
    createdAt: new Date().toISOString(),
    status: 'pending',
    evidence: [],
    basket: null,
    critique: null,
    error: null,
  });

  runPipeline(id).catch(async (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline ${id}] failed:`, err);
    await store.update(id, { status: 'error', error: message }).catch(() => {});
  });

  return NextResponse.json({ id });
}
