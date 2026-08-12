import { describe, expect, it } from 'vitest';

import { advanceFunnel, createFunnel, type FunnelStep } from './index';

describe('createFunnel', () => {
  const steps: FunnelStep<'welcome' | 'details' | 'confirm'>[] = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'details', label: 'Details' },
    { id: 'confirm', label: 'Confirm' },
  ];

  it('creates a funnel with the first step by default', () => {
    const funnel = createFunnel(steps);

    expect(funnel.currentStepId).toBe('welcome');
    expect(funnel.steps).toEqual(steps);
  });

  it('creates a funnel with a specific initial step', () => {
    const funnel = createFunnel(steps, 'details');

    expect(funnel.currentStepId).toBe('details');
  });

  it('throws for duplicate step ids', () => {
    expect(() =>
      createFunnel([
        { id: 'welcome', label: 'Welcome' },
        { id: 'welcome', label: 'Welcome again' },
      ]),
    ).toThrowError('Funnel steps must have unique ids.');
  });
});

describe('advanceFunnel', () => {
  it('advances to the requested step', () => {
    const steps: FunnelStep<'welcome' | 'details'>[] = [
      { id: 'welcome', label: 'Welcome' },
      { id: 'details', label: 'Details' },
    ];

    const initial = createFunnel(steps);
    const advanced = advanceFunnel(initial, 'details');

    expect(advanced.currentStepId).toBe('details');
  });
});
