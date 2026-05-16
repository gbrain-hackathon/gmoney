import { runAgent } from './base';

export async function runAnalyst(thesis: string): Promise<string> {
  return runAgent({
    skill: 'analyst',
    userMessage: `Investment thesis:\n\n${thesis}\n\nProvide your analyst report.`,
  });
}
