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
  TValues extends Record<string, unknown>,
  TStepId extends FunnelStepId = FunnelStepId
> {
  storageKey?: string;
  initialValues?: Partial<TValues>;
  steps?: readonly TStepId[];
  initialStepId?: TStepId;
  persistStepState?: boolean;
  includeStepStateInRemoteUpdate?: boolean;
  remoteUpdate?: (
    update: IncrementalFunnelRemoteUpdate<TValues, TStepId>
  ) => void;
}

export interface UseIncrementalFunnelResult<
  TValues extends Record<string, unknown>,
  TStepId extends FunnelStepId = FunnelStepId
> {
  values: Partial<TValues>;
  isReady: boolean;
  isDirty: boolean;
  isSubmitted: boolean;
  hasSavedProgress: boolean;
  currentStepId: TStepId | null;
  completedStepIds: readonly TStepId[];
  canGoNext: boolean;
  canGoBack: boolean;
  updateValues: (nextValues: Partial<TValues>) => void;
  clearValues: () => void;
  markSubmitted: () => void;
  goToStep: (stepId: TStepId) => void;
  nextStep: () => void;
  previousStep: () => void;
  markStepComplete: (stepId: TStepId) => void;
  markStepIncomplete: (stepId: TStepId) => void;
}

export interface IncrementalFunnelRemoteUpdate<
  TValues extends Record<string, unknown>,
  TStepId extends FunnelStepId = FunnelStepId
