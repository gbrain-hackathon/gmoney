import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';

const client = new Anthropic();

export const MODEL = 'claude-opus-4-7';

const skillCache = new Map<string, string>();

async function loadSkill(name: string): Promise<string> {
  const cached = skillCache.get(name);
  if (cached) return cached;
  const filePath = path.join(process.cwd(), 'skills', `${name}.md`);
  const text = await fs.readFile(filePath, 'utf-8');
  skillCache.set(name, text);
  return text;
}

export interface RunAgentOptions {
  skill: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
}

export async function runAgent(opts: RunAgentOptions): Promise<string> {
  const skill = await loadSkill(opts.skill);
  const response = await client.messages.create({
    model: opts.model ?? MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: skill,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: opts.userMessage }],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}
