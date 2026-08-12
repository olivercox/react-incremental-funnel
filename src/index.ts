import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyFieldStateForMode,
  buildFieldStateForMode,
  type FieldPersistencePolicies,
  isRecord,
  normalizeFieldPolicies,
  readPersistedFieldState
} from './persistence';
import {
  createLocalStorageAdapter,
  createMemoryStorageAdapter,
  createSessionStorageAdapter,
  type StorageAdapter
} from './storage';
export type {
  FieldPersistenceMode,
  FieldPersistencePolicies,
  FieldPersistencePolicy
} from './persistence';
export type { StorageAdapter } from './storage';
export {
  createLocalStorageAdapter,
  createMemoryStorageAdapter,
  createSessionStorageAdapter
} from './storage';

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
  fieldPolicies?: FieldPersistencePolicies;
  initialValues?: Partial<TValues>;
  steps?: readonly TStepId[];
  initialStepId?: TStepId;
  persistStepState?: boolean;
  includeStepStateInRemoteUpdate?: boolean;
  storageAdapters?: Partial<Record<'local' | 'session' | 'memory', StorageAdapter>>;
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

interface PersistedStepState<TStepId extends FunnelStepId = FunnelStepId> {
  currentStepId: TStepId | null;
  completedStepIds: readonly TStepId[];
}

interface PersistedLocalEnvelope<TStepId extends FunnelStepId = FunnelStepId> {
  fieldState?: Record<string, unknown>;
  stepState?: PersistedStepState<TStepId>;
  values?: Record<string, unknown>;
}

interface PersistedSessionEnvelope {
  fieldState?: Record<string, unknown>;
  values?: Record<string, unknown>;
}

const defaultLocalStorageAdapter = createLocalStorageAdapter();
const defaultSessionStorageAdapter = createSessionStorageAdapter();
const defaultMemoryStorageAdapter = createMemoryStorageAdapter();

