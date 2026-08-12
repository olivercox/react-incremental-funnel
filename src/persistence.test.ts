import { describe, expect, it } from 'vitest';

import {
  applyFieldStateForMode,
  buildFieldStateForMode,
  normalizeFieldPolicies
} from './persistence';

describe('field persistence policies', () => {
  it('only persists explicitly configured local/session/memory fields', () => {
    const values = {
      funnelVariant: 'A',
      services: ['consultation'],
      customer: {
        email: 'hello@example.com',
        address: 'Secret Street'
      },
      dementiaQuestionnaire: 'sensitive'
    };

    const policies = normalizeFieldPolicies({
      funnelVariant: { persist: 'local' },
      services: { persist: 'local' },
      'customer.email': { persist: 'session' },
      'customer.address': { persist: 'never' },
      dementiaQuestionnaire: { persist: 'remoteOnly' }
    });

    const localState = buildFieldStateForMode(values, policies, 'local', 1000);
    const sessionState = buildFieldStateForMode(values, policies, 'session', 1000);
    const memoryState = buildFieldStateForMode(values, policies, 'memory', 1000);

    expect(Object.keys(localState)).toEqual(['funnelVariant', 'services']);
    expect(Object.keys(sessionState)).toEqual(['customer.email']);
    expect(Object.keys(memoryState)).toEqual([]);
  });

  it('supports nested field paths and TTL expiry', () => {
    const policies = normalizeFieldPolicies({
      'customer.email': { persist: 'session', ttlMs: 50 }
    });

    const persisted = buildFieldStateForMode(
      { customer: { email: 'hello@example.com' } },
      policies,
      'session',
      1000
    );

    const active = applyFieldStateForMode({}, policies, 'session', persisted, 1049);
    const expired = applyFieldStateForMode({}, policies, 'session', persisted, 1050);

    expect(active.expiredPaths).toEqual([]);
    expect(active.nextValues).toEqual({
      customer: { email: 'hello@example.com' }
    });
    expect(expired.expiredPaths).toEqual(['customer.email']);
    expect(expired.nextValues).toEqual({});
  });
});
