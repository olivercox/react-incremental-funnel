import { describe, expect, it } from 'vitest';
import { createElement, useRef } from 'react';
// @ts-expect-error repository does not currently include @types/react-dom
import { renderToString } from 'react-dom/server';

import {
  advanceFunnel,
  createFunnel,
  type FunnelStep,
  useIncrementalFunnel
} from './index';

describe('createFunnel', () => {
  const steps: FunnelStep<'welcome' | 'details' | 'confirm'>[] = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'details', label: 'Details' },
    { id: 'confirm', label: 'Confirm' }
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
        { id: 'welcome', label: 'Welcome again' }
      ])
    ).toThrowError('Funnel steps must have unique ids.');
  });
});

describe('advanceFunnel', () => {
  it('advances to the requested step', () => {
    const steps: FunnelStep<'welcome' | 'details'>[] = [
      { id: 'welcome', label: 'Welcome' },
      { id: 'details', label: 'Details' }
    ];

    const initial = createFunnel(steps);
    const advanced = advanceFunnel(initial, 'details');

    expect(advanced.currentStepId).toBe('details');
  });
});

describe('useIncrementalFunnel', () => {
  it('exposes initial values and lifecycle state', () => {
    type FunnelValues = {
      email: string;
    };
    let snapshot:
      | ReturnType<typeof useIncrementalFunnel<FunnelValues>>
      | undefined;

    function Example(): null {
      snapshot = useIncrementalFunnel<FunnelValues>({
        initialValues: { email: 'hello@example.com' }
      });
      return null;
    }

    renderToString(createElement(Example));

    expect(snapshot).toBeDefined();
    expect(snapshot?.values).toEqual({ email: 'hello@example.com' });
    expect(snapshot?.isReady).toBe(true);
    expect(snapshot?.isDirty).toBe(false);
    expect(snapshot?.isSubmitted).toBe(false);
    expect(snapshot?.hasSavedProgress).toBe(false);
  });

  it('updates partial values', () => {
    type FunnelValues = {
      email: string;
      firstName: string;
    };
    let snapshot:
      | ReturnType<typeof useIncrementalFunnel<FunnelValues>>
      | undefined;

    function Example(): null {
      const didUpdateRef = useRef(false);
      const funnel = useIncrementalFunnel<FunnelValues>({
        initialValues: { email: 'hello@example.com' }
      });

      if (!didUpdateRef.current) {
        didUpdateRef.current = true;
        funnel.updateValues({ firstName: 'Ada' });
      }

      snapshot = funnel;
      return null;
    }

    renderToString(createElement(Example));

    expect(snapshot?.values).toEqual({
      email: 'hello@example.com',
      firstName: 'Ada'
    });
    expect(snapshot?.isDirty).toBe(true);
    expect(snapshot?.isSubmitted).toBe(false);
  });

  it('clears values and resets dirty/submitted state', () => {
    type FunnelValues = {
      email: string;
      firstName: string;
    };
    let snapshot:
      | ReturnType<typeof useIncrementalFunnel<FunnelValues>>
      | undefined;

    function Example(): null {
      const stepRef = useRef(0);
      const funnel = useIncrementalFunnel<FunnelValues>({
        initialValues: { email: 'hello@example.com' }
      });

      if (stepRef.current === 0) {
        stepRef.current = 1;
        funnel.updateValues({ firstName: 'Ada' });
        funnel.markSubmitted();
      } else if (stepRef.current === 1) {
        stepRef.current = 2;
        funnel.clearValues();
      }

      snapshot = funnel;
      return null;
    }

    renderToString(createElement(Example));

    expect(snapshot?.values).toEqual({ email: 'hello@example.com' });
    expect(snapshot?.isDirty).toBe(false);
    expect(snapshot?.isSubmitted).toBe(false);
  });

  it('is safe for server rendering when storage key is set', () => {
    type FunnelValues = {
      email: string;
    };

    function Example(): null {
      useIncrementalFunnel<FunnelValues>({
        storageKey: 'customer-funnel',
        initialValues: { email: 'hello@example.com' }
      });
      return null;
    }

    const previousWindow = globalThis.window;
    // @ts-expect-error deleting test-only global
    delete globalThis.window;

    expect(() => renderToString(createElement(Example))).not.toThrow();

    if (typeof previousWindow !== 'undefined') {
      globalThis.window = previousWindow;
    }
  });

  it('supports configured step navigation and completion state', () => {
    let snapshot:
      | ReturnType<
          typeof useIncrementalFunnel<
            Record<string, unknown>,
            'services' | 'availability' | 'contact' | 'submit'
          >
        >
      | undefined;

    function Example(): null {
      const didUpdateRef = useRef(false);
      const funnel = useIncrementalFunnel({
        steps: ['services', 'availability', 'contact', 'submit'] as const
      });

      if (!didUpdateRef.current) {
        didUpdateRef.current = true;
        funnel.nextStep();
        funnel.markStepComplete('services');
      }

      snapshot = funnel;
      return null;
    }

    renderToString(createElement(Example));

    expect(snapshot?.currentStepId).toBe('availability');
    expect(snapshot?.completedStepIds).toEqual(['services']);
    expect(snapshot?.canGoBack).toBe(true);
    expect(snapshot?.canGoNext).toBe(true);
  });

  it('can move to previous and specific steps', () => {
    let snapshot:
      | ReturnType<
          typeof useIncrementalFunnel<
            Record<string, unknown>,
            'services' | 'availability' | 'contact'
          >
        >
      | undefined;

    function Example(): null {
      const didUpdateRef = useRef(false);
      const funnel = useIncrementalFunnel({
        steps: ['services', 'availability', 'contact'] as const
      });

      if (!didUpdateRef.current) {
        didUpdateRef.current = true;
        funnel.goToStep('contact');
        funnel.previousStep();
      }

      snapshot = funnel;
      return null;
    }

    renderToString(createElement(Example));

    expect(snapshot?.currentStepId).toBe('availability');
    expect(snapshot?.canGoBack).toBe(true);
    expect(snapshot?.canGoNext).toBe(true);
  });

  it('marks steps incomplete', () => {
    let snapshot:
      | ReturnType<
          typeof useIncrementalFunnel<
            Record<string, unknown>,
            'services' | 'availability'
          >
        >
      | undefined;

    function Example(): null {
      const didUpdateRef = useRef(false);
      const funnel = useIncrementalFunnel({
        steps: ['services', 'availability'] as const
      });

      if (!didUpdateRef.current) {
        didUpdateRef.current = true;
        funnel.markStepComplete('services');
        funnel.markStepIncomplete('services');
      }

      snapshot = funnel;
      return null;
    }

    renderToString(createElement(Example));

    expect(snapshot?.completedStepIds).toEqual([]);
  });

  it('throws when navigating to an unknown step', () => {
    function Example(): null {
      const funnel = useIncrementalFunnel({
        steps: ['services', 'availability'] as const
      });
      funnel.goToStep('missing' as never);
      return null;
    }

    expect(() => renderToString(createElement(Example))).toThrowError(
      'Step id must exist in steps.'
    );
  });
});
