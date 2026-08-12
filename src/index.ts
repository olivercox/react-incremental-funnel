import { useCallback, useEffect, useMemo, useState } from 'react';

export type FunnelStepId = string;

export interface FunnelStep<TStepId extends FunnelStepId = FunnelStepId> {
  id: TStepId;
  label: string;
}

export interface FunnelState<TStepId extends FunnelStepId = FunnelStepId> {
  steps: readonly FunnelStep<TStepId>[];
  currentStepId: TStepId;
}

export function createFunnel<TStepId extends FunnelStepId>(
  steps: readonly FunnelStep<TStepId>[],
  initialStepId?: TStepId
): FunnelState<TStepId> {
  if (steps.length === 0) {
    throw new Error('Funnel requires at least one step.');
  }

  const uniqueIds = new Set(steps.map(step => step.id));
  if (uniqueIds.size !== steps.length) {
    throw new Error('Funnel steps must have unique ids.');
  }

  const firstStep = steps[0];
  const resolvedInitial = initialStepId ?? firstStep.id;

  if (!steps.some(step => step.id === resolvedInitial)) {
    throw new Error('Initial step id must exist in steps.');
  }

  return {
    steps,
    currentStepId: resolvedInitial
  };
}

export function advanceFunnel<TStepId extends FunnelStepId>(
  state: FunnelState<TStepId>,
  nextStepId: TStepId
): FunnelState<TStepId> {
  if (!state.steps.some(step => step.id === nextStepId)) {
    throw new Error('Next step id must exist in steps.');
  }

  return {
    ...state,
    currentStepId: nextStepId
  };
}

export interface UseIncrementalFunnelOptions<
  TValues extends Record<string, unknown>
> {
  storageKey?: string;
  initialValues?: Partial<TValues>;
}

export interface UseIncrementalFunnelResult<
  TValues extends Record<string, unknown>
> {
  values: Partial<TValues>;
  isReady: boolean;
  isDirty: boolean;
  isSubmitted: boolean;
  hasSavedProgress: boolean;
  updateValues: (nextValues: Partial<TValues>) => void;
  clearValues: () => void;
  markSubmitted: () => void;
}

function canUseStorage(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function areShallowEqualObjects(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(key => Object.is(left[key], right[key]));
}

export function useIncrementalFunnel<TValues extends Record<string, unknown>>(
  options: UseIncrementalFunnelOptions<TValues>
): UseIncrementalFunnelResult<TValues> {
  const { storageKey, initialValues } = options;
  const resolvedInitialValues = useMemo(
    () => ({ ...(initialValues ?? {}) }) as Partial<TValues>,
    [initialValues]
  );
  const [values, setValues] =
    useState<Partial<TValues>>(resolvedInitialValues);
  const [isReady, setIsReady] = useState(
    () => !storageKey || typeof window === 'undefined'
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);

  useEffect(() => {
    setValues(resolvedInitialValues);
    setIsSubmitted(false);
  }, [resolvedInitialValues]);

  useEffect(() => {
    if (!storageKey || !canUseStorage()) {
      setIsReady(true);
      return;
    }

    try {
      const storedRaw = window.localStorage.getItem(storageKey);
      if (!storedRaw) {
        return;
      }

      const parsedValues: unknown = JSON.parse(storedRaw);
      if (isRecord(parsedValues)) {
        setValues(previousValues => ({
          ...previousValues,
          ...(parsedValues as Partial<TValues>)
        }) as Partial<TValues>);
        setHasSavedProgress(true);
      }
    } catch {
      return;
    } finally {
      setIsReady(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !isReady || !canUseStorage()) {
      return;
    }

    try {
      if (Object.keys(values).length === 0) {
        window.localStorage.removeItem(storageKey);
        setHasSavedProgress(false);
        return;
      }

      window.localStorage.setItem(storageKey, JSON.stringify(values));
      setHasSavedProgress(true);
    } catch {
      return;
    }
  }, [isReady, storageKey, values]);

  const updateValues = useCallback((nextValues: Partial<TValues>) => {
    setValues(
      previousValues => ({ ...previousValues, ...nextValues }) as Partial<TValues>
    );
    setIsSubmitted(false);
  }, []);

  const clearValues = useCallback(() => {
    setValues(resolvedInitialValues);
    setIsSubmitted(false);
  }, [resolvedInitialValues]);

  const markSubmitted = useCallback(() => {
    setIsSubmitted(true);
  }, []);

  const isDirty = useMemo(
    () =>
      !areShallowEqualObjects(
        resolvedInitialValues as Record<string, unknown>,
        values as Record<string, unknown>
      ),
    [resolvedInitialValues, values]
  );

  return {
    values,
    isReady,
    isDirty,
    isSubmitted,
    hasSavedProgress,
    updateValues,
    clearValues,
    markSubmitted
  };
}