function isPersistedStepState<TStepId extends FunnelStepId>(
  value: unknown
): value is PersistedStepState<TStepId> {
  return (
    isRecord(value) &&
    ('currentStepId' in value ? true : false) &&
    Array.isArray(value.completedStepIds)
  );
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
    fieldPolicies,
    initialValues,
    steps: configuredSteps,
    initialStepId,
    persistStepState = false,
    includeStepStateInRemoteUpdate = false,
    storageAdapters,
    remoteUpdate
  } = options;
  const steps = useMemo(() => [...(configuredSteps ?? [])], [configuredSteps]);
  const stepIds = useMemo(() => new Set(steps), [steps]);
  const normalizedPolicies = useMemo(
    () => normalizeFieldPolicies(fieldPolicies),
    [fieldPolicies]
  );
  const adapters = useMemo(
    () => ({
      local: storageAdapters?.local ?? defaultLocalStorageAdapter,
      session: storageAdapters?.session ?? defaultSessionStorageAdapter,
      memory: storageAdapters?.memory ?? defaultMemoryStorageAdapter
    }),
    [storageAdapters]
  );

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
    if (
      !storageKey ||
      (!persistStepState &&
        Object.values(normalizedPolicies).every(
          policy => policy.persist === 'never' || policy.persist === 'remoteOnly'
        ))
    ) {
      setIsReady(true);
      return;
    }

    try {
      const now = Date.now();
      let didRestoreAnyProgress = false;
      let nextValues = { ...resolvedInitialValues } as Record<string, unknown>;
      let didPruneLocal = false;
      let didPruneSession = false;

      const localEnvelope: PersistedLocalEnvelope<TStepId> = {};
      const storedRaw = adapters.local.getItem(storageKey);
      if (storedRaw) {
        const parsedValues: unknown = JSON.parse(storedRaw);
        if (isRecord(parsedValues)) {
          const storedState = parsedValues as PersistedLocalEnvelope<TStepId>;
          if (isPersistedStepState<TStepId>(storedState.stepState)) {
            localEnvelope.stepState = storedState.stepState;
          }

          const localFieldState = readPersistedFieldState(
            isRecord(storedState.fieldState)
              ? storedState.fieldState
              : isRecord(storedState.values)
                ? storedState.values
                : isRecord(parsedValues)
                  ? parsedValues
                  : {}
          );
          const localApplied = applyFieldStateForMode(
            nextValues,
            normalizedPolicies,
            'local',
            localFieldState,
            now
          );
          nextValues = localApplied.nextValues;
          if (Object.keys(localFieldState).length > 0) {
            didRestoreAnyProgress = true;
          }
          if (localApplied.expiredPaths.length > 0) {
            for (const path of localApplied.expiredPaths) {
              delete localFieldState[path];
            }
            didPruneLocal = true;
          }
          localEnvelope.fieldState = localFieldState;

          if (persistStepState && isPersistedStepState<TStepId>(storedState.stepState)) {
            const stepState = storedState.stepState;
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
              didRestoreAnyProgress = true;
            }
          }
        }
      }

      const sessionRaw = adapters.session.getItem(storageKey);
      if (sessionRaw) {
        const parsedSession: unknown = JSON.parse(sessionRaw);
        if (isRecord(parsedSession)) {
          const sessionEnvelope = parsedSession as PersistedSessionEnvelope;
          const sessionFieldState = readPersistedFieldState(
            isRecord(sessionEnvelope.fieldState)
              ? sessionEnvelope.fieldState
              : isRecord(sessionEnvelope.values)
                ? sessionEnvelope.values
                : parsedSession
          );
          const sessionApplied = applyFieldStateForMode(
            nextValues,
            normalizedPolicies,
            'session',
            sessionFieldState,
            now
          );
          nextValues = sessionApplied.nextValues;
          if (Object.keys(sessionFieldState).length > 0) {
            didRestoreAnyProgress = true;
          }
          if (sessionApplied.expiredPaths.length > 0) {
            for (const path of sessionApplied.expiredPaths) {
              delete sessionFieldState[path];
            }
            didPruneSession = true;
          }

          if (didPruneSession) {
            if (Object.keys(sessionFieldState).length > 0) {
              adapters.session.setItem(
                storageKey,
                JSON.stringify({
                  fieldState: sessionFieldState
                })
              );
            } else {
              adapters.session.removeItem(storageKey);
            }
          }
        }
      }

      const memoryRaw = adapters.memory.getItem(storageKey);
      const memoryFieldState = memoryRaw ? (JSON.parse(memoryRaw) as unknown) : {};
      if (isRecord(memoryFieldState) && Object.keys(memoryFieldState).length > 0) {
        const parsedMemoryFieldState = readPersistedFieldState(memoryFieldState);
        const memoryApplied = applyFieldStateForMode(
          nextValues,
          normalizedPolicies,
          'memory',
          parsedMemoryFieldState,
          now
        );
        nextValues = memoryApplied.nextValues;
        if (Object.keys(parsedMemoryFieldState).length > 0) {
          didRestoreAnyProgress = true;
        }
        if (memoryApplied.expiredPaths.length > 0) {
          for (const path of memoryApplied.expiredPaths) {
            delete parsedMemoryFieldState[path];
          }
          if (Object.keys(parsedMemoryFieldState).length > 0) {
            adapters.memory.setItem(storageKey, JSON.stringify(parsedMemoryFieldState));
          } else {
            adapters.memory.removeItem(storageKey);
          }
        }
      }

      if (didPruneLocal) {
        const hasStepState =
          persistStepState &&
          isRecord(localEnvelope.stepState) &&
          Array.isArray(localEnvelope.stepState.completedStepIds);
        if (
          Object.keys(localEnvelope.fieldState ?? {}).length === 0 &&
          !hasStepState
        ) {
          adapters.local.removeItem(storageKey);
        } else {
          adapters.local.setItem(
            storageKey,
            JSON.stringify({
              ...(Object.keys(localEnvelope.fieldState ?? {}).length > 0
                ? { fieldState: localEnvelope.fieldState }
                : {}),
              ...(hasStepState ? { stepState: localEnvelope.stepState } : {})
            })
          );
        }
      }

      setValues(nextValues as Partial<TValues>);
      if (didRestoreAnyProgress) {
        setHasSavedProgress(true);
      }
    } catch {
      return;
    } finally {
      setIsReady(true);
    }
  }, [
    normalizedPolicies,
    adapters,
    persistStepState,
    resolvedInitialValues,
    stepIds,
    storageKey
  ]);

  useEffect(() => {
    if (!storageKey || !isReady) {
      return;
    }

    try {
      const now = Date.now();
      const localFieldState = buildFieldStateForMode(
        values as Record<string, unknown>,
        normalizedPolicies,
        'local',
        now
      );
      const sessionFieldState = buildFieldStateForMode(
        values as Record<string, unknown>,
        normalizedPolicies,
        'session',
        now
      );
      const memoryFieldState = buildFieldStateForMode(
        values as Record<string, unknown>,
        normalizedPolicies,
        'memory',
        now
      );

      if (Object.keys(memoryFieldState).length > 0) {
        adapters.memory.setItem(storageKey, JSON.stringify(memoryFieldState));
      } else {
        adapters.memory.removeItem(storageKey);
      }

      const shouldPersistStepState =
        persistStepState &&
        (completedStepIds.length > 0 || !Object.is(currentStepId, initialCurrentStepId));
      const localPayload = {
        ...(Object.keys(localFieldState).length > 0
          ? { fieldState: localFieldState }
          : {}),
        ...(shouldPersistStepState
          ? {
              stepState: {
                currentStepId,
                completedStepIds
              }
            }
          : {})
      };

      if (Object.keys(localPayload).length === 0) {
        adapters.local.removeItem(storageKey);
      } else {
        adapters.local.setItem(storageKey, JSON.stringify(localPayload));
      }

      if (Object.keys(sessionFieldState).length === 0) {
        adapters.session.removeItem(storageKey);
      } else {
        adapters.session.setItem(
          storageKey,
          JSON.stringify({
            fieldState: sessionFieldState
          })
        );
      }

      setHasSavedProgress(
        Object.keys(localPayload).length > 0 ||
          Object.keys(sessionFieldState).length > 0 ||
          Object.keys(memoryFieldState).length > 0
      );
    } catch {
      return;
    }
  }, [
    completedStepIds,
    currentStepId,
    adapters,
    initialCurrentStepId,
    isReady,
    normalizedPolicies,
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
