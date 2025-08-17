'use client';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/primitives/dialog';
import { Button } from '@/ui/primitives/button';

export interface ShortcutInfo {
  keys: string[];
  description: string;
}

interface Props {
  shortcuts: ShortcutInfo[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ shortcuts, open: controlledOpen, onOpenChange }: Props): JSX.Element {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  return (
    <>
      <Button onClick={() => setOpen(true)} className="sr-only" aria-label="Show keyboard shortcuts" />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2">
            {shortcuts.map(s => (
              <li key={s.description} className="flex justify-between">
                <span>{s.description}</span>
                <span className="font-mono">{s.keys.join(' + ')}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
