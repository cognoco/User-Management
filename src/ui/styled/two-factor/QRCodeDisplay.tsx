'use client';
import React from 'react';
import Image from 'next/image';
import { Button } from '@/ui/primitives/button';

export interface QRCodeDisplayProps {
  qrCode?: string;
  secret?: string;
  onCopySecret?: () => void;
}

export function QRCodeDisplay({ qrCode, secret, onCopySecret }: QRCodeDisplayProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-2">
      {qrCode && <Image src={qrCode} alt="QR Code for two-factor authentication setup" width={160} height={160} className="w-40 h-40" />}
      {secret && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Secret Key</p>
          <code className="px-2 py-1 bg-muted rounded text-sm">{secret}</code>
          <div>
            <Button variant="link" size="sm" onClick={onCopySecret}>
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QRCodeDisplay;
