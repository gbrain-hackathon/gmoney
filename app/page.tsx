'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [thesis, setThesis] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/thesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thesis }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { id } = (await res.json()) as { id: string };
      router.push(`/thesis/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Investment thesis intake</h1>
      <p className="subtitle">
        Describe a worldview you believe is underpriced. Be specific — what is true,
        on what timeline, and why does the market not yet reflect it?
      </p>

      <textarea
        value={thesis}
        onChange={(e) => setThesis(e.target.value)}
        placeholder="Example: 'Power grid investment will accelerate over the next 5 years driven by data center demand and aging infrastructure. The market is pricing utilities like rate-capped legacy businesses, missing the capex-cycle upside in transmission, transformers, and grid software.'"
      />

      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={submit} disabled={submitting || thesis.trim().length < 20}>
          {submitting ? 'Starting…' : 'Run analysis'}
        </button>
        {error && <span className="status error">{error}</span>}
      </div>
    </main>
  );
}