> {
  values: Partial<TValues>;
  stepState?: {
    currentStepId: TStepId | null;
    completedStepIds: readonly TStepId[];
  };
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

export function useIncrementalFunnel<
  TValues extends Record<string, unknown>,
  TStepId extends FunnelStepId = FunnelStepId
>(
  options: UseIncrementalFunnelOptions<TValues, TStepId>
): UseIncrementalFunnelResult<TValues, TStepId> {
  const {
    storageKey,
    initialValues,
    steps: configuredSteps,
    initialStepId,
    persistStepState = false,
    includeStepStateInRemoteUpdate = false,
    remoteUpdate
  } = options;
  const steps = useMemo(() => [...(configuredSteps ?? [])], [configuredSteps]);
  const stepIds = useMemo(() => new Set(steps), [steps]);

  if (stepIds.size !== steps.length) {
    throw new Error('Funnel steps must have unique ids.');
  }

  if (typeof initialStepId !== 'undefined' && !stepIds.has(initialStepId)) {
    throw new Error('Initial step id must exist in steps.');
  }

  const initialCurrentStepId = useMemo(() => {
    if (steps.length === 0) {
      return null;
    }
    return (initialStepId ?? steps[0]) as TStepId;
  }, [initialStepId, steps]);
  const resolvedInitialValues = useMemo(
    () => ({ ...(initialValues ?? {}) }) as Partial<TValues>,
    [initialValues]
  );
  const [values, setValues] =
    useState<Partial<TValues>>(resolvedInitialValues);
  const [currentStepId, setCurrentStepId] = useState<TStepId | null>(
    initialCurrentStepId
  );
  const [completedStepIds, setCompletedStepIds] = useState<TStepId[]>([]);
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
    setCurrentStepId(initialCurrentStepId);
    setCompletedStepIds(previous =>
      previous.filter(stepId => stepIds.has(stepId))
    );
  }, [initialCurrentStepId, stepIds]);

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
      if (!isRecord(parsedValues)) {
        return;
      }

      const storedState = parsedValues as Record<string, unknown>;
      const hasStructuredState =
        isRecord(storedState.values) && isRecord(storedState.stepState);

      if (hasStructuredState) {
        setValues(previousValues => ({
          ...previousValues,
          ...((storedState.values as Partial<TValues>) ?? {})
        }) as Partial<TValues>);
        if (persistStepState) {
          const stepState = storedState.stepState as Record<string, unknown>;
          const parsedCurrentStepId = stepState.currentStepId;
          const parsedCompletedStepIds = stepState.completedStepIds;

          if (
            (parsedCurrentStepId === null ||
              (typeof parsedCurrentStepId === 'string' &&
                stepIds.has(parsedCurrentStepId as TStepId))) &&
            Array.isArray(parsedCompletedStepIds)
          ) {
            setCurrentStepId(parsedCurrentStepId as TStepId | null);
            setCompletedStepIds(
              parsedCompletedStepIds.filter(
                stepId =>
                  typeof stepId === 'string' &&
                  stepIds.has(stepId as TStepId)
              ) as TStepId[]
            );
          }
        }
        setHasSavedProgress(true);
        return;
      }

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
  }, [persistStepState, stepIds, storageKey]);

  useEffect(() => {
    if (!storageKey || !isReady || !canUseStorage()) {
      return;
    }

    try {
      if (
        Object.keys(values).length === 0 &&
        (!persistStepState ||
          (completedStepIds.length === 0 &&
            Object.is(currentStepId, initialCurrentStepId)))
      ) {
        window.localStorage.removeItem(storageKey);
        setHasSavedProgress(false);
        return;
      }

      const payload = persistStepState
        ? {
            values,
            stepState: {
              currentStepId,
              completedStepIds
            }
          }
        : values;

      window.localStorage.setItem(storageKey, JSON.stringify(payload));
      setHasSavedProgress(true);
    } catch {
      return;
    }
  }, [
    completedStepIds,
    currentStepId,
    initialCurrentStepId,
    isReady,
    persistStepState,
    storageKey,
    values
  ]);

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

  const goToStep = useCallback(
    (stepId: TStepId) => {
      if (!stepIds.has(stepId)) {
        throw new Error('Step id must exist in steps.');
      }
      setCurrentStepId(stepId);
    },
    [stepIds]
  );

  const nextStep = useCallback(() => {
    setCurrentStepId(previousStepId => {
      if (previousStepId === null) {
        return previousStepId;
      }

      const previousIndex = steps.findIndex(stepId => stepId === previousStepId);
      if (previousIndex < 0 || previousIndex >= steps.length - 1) {
        return previousStepId;
      }

      return steps[previousIndex + 1] as TStepId;
    });
  }, [steps]);

  const previousStep = useCallback(() => {
    setCurrentStepId(previousStepId => {
      if (previousStepId === null) {
        return previousStepId;
      }

      const previousIndex = steps.findIndex(stepId => stepId === previousStepId);
      if (previousIndex <= 0) {
        return previousStepId;
      }

      return steps[previousIndex - 1] as TStepId;
    });
  }, [steps]);

  const markStepComplete = useCallback(
    (stepId: TStepId) => {
      if (!stepIds.has(stepId)) {
        throw new Error('Step id must exist in steps.');
      }
      setCompletedStepIds(previous =>
        previous.includes(stepId) ? previous : [...previous, stepId]
      );
    },
    [stepIds]
  );

  const markStepIncomplete = useCallback(
    (stepId: TStepId) => {
      if (!stepIds.has(stepId)) {
        throw new Error('Step id must exist in steps.');
      }
      setCompletedStepIds(previous => previous.filter(id => id !== stepId));
    },
    [stepIds]
  );

  const isDirty = useMemo(
    () =>
      !areShallowEqualObjects(
        resolvedInitialValues as Record<string, unknown>,
        values as Record<string, unknown>
      ),
    [resolvedInitialValues, values]
  );

  const currentStepIndex = useMemo(
    () => steps.findIndex(stepId => stepId === currentStepId),
    [currentStepId, steps]
  );

  const canGoNext = currentStepIndex >= 0 && currentStepIndex < steps.length - 1;
  const canGoBack = currentStepIndex > 0;

  useEffect(() => {
    if (!remoteUpdate) {
      return;
    }

    remoteUpdate({
      values,
      ...(includeStepStateInRemoteUpdate
        ? {
            stepState: {
              currentStepId,
              completedStepIds
            }
          }
        : {})
    });
  }, [
    completedStepIds,
    currentStepId,
    includeStepStateInRemoteUpdate,
    remoteUpdate,
    values
  ]);

  return {
    values,
    isReady,
    isDirty,
    isSubmitted,
    hasSavedProgress,
    currentStepId,
    completedStepIds,
    canGoNext,
    canGoBack,
    updateValues,
    clearValues,
    markSubmitted,
    goToStep,
    nextStep,
    previousStep,
    markStepComplete,
    markStepIncomplete
  };
}
