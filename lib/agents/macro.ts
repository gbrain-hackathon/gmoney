import { runAgent } from './base';

export async function runMacro(thesis: string): Promise<string> {
  return runAgent({
    skill: 'macro',
    userMessage: `Investment thesis:\n\n${thesis}\n\nProvide your macro report.`,
  });
}
