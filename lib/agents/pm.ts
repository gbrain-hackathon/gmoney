import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';
import { MODEL } from './base';
import type { AgentOutput, Basket } from '../types';

const client = new Anthropic();

const BasketSchema = {
  type: 'object',
  properties: {
    positions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ticker: { type: 'string' },
          name: { type: 'string' },
          weight: { type: 'number' },
          rationale: { type: 'string' },
        },
        required: ['ticker', 'name', 'weight', 'rationale'],
        additionalProperties: false,
      },
    },
    narrative: { type: 'string' },
  },
  required: ['positions', 'narrative'],
  additionalProperties: false,
} as const;

export async function runPM(thesis: string, evidence: AgentOutput[]): Promise<Basket> {
  const skillPath = path.join(process.cwd(), 'skills', 'pm.md');
  const skill = await fs.readFile(skillPath, 'utf-8');

  const evidenceBlock = evidence
    .map((e) => `### ${e.agent.toUpperCase()} report\n\n${e.content}`)
    .join('\n\n---\n\n');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: skill,
        cache_control: { type: 'ephemeral' },
      },
    ],
    output_config: {
      format: { type: 'json_schema', schema: BasketSchema },
    },
    messages: [
      {
        role: 'user',
        content: `Investment thesis:\n\n${thesis}\n\n## Evidence\n\n${evidenceBlock}\n\nBuild the basket.`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return JSON.parse(text) as Basket;
}
