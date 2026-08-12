import { describe, expect, it, vi } from 'vitest';
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
    expect(snapshot?.savedProgressExists).toBe(false);
    expect(snapshot?.savedProgressIsStale).toBe(false);
    expect(snapshot?.savedProgressMetadata).toBeNull();
    expect(snapshot?.sessionMetadata).toBeNull();
    expect(snapshot?.sessionCreationStatus).toBe('idle');
    expect(snapshot?.sessionCreationError).toBeNull();
    expect(snapshot?.submitStatus).toBe('idle');
    expect(snapshot?.submitError).toBeNull();
    expect(snapshot?.currentStepValidationErrors).toEqual([]);
    expect(snapshot?.fieldValidationErrors).toEqual({});
    expect(snapshot?.canContinueCurrentStep).toBe(true);
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

  it('supports saved-progress helper actions including startAgain', () => {
    type FunnelValues = {
      email: string;
      firstName?: string;
    };
    const createSession = vi.fn(async () => ({ id: 'session-2' }));
    const localStorageAdapter = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    const sessionStorageAdapter = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    const memoryStorageAdapter = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    let snapshot:
      | ReturnType<
          typeof useIncrementalFunnel<FunnelValues, 'welcome' | 'details'>
        >
      | undefined;

    function Example(): null {
      const stepRef = useRef(0);
      const funnel = useIncrementalFunnel<FunnelValues, 'welcome' | 'details'>({
        storageKey: 'customer-funnel',
        initialValues: { email: 'hello@example.com' },
        steps: ['welcome', 'details'] as const,
        persistStepState: true,
        createSession,
        storageAdapters: {
          local: localStorageAdapter,
          session: sessionStorageAdapter,
          memory: memoryStorageAdapter
        }
      });

      if (stepRef.current === 0) {
        stepRef.current = 1;
        funnel.updateValues({ firstName: 'Ada' });
        funnel.goToStep('details');
        funnel.markStepComplete('welcome');
        funnel.markSubmitted();
      } else if (stepRef.current === 1) {
        stepRef.current = 2;
        funnel.continueSavedProgress();
        funnel.startAgain();
      }

      snapshot = funnel;
      return null;
    }

    renderToString(createElement(Example));

    expect(snapshot?.values).toEqual({ email: 'hello@example.com' });
    expect(snapshot?.currentStepId).toBe('welcome');
    expect(snapshot?.completedStepIds).toEqual([]);
    expect(snapshot?.isSubmitted).toBe(false);
    expect(snapshot?.savedProgressExists).toBe(false);
    expect(snapshot?.savedProgressIsStale).toBe(false);
    expect(snapshot?.savedProgressMetadata).toBeNull();
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(localStorageAdapter.removeItem).toHaveBeenCalledWith('customer-funnel');
    expect(sessionStorageAdapter.removeItem).toHaveBeenCalledWith('customer-funnel');
    expect(memoryStorageAdapter.removeItem).toHaveBeenCalledWith('customer-funnel');
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

  it('accepts createSession without persisting session data during server render', () => {
    const createSession = vi.fn(async () => ({ id: 'server-only' }));
    let snapshot:
      | ReturnType<typeof useIncrementalFunnel<Record<string, unknown>>>
      | undefined;

    function Example(): null {
      snapshot = useIncrementalFunnel({
        storageKey: 'customer-funnel',
        createSession
      });
      return null;
    }

    const previousWindow = globalThis.window;
    // @ts-expect-error deleting test-only global
    delete globalThis.window;
    renderToString(createElement(Example));

    expect(createSession).not.toHaveBeenCalled();
    expect(snapshot?.sessionMetadata).toBeNull();
    expect(snapshot?.sessionCreationStatus).toBe('idle');
    expect(snapshot?.sessionCreationError).toBeNull();

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

  it('supports step-level validation callbacks', () => {
    type FunnelValues = {
      email?: string;
    };
    const validateStep = vi.fn((stepId: string | null, values: FunnelValues) => {
      if (stepId === 'services' && !values.email) {
        return {
          stepErrors: ['Email is required'],
          fieldErrors: { email: 'Email is required' }
        };
      }
      return undefined;
    });
    let snapshot:
      | ReturnType<
          typeof useIncrementalFunnel<FunnelValues, 'services' | 'availability'>
        >
      | undefined;

    function Example(): null {
      const didUpdateRef = useRef(false);
      const funnel = useIncrementalFunnel<FunnelValues, 'services' | 'availability'>(
        {
          steps: ['services', 'availability'] as const,
          validateStep
        }
      );

      if (!didUpdateRef.current) {
        didUpdateRef.current = true;
        funnel.updateValues({ email: '' });
      }

      snapshot = funnel;
      return null;
    }

    renderToString(createElement(Example));

    expect(validateStep).toHaveBeenCalledWith('services', { email: '' });
    expect(snapshot?.currentStepValidationErrors).toEqual(['Email is required']);
    expect(snapshot?.fieldValidationErrors).toEqual({
      email: 'Email is required'
    });
    expect(snapshot?.canContinueCurrentStep).toBe(false);
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

  it('flushes partial remote updates via updateRemote', async () => {
    type FunnelValues = {
      email?: string;
      firstName?: string;
    };
    const updates: Partial<FunnelValues>[] = [];
    let snapshot:
      | ReturnType<typeof useIncrementalFunnel<FunnelValues>>
      | undefined;

    function Example(): null {
      const didUpdateRef = useRef(false);
      const funnel = useIncrementalFunnel<FunnelValues>({
        updateRemote: async values => {
          updates.push(values);
        }
      });

      if (!didUpdateRef.current) {
        didUpdateRef.current = true;
        funnel.updateValues({ email: 'hello@example.com' });
      }

      snapshot = funnel;
      return null;
    }

    renderToString(createElement(Example));
    await snapshot?.flushRemoteUpdates();

    expect(updates).toEqual([{ email: 'hello@example.com' }]);
  });

  it('supports submit flow success and local-state clearing', async () => {
    type FunnelValues = {
      email?: string;
    };
    const updates: Partial<FunnelValues>[] = [];
    const submitted: Partial<FunnelValues>[] = [];
    const localStorageAdapter = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    const sessionStorageAdapter = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    const memoryStorageAdapter = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    let snapshot:
      | ReturnType<typeof useIncrementalFunnel<FunnelValues>>
      | undefined;

    function Example(): null {
      const didUpdateRef = useRef(false);
      const funnel = useIncrementalFunnel<FunnelValues>({
        storageKey: 'customer-funnel',
        debounceMs: 1_000,
        updateRemote: async values => {
          updates.push(values);
        },
        submitRemote: async values => {
          submitted.push(values);
        },
        storageAdapters: {
          local: localStorageAdapter,
          session: sessionStorageAdapter,
          memory: memoryStorageAdapter
        }
      });

      if (!didUpdateRef.current) {
        didUpdateRef.current = true;
        funnel.updateValues({ email: 'hello@example.com' });
      }

      snapshot = funnel;
      return null;
    }

    renderToString(createElement(Example));
    expect(snapshot?.submitStatus).toBe('idle');
    await expect(snapshot?.submit()).resolves.toBeUndefined();

    expect(updates).toEqual([{ email: 'hello@example.com' }]);
    expect(submitted).toEqual([{ email: 'hello@example.com' }]);
    expect(localStorageAdapter.removeItem).toHaveBeenCalledWith('customer-funnel');
    expect(sessionStorageAdapter.removeItem).toHaveBeenCalledWith('customer-funnel');
    expect(memoryStorageAdapter.removeItem).toHaveBeenCalledWith('customer-funnel');
  });

  it('exposes submit validation errors and blocks automatic remote updates after submit', async () => {
    type FunnelValues = {
      email?: string;
    };
    const updates: Partial<FunnelValues>[] = [];
    const submitError = { fieldErrors: { email: 'Email is required' } };
    let snapshot:
      | ReturnType<typeof useIncrementalFunnel<FunnelValues>>
      | undefined;

    function Example(): null {
      snapshot = useIncrementalFunnel<FunnelValues>({
        initialValues: { email: 'start@example.com' },
        updateRemote: async values => {
          updates.push(values);
        },
        submitRemote: async () => {
          throw submitError;
        }
      });
      return null;
    }

    renderToString(createElement(Example));
    await expect(snapshot?.submit()).rejects.toBe(submitError);

    snapshot?.markSubmitted();
    snapshot?.updateValues({ email: 'next@example.com' });
    await snapshot?.flushRemoteUpdates();

    expect(updates).toEqual([]);
  });

  it('supports all-step validation callback before submit', async () => {
    type FunnelValues = {
      email?: string;
    };
    const validateAll = vi.fn(() => ({
      stepErrors: ['Cannot submit yet'],
      fieldErrors: { email: 'Email is required' }
    }));
    const submitRemote = vi.fn(async () => undefined);
    let snapshot:
      | ReturnType<typeof useIncrementalFunnel<FunnelValues>>
      | undefined;

    function Example(): null {
      snapshot = useIncrementalFunnel<FunnelValues>({
        validateAll,
        submitRemote
      });
      return null;
    }

    renderToString(createElement(Example));
    await expect(snapshot?.submit()).rejects.toEqual({
      stepErrors: ['Cannot submit yet'],
      fieldErrors: { email: 'Email is required' }
    });

    expect(validateAll).toHaveBeenCalledTimes(1);
    expect(submitRemote).not.toHaveBeenCalled();
  });

  it('supports debounced remote updates', async () => {
    type FunnelValues = {
      email?: string;
      firstName?: string;
    };
    vi.useFakeTimers();
    const updates: Partial<FunnelValues>[] = [];

    function Example(): null {
      const didUpdateRef = useRef(false);
      const funnel = useIncrementalFunnel<FunnelValues>({
        updateRemote: async values => {
          updates.push(values);
        },
        debounceMs: 500
      });

      if (!didUpdateRef.current) {
        didUpdateRef.current = true;
        funnel.updateValues({ email: 'hello@example.com' });
        funnel.updateValues({ firstName: 'Ada' });
      }

      return null;
    }

    try {
      renderToString(createElement(Example));

      expect(updates).toEqual([]);

      await vi.advanceTimersByTimeAsync(500);
      await Promise.resolve();

      expect(updates).toEqual([{ email: 'hello@example.com', firstName: 'Ada' }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('supports retrying failed remote updates', async () => {
    type FunnelValues = {
      email?: string;
    };
    let attempt = 0;
    let snapshot:
      | ReturnType<typeof useIncrementalFunnel<FunnelValues>>
      | undefined;

    function Example(): null {
      const didUpdateRef = useRef(false);
      const funnel = useIncrementalFunnel<FunnelValues>({
        updateRemote: async () => {
          attempt += 1;
          if (attempt === 1) {
            throw new Error('transient');
          }
        }
      });

      if (!didUpdateRef.current) {
        didUpdateRef.current = true;
        funnel.updateValues({ email: 'hello@example.com' });
      }

      snapshot = funnel;
      return null;
    }

    renderToString(createElement(Example));
    await snapshot?.flushRemoteUpdates();
    await snapshot?.retryRemoteUpdates();

    expect(attempt).toBe(2);
  });

  it('keeps legacy remoteUpdate payload shape', async () => {
    type FunnelValues = {
      email?: string;
    };
    const updates: Array<{
      values: Partial<FunnelValues>;
      stepState?: {
        currentStepId: 'services' | 'availability' | null;
        completedStepIds: readonly ('services' | 'availability')[];
      };
    }> = [];
    let snapshot:
      | ReturnType<
          typeof useIncrementalFunnel<
            FunnelValues,
            'services' | 'availability'
          >
        >
      | undefined;

    function Example(): null {
      const didUpdateRef = useRef(false);
      const funnel = useIncrementalFunnel<FunnelValues, 'services' | 'availability'>(
        {
          steps: ['services', 'availability'] as const,
          includeStepStateInRemoteUpdate: true,
          debounceMs: 500,
          remoteUpdate: update => {
            updates.push(update);
          }
        }
      );

      if (!didUpdateRef.current) {
        didUpdateRef.current = true;
        funnel.updateValues({ email: 'hello@example.com' });
        funnel.nextStep();
      }

      snapshot = funnel;
      return null;
    }

    renderToString(createElement(Example));
    await snapshot?.flushRemoteUpdates();

    expect(updates).toEqual([
      {
        values: { email: 'hello@example.com' },
        stepState: {
          currentStepId: 'availability',
          completedStepIds: []
        }
      }
    ]);
  });
});
