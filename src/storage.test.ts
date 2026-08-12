import { describe, expect, it } from 'vitest';

import {
  createLocalStorageAdapter,
  createMemoryStorageAdapter,
  createSessionStorageAdapter
} from './storage';

describe('storage adapters', () => {
  it('supports memory adapter read/write/remove', () => {
    const adapter = createMemoryStorageAdapter();

    expect(adapter.getItem('missing')).toBeNull();
    adapter.setItem('key', 'value');
    expect(adapter.getItem('key')).toBe('value');
    adapter.removeItem('key');
    expect(adapter.getItem('key')).toBeNull();
  });

  it('supports custom memory adapter initial state', () => {
    const adapter = createMemoryStorageAdapter({ 'funnel-key': '{"ok":true}' });

    expect(adapter.getItem('funnel-key')).toBe('{"ok":true}');
  });

  it('is SSR-safe when local/session storage are unavailable', () => {
    const local = createLocalStorageAdapter();
    const session = createSessionStorageAdapter();

    expect(local.getItem('key')).toBeNull();
    expect(() => local.setItem('key', 'value')).not.toThrow();
    expect(() => local.removeItem('key')).not.toThrow();

    expect(session.getItem('key')).toBeNull();
    expect(() => session.setItem('key', 'value')).not.toThrow();
    expect(() => session.removeItem('key')).not.toThrow();
  });

  it('handles storage failures gracefully', () => {
    const previousWindow = globalThis.window;
    globalThis.window = {
      localStorage: {
        getItem(): string | null {
          throw new Error('boom');
        },
        setItem(): void {
          throw new Error('boom');
        },
        removeItem(): void {
          throw new Error('boom');
        }
      },
      sessionStorage: {
        getItem(): string | null {
          throw new Error('boom');
        },
        setItem(): void {
          throw new Error('boom');
        },
        removeItem(): void {
          throw new Error('boom');
        }
      }
    } as unknown as Window & typeof globalThis;

    const local = createLocalStorageAdapter();
    const session = createSessionStorageAdapter();

    expect(local.getItem('key')).toBeNull();
    expect(() => local.setItem('key', 'value')).not.toThrow();
    expect(() => local.removeItem('key')).not.toThrow();
    expect(session.getItem('key')).toBeNull();
    expect(() => session.setItem('key', 'value')).not.toThrow();
    expect(() => session.removeItem('key')).not.toThrow();

    if (typeof previousWindow === 'undefined') {
      // @ts-expect-error deleting test-only global
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  });
});
