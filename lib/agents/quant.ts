import { runAgent } from './base';

export async function runQuant(thesis: string): Promise<string> {
  return runAgent({
    skill: 'quant',
    userMessage: `Investment thesis:\n\n${thesis}\n\nProvide your quantitative report.`,
  });
}
