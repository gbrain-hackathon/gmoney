import { promises as fs } from 'fs';
import path from 'path';
import type { Thesis } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'theses');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function filePath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

export async function create(thesis: Thesis): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath(thesis.id), JSON.stringify(thesis, null, 2));
}

export async function read(id: string): Promise<Thesis | null> {
  try {
    const raw = await fs.readFile(filePath(id), 'utf-8');
    return JSON.parse(raw) as Thesis;
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

export async function update(id: string, patch: Partial<Thesis>): Promise<Thesis> {
  const current = await read(id);
  if (!current) throw new Error(`Thesis ${id} not found`);
  const next = { ...current, ...patch };
  await fs.writeFile(filePath(id), JSON.stringify(next, null, 2));
  return next;
}

export async function appendEvidence(
  id: string,
  output: Thesis['evidence'][number],
): Promise<void> {
  const current = await read(id);
  if (!current) throw new Error(`Thesis ${id} not found`);
  current.evidence.push(output);
  await fs.writeFile(filePath(id), JSON.stringify(current, null, 2));
}

export async function list(): Promise<Thesis[]> {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR);
  const theses = await Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map((f) => fs.readFile(path.join(DATA_DIR, f), 'utf-8').then((r) => JSON.parse(r) as Thesis)),
  );
  return theses.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
