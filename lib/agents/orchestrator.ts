import { runAnalyst } from './analyst';
import { runQuant } from './quant';
import { runMacro } from './macro';
import { runPM } from './pm';
import { runRisk } from './risk';
import * as store from '../store';
import type { AgentOutput } from '../types';

export async function runPipeline(thesisId: string): Promise<void> {
  const thesis = await store.read(thesisId);
  if (!thesis) throw new Error(`Thesis ${thesisId} not found`);

  await store.update(thesisId, { status: 'analyzing' });

  const [analyst, quant, macro] = await Promise.all([
    runAnalyst(thesis.text).then((content) => makeOutput('analyst', content)),
    runQuant(thesis.text).then((content) => makeOutput('quant', content)),
    runMacro(thesis.text).then((content) => makeOutput('macro', content)),
  ]);

  await store.update(thesisId, {
    status: 'synthesizing',
    evidence: [analyst, quant, macro],
  });

  const basket = await runPM(thesis.text, [analyst, quant, macro]);

  await store.update(thesisId, {
    status: 'reviewing',
    basket,
  });

  const critique = await runRisk(thesis.text, basket);

  await store.update(thesisId, {
    status: 'complete',
    critique,
  });
}

function makeOutput(agent: AgentOutput['agent'], content: string): AgentOutput {
  return { agent, content, completedAt: new Date().toISOString() };
}
