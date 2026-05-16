import { runAgent } from './base';
import type { Basket } from '../types';

export async function runRisk(thesis: string, basket: Basket): Promise<string> {
  const basketBlock = basket.positions
    .map((p) => `- ${p.ticker} (${p.name}) — ${p.weight}% — ${p.rationale}`)
    .join('\n');

  return runAgent({
    skill: 'risk',
    userMessage: `Investment thesis:\n\n${thesis}\n\n## Proposed basket\n\n${basket.narrative}\n\n${basketBlock}\n\nRed-team this basket.`,
  });
}
