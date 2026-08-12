import { describe, expect, it } from 'vitest';

import {
  pickPersistableValues,
  redactValues,
  removeBlockedFields
} from './value-utils';
import {
  pickPersistableValues as pickPersistableValuesFromPackage,
  redactValues as redactValuesFromPackage,
  removeBlockedFields as removeBlockedFieldsFromPackage
} from './index';

describe('value utilities', () => {
  it('picks configured persistable fields including nested paths', () => {
    const values = {
      funnelVariant: 'A',
      customer: {
        email: 'hello@example.com',
        address: 'Secret Street'
      },
      analytics: {
        utmCampaign: 'spring'
      }
    };

    const picked = pickPersistableValues(values, [
      'funnelVariant',
      'customer.email',
      'missing.path'
    ]);

    expect(picked).toEqual({
      funnelVariant: 'A',
      customer: {
        email: 'hello@example.com'
      }
    });
    expect(values).toEqual({
      funnelVariant: 'A',
      customer: {
        email: 'hello@example.com',
        address: 'Secret Street'
      },
      analytics: {
        utmCampaign: 'spring'
      }
    });
  });

  it('removes blocked fields including nested paths without mutation', () => {
    const values = {
      funnelVariant: 'A',
      customer: {
        email: 'hello@example.com',
        address: 'Secret Street'
      },
      dementiaQuestionnaire: 'sensitive'
    };

    const filtered = removeBlockedFields(values, [
      'customer.address',
      'dementiaQuestionnaire'
    ]);

    expect(filtered).toEqual({
      funnelVariant: 'A',
      customer: {
        email: 'hello@example.com'
      }
    });
    expect(filtered).not.toBe(values);
    expect(filtered.customer).not.toBe(values.customer);
    expect(values).toEqual({
      funnelVariant: 'A',
      customer: {
        email: 'hello@example.com',
        address: 'Secret Street'
      },
      dementiaQuestionnaire: 'sensitive'
    });
  });

  it('redacts sensitive fields including nested paths without mutation', () => {
    const values = {
      customer: {
        email: 'hello@example.com',
        address: 'Secret Street'
      },
      dementiaQuestionnaire: 'sensitive'
    };

    const redacted = redactValues(values, [
      'customer.email',
      'dementiaQuestionnaire'
    ]);

    expect(redacted).toEqual({
      customer: {
        email: '[REDACTED]',
        address: 'Secret Street'
      },
      dementiaQuestionnaire: '[REDACTED]'
    });
    expect(values).toEqual({
      customer: {
        email: 'hello@example.com',
        address: 'Secret Street'
      },
      dementiaQuestionnaire: 'sensitive'
    });
  });

  it('ignores unsafe path segments to prevent prototype pollution', () => {
    const values = {
      safe: 'ok'
    };

    const filtered = removeBlockedFields(values, ['__proto__.polluted']);
    const redacted = redactValues(values, ['constructor.prototype.polluted']);
    const picked = pickPersistableValues(values, ['__proto__.polluted', 'safe']);

    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
    expect(filtered).toEqual({ safe: 'ok' });
    expect(redacted).toEqual({ safe: 'ok' });
    expect(picked).toEqual({ safe: 'ok' });
  });

  it('is exported from the package entrypoint', () => {
    expect(pickPersistableValuesFromPackage).toBe(pickPersistableValues);
    expect(removeBlockedFieldsFromPackage).toBe(removeBlockedFields);
    expect(redactValuesFromPackage).toBe(redactValues);
  });
});
