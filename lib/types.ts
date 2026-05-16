export type AgentName = 'analyst' | 'quant' | 'macro' | 'pm' | 'risk';

export type ThesisStatus =
  | 'pending'
  | 'analyzing'
  | 'synthesizing'
  | 'reviewing'
  | 'complete'
  | 'error';

export interface AgentOutput {
  agent: AgentName;
  content: string;
  completedAt: string;
}

export interface Position {
  ticker: string;
  name: string;
  weight: number;
  rationale: string;
}

export interface Basket {
  positions: Position[];
  narrative: string;
}

export interface Thesis {
  id: string;
  text: string;
  createdAt: string;
  status: ThesisStatus;
  evidence: AgentOutput[];
  basket: Basket | null;
  critique: string | null;
  error: string | null;
}
