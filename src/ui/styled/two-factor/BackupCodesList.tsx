'use client';
import React, { useState } from 'react';
import { Button } from '@/ui/primitives/button';

export interface BackupCodesListProps {
  codes: string[];
}

export function BackupCodesList({ codes }: BackupCodesListProps): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = (): void => {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {codes.map((c) => (
          <div key={c} className="font-mono text-sm p-2 bg-muted rounded">
            {c}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="outline" size="sm" onClick={download}>
          Download
        </Button>
      </div>
    </div>
  );
}

export default BackupCodesList;
