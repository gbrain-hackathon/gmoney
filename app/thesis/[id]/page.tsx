'use client';

import { use, useEffect, useState } from 'react';
import type { Thesis } from '@/lib/types';

const POLL_MS = 3000;
const TERMINAL = new Set(['complete', 'error']);

export default function ThesisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/thesis/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Thesis;
        if (cancelled) return;
        setThesis(data);
        if (!TERMINAL.has(data.status)) {
          setTimeout(poll, POLL_MS);
        }
      } catch (err: unknown) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : String(err));
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (fetchError) {
    return (
      <main>
        <h1>Error</h1>
        <p>{fetchError}</p>
      </main>
    );
  }

  if (!thesis) {
    return (
      <main>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Thesis</h1>
      <div className="card">
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{thesis.text}</p>
      </div>

      <div style={{ marginTop: 16 }}>
        <span className={`status ${thesis.status}`}>{statusLabel(thesis.status)}</span>
      </div>

      {thesis.error && (
        <div className="card" style={{ borderColor: 'var(--error)' }}>
          <strong>Pipeline error:</strong> {thesis.error}
        </div>
      )}

      {thesis.evidence.length > 0 && (
        <>
          <h2>Evidence</h2>
          {thesis.evidence.map((ev) => (
            <div key={ev.agent} className="card evidence">
              <h3 style={{ marginTop: 0 }}>{ev.agent.toUpperCase()}</h3>
              <pre>{ev.content}</pre>
            </div>
          ))}
        </>
      )}

      {thesis.basket && (
        <>
          <h2>Basket</h2>
          <div className="card">
            <p style={{ marginTop: 0 }}>{thesis.basket.narrative}</p>
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Name</th>
                  <th className="weight">Weight</th>
                  <th>Rationale</th>
                </tr>
              </thead>
              <tbody>
                {thesis.basket.positions.map((p) => (
                  <tr key={p.ticker}>
                    <td>
                      <strong>{p.ticker}</strong>
                    </td>
                    <td>{p.name}</td>
                    <td className="weight">{p.weight}%</td>
                    <td>{p.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {thesis.critique && (
        <>
          <h2>Risk critique</h2>
          <div className="card evidence">
            <pre>{thesis.critique}</pre>
          </div>
        </>
      )}
    </main>
  );
}

function statusLabel(s: Thesis['status']): string {
  switch (s) {
    case 'pending':
      return 'queued';
    case 'analyzing':
      return 'analysts running…';
    case 'synthesizing':
      return 'PM synthesizing…';
    case 'reviewing':
      return 'risk reviewing…';
    case 'complete':
      return 'complete';
    case 'error':
      return 'error';
  }
}
