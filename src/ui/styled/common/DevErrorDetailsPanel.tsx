'use client';

import React from 'react';
import { ErrorEntry } from '@/lib/state/errorStore';

interface DevErrorDetailsPanelProps {
  error: ErrorEntry;
}

export function DevErrorDetailsPanel({ error }: DevErrorDetailsPanelProps): React.ReactElement | null {
  if (!error?.details && !error?.message) {
    return null;
  }

  const stack = (error as unknown as { stack?: string }).stack;
  const lines = stack ? stack.split('\n').slice(1, 5) : [];

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-muted p-4 rounded shadow max-w-lg w-full text-xs overflow-auto" data-testid="dev-error-panel">
      <div className="font-semibold mb-2">Error Details</div>
      {stack && (
        <pre data-testid="stack-trace" className="whitespace-pre-wrap mb-2">{stack}</pre>
      )}
      {lines.map((l, i) => {
        const match = l.match(/\(([^:]+):(\d+):(\d+)\)/);
        if (!match) return <div key={i}>{l}</div>;
        const [, file, row, col] = match;
        const link = `vscode://file/${file}:${row}:${col}`;
        return (
          <div key={i}>
            <a href={link} className="underline">{file}:{row}</a>
          </div>
        );
      })}
    </div>
  );
}

export default DevErrorDetailsPanel;
