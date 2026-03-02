import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  it('calls handler for matching key combo', () => {
    const handler = vi.fn();
    const keyMap = { 'meta+s': handler };
    const { unmount } = renderHook(() => useKeyboardShortcuts(keyMap));
    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    document.dispatchEvent(event);
    expect(handler).toHaveBeenCalled();
    unmount();
  });

  it('does not trigger when event target is input', () => {
    const handler = vi.fn();
    const keyMap = { r: handler };
    const { unmount } = renderHook(() => useKeyboardShortcuts(keyMap));
    const input = document.createElement('input');
    document.body.appendChild(input);
    const event = new KeyboardEvent('keydown', { key: 'r' });
    input.dispatchEvent(event);
    expect(handler).not.toHaveBeenCalled();
    unmount();
    input.remove();
  });

  it('can be disabled', () => {
    const handler = vi.fn();
    const keyMap = { r: handler };
    const { unmount, rerender } = renderHook(
      ({ enabled }) => useKeyboardShortcuts(keyMap, { enabled }),
      { initialProps: { enabled: true } }
    );
    rerender({ enabled: false });
    const event = new KeyboardEvent('keydown', { key: 'r' });
    document.dispatchEvent(event);
    expect(handler).not.toHaveBeenCalled();
    unmount();
  });
});
