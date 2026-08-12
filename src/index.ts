import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  debounceMs?: number;
  storageAdapters?: Partial<Record<'local' | 'session' | 'memory', StorageAdapter>>;
  createSession?: () => Promise<unknown>;
  updateRemote?: (values: Partial<TValues>) => void | Promise<void>;
  submitRemote?: (values: Partial<TValues>) => void | Promise<void>;
  validateStep?: (
    stepId: TStepId | null,
    values: Partial<TValues>
  ) =>
    | IncrementalFunnelValidationResult
    | void
    | Promise<IncrementalFunnelValidationResult | void>;
  validateAll?: (
    values: Partial<TValues>
  ) =>
    | IncrementalFunnelValidationResult
    | void
    | Promise<IncrementalFunnelValidationResult | void>;
  remoteUpdate?: (
    update: IncrementalFunnelRemoteUpdate<TValues, TStepId>
  ) => void | Promise<void>;
}

export type RemoteSyncStatus =
  | 'idle'
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed';

export type SessionCreationStatus = 'idle' | 'creating' | 'created' | 'failed';
export type SubmitStatus = 'idle' | 'submitting' | 'submitted' | 'failed';

export interface UseIncrementalFunnelResult<
  TValues extends Record<string, unknown>,
  TStepId extends FunnelStepId = FunnelStepId
> {
  values: Partial<TValues>;
  isReady: boolean;
  isDirty: boolean;
  isSubmitted: boolean;
  hasSavedProgress: boolean;
  savedProgressExists: boolean;
  savedProgressIsStale: boolean;
  savedProgressMetadata: SavedProgressMetadata<TStepId> | null;
  remoteSyncStatus: RemoteSyncStatus;
  lastSuccessfulRemoteSyncAt: number | null;
  sessionMetadata: unknown;
  sessionCreationStatus: SessionCreationStatus;
  sessionCreationError: unknown;
  submitStatus: SubmitStatus;
  submitError: unknown;
  currentStepValidationErrors: readonly unknown[];
  fieldValidationErrors: Readonly<Record<string, unknown>>;
  canContinueCurrentStep: boolean;
  currentStepId: TStepId | null;
  completedStepIds: readonly TStepId[];
  canGoNext: boolean;
  canGoBack: boolean;
  updateValues: (nextValues: Partial<TValues>) => void;
  clearValues: () => void;
  continueSavedProgress: () => void;
  clearSavedProgress: () => void;
  startAgain: () => void;
  markSubmitted: () => void;
  goToStep: (stepId: TStepId) => void;
  nextStep: () => void;
  previousStep: () => void;
  markStepComplete: (stepId: TStepId) => void;
  markStepIncomplete: (stepId: TStepId) => void;
  submit: () => Promise<void>;
  flushRemoteUpdates: () => Promise<void>;
  retryRemoteUpdates: () => Promise<void>;
}

export interface SavedProgressMetadata<
  TStepId extends FunnelStepId = FunnelStepId
> {
  lastUpdatedAt: number | null;
  currentStepId: TStepId | null;
  completedStepIds: readonly TStepId[];
  sources: readonly ('local' | 'session' | 'memory')[];
  staleEntriesPruned: number;
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

export interface IncrementalFunnelValidationResult {
  stepErrors?: readonly unknown[];
  fieldErrors?: Readonly<Record<string, unknown>>;
}

interface PersistedStepState<TStepId extends FunnelStepId = FunnelStepId> {
  currentStepId: TStepId | null;
  completedStepIds: readonly TStepId[];
}

interface PersistedLocalEnvelope<TStepId extends FunnelStepId = FunnelStepId> {
  fieldState?: Record<string, unknown>;
  stepState?: PersistedStepState<TStepId>;
  metadata?: PersistedSavedProgressMetadata<TStepId>;
  values?: Record<string, unknown>;
}

interface PersistedSessionEnvelope {
  fieldState?: Record<string, unknown>;
  metadata?: PersistedSavedProgressMetadata;
  values?: Record<string, unknown>;
}

interface PersistedSavedProgressMetadata<
  TStepId extends FunnelStepId = FunnelStepId
> {
  lastUpdatedAt?: number;
  currentStepId?: TStepId | null;
  completedStepIds?: readonly TStepId[];
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

interface ValidationState {
  stepErrors: readonly unknown[];
  fieldErrors: Readonly<Record<string, unknown>>;
}

function createEmptyValidationState(): ValidationState {
  return {
    stepErrors: [],
    fieldErrors: {}
  };
}

function hasValidationErrors(validationState: ValidationState): boolean {
  return (
    validationState.stepErrors.length > 0 ||
    Object.keys(validationState.fieldErrors).length > 0
  );
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

function toValidationState(value: unknown): ValidationState {
  if (typeof value === 'undefined' || value === null) {
    return createEmptyValidationState();
  }

  if (value instanceof Error) {
    return {
      stepErrors: [value.message],
      fieldErrors: {}
    };
  }

  if (Array.isArray(value)) {
    return {
      stepErrors: [...value],
      fieldErrors: {}
    };
  }

  if (isRecord(value)) {
    return {
      stepErrors: Array.isArray(value.stepErrors) ? [...value.stepErrors] : [],
      fieldErrors: isRecord(value.fieldErrors) ? { ...value.fieldErrors } : {}
    };
  }

  return {
    stepErrors: [value],
    fieldErrors: {}
  };
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
    debounceMs = 0,
    storageAdapters,
    createSession,
    updateRemote,
    submitRemote,
    validateStep,
    validateAll,
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
  const [savedProgressIsStale, setSavedProgressIsStale] = useState(false);
  const [savedProgressMetadata, setSavedProgressMetadata] =
    useState<SavedProgressMetadata<TStepId> | null>(null);
  const [remoteSyncStatus, setRemoteSyncStatus] =
    useState<RemoteSyncStatus>('idle');
  const [lastSuccessfulRemoteSyncAt, setLastSuccessfulRemoteSyncAt] =
    useState<number | null>(null);
  const [sessionMetadata, setSessionMetadata] = useState<unknown>(null);
  const [sessionCreationStatus, setSessionCreationStatus] =
    useState<SessionCreationStatus>('idle');
  const [sessionCreationError, setSessionCreationError] = useState<unknown>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [stepValidationState, setStepValidationState] = useState<ValidationState>(
    () => createEmptyValidationState()
  );
  const [allValidationState, setAllValidationState] = useState<ValidationState>(
    () => createEmptyValidationState()
  );
  const didStartSessionCreationRef = useRef(false);
  const sessionCreationRequestIdRef = useRef(0);
  const stepValidationRequestIdRef = useRef(0);
  const pendingRemoteValuesRef = useRef<Partial<TValues>>({});
  const pendingRemoteStepStateRef = useRef<PersistedStepState<TStepId> | null>(
    null
  );
  const remoteSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteSyncInFlightRef = useRef<Promise<void> | null>(null);
  const currentStepIdRef = useRef<TStepId | null>(initialCurrentStepId);
  const completedStepIdsRef = useRef<TStepId[]>([]);
  const isSubmittedRef = useRef(false);
  const resolvedRemoteUpdate = updateRemote ?? remoteUpdate;

  const runStepValidation = useCallback(
    (stepId: TStepId | null, nextValues: Partial<TValues>) => {
      if (!validateStep) {
        setStepValidationState(createEmptyValidationState());
        return;
      }

      stepValidationRequestIdRef.current += 1;
      const requestId = stepValidationRequestIdRef.current;

      try {
        const validationResult = validateStep(stepId, nextValues);
        if (
          isPromiseLike<IncrementalFunnelValidationResult | void>(validationResult)
        ) {
          void validationResult
            .then(asyncResult => {
              if (requestId !== stepValidationRequestIdRef.current) {
                return;
              }
              setStepValidationState(toValidationState(asyncResult));
            })
            .catch(error => {
              if (requestId !== stepValidationRequestIdRef.current) {
                return;
              }
              setStepValidationState(toValidationState(error));
            });
          return;
        }

        if (requestId !== stepValidationRequestIdRef.current) {
          return;
        }
        setStepValidationState(toValidationState(validationResult));
      } catch (error) {
        if (requestId !== stepValidationRequestIdRef.current) {
          return;
        }
        setStepValidationState(toValidationState(error));
      }
    },
    [validateStep]
  );

  const requestSessionCreation = useCallback(() => {
    if (!createSession) {
      return;
    }

    sessionCreationRequestIdRef.current += 1;
    const requestId = sessionCreationRequestIdRef.current;
    setSessionMetadata(null);
    setSessionCreationStatus('creating');
    setSessionCreationError(null);

    void createSession()
      .then(metadata => {
        if (requestId !== sessionCreationRequestIdRef.current) {
          return;
        }
        setSessionMetadata(metadata);
        setSessionCreationStatus('created');
      })
      .catch(error => {
        if (requestId !== sessionCreationRequestIdRef.current) {
          return;
        }
        setSessionCreationError(error);
        setSessionCreationStatus('failed');
      });
  }, [createSession]);

  useEffect(() => {
    setValues(resolvedInitialValues);
    setIsSubmitted(false);
    setSubmitStatus('idle');
    setSubmitError(null);
  }, [resolvedInitialValues]);

  useEffect(() => {
    setCurrentStepId(initialCurrentStepId);
    setCompletedStepIds(previous =>
      previous.filter(stepId => stepIds.has(stepId))
    );
  }, [initialCurrentStepId, stepIds]);

  useEffect(() => {
    if (!createSession || didStartSessionCreationRef.current) {
      return;
    }

    didStartSessionCreationRef.current = true;
    requestSessionCreation();
  }, [createSession, requestSessionCreation]);

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
      let staleEntriesPruned = 0;
      const restoredSources = new Set<'local' | 'session' | 'memory'>();
      let restoredLastUpdatedAt: number | null = null;
      let restoredStepState: PersistedStepState<TStepId> | null = null;

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
            restoredSources.add('local');
            if (
              typeof storedState.metadata?.lastUpdatedAt === 'number' &&
              Number.isFinite(storedState.metadata.lastUpdatedAt)
            ) {
              restoredLastUpdatedAt = Math.max(
                restoredLastUpdatedAt ?? storedState.metadata.lastUpdatedAt,
                storedState.metadata.lastUpdatedAt
              );
            }
          }
          if (localApplied.expiredPaths.length > 0) {
            for (const path of localApplied.expiredPaths) {
              delete localFieldState[path];
            }
            didPruneLocal = true;
            staleEntriesPruned += localApplied.expiredPaths.length;
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
              restoredSources.add('local');
              restoredStepState = {
                currentStepId: parsedCurrentStepId as TStepId | null,
                completedStepIds: parsedCompletedStepIds.filter(
                  stepId =>
                    typeof stepId === 'string' &&
                    stepIds.has(stepId as TStepId)
                ) as TStepId[]
              };
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
            restoredSources.add('session');
            if (
              typeof sessionEnvelope.metadata?.lastUpdatedAt === 'number' &&
              Number.isFinite(sessionEnvelope.metadata.lastUpdatedAt)
            ) {
              restoredLastUpdatedAt = Math.max(
                restoredLastUpdatedAt ?? sessionEnvelope.metadata.lastUpdatedAt,
                sessionEnvelope.metadata.lastUpdatedAt
              );
            }
          }
          if (sessionApplied.expiredPaths.length > 0) {
            for (const path of sessionApplied.expiredPaths) {
              delete sessionFieldState[path];
            }
            didPruneSession = true;
            staleEntriesPruned += sessionApplied.expiredPaths.length;
          }

          if (didPruneSession) {
            if (Object.keys(sessionFieldState).length > 0) {
              adapters.session.setItem(
                storageKey,
                JSON.stringify({
                  fieldState: sessionFieldState,
                  metadata: {
                    lastUpdatedAt:
                      restoredLastUpdatedAt ??
                      (typeof sessionEnvelope.metadata?.lastUpdatedAt === 'number'
                        ? sessionEnvelope.metadata.lastUpdatedAt
                        : now),
                    currentStepId: restoredStepState?.currentStepId ?? null,
                    completedStepIds: restoredStepState?.completedStepIds ?? []
                  }
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
          restoredSources.add('memory');
        }
        if (memoryApplied.expiredPaths.length > 0) {
          for (const path of memoryApplied.expiredPaths) {
            delete parsedMemoryFieldState[path];
          }
          staleEntriesPruned += memoryApplied.expiredPaths.length;
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
              ...(hasStepState ? { stepState: localEnvelope.stepState } : {}),
              metadata: {
                lastUpdatedAt: restoredLastUpdatedAt ?? now,
                currentStepId: restoredStepState?.currentStepId ?? null,
                completedStepIds: restoredStepState?.completedStepIds ?? []
              }
            })
          );
        }
      }

      setValues(nextValues as Partial<TValues>);
      setSavedProgressIsStale(staleEntriesPruned > 0);
      if (didRestoreAnyProgress) {
        setHasSavedProgress(true);
        setSavedProgressMetadata({
          lastUpdatedAt: restoredLastUpdatedAt,
          currentStepId: restoredStepState?.currentStepId ?? null,
          completedStepIds: restoredStepState?.completedStepIds ?? [],
          sources: [...restoredSources],
          staleEntriesPruned
        });
      } else if (staleEntriesPruned > 0) {
        setSavedProgressMetadata({
          lastUpdatedAt: restoredLastUpdatedAt,
          currentStepId: null,
          completedStepIds: [],
          sources: [...restoredSources],
          staleEntriesPruned
        });
      } else {
        setSavedProgressMetadata(null);
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
      const persistedMetadata = {
        lastUpdatedAt: now,
        currentStepId,
        completedStepIds
      };
      const localPayloadBase = {
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
      const localPayload =
        Object.keys(localPayloadBase).length > 0
          ? {
              ...localPayloadBase,
              metadata: persistedMetadata
            }
          : localPayloadBase;

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
            fieldState: sessionFieldState,
            metadata: persistedMetadata
          })
        );
      }

      const savedProgressExists =
        Object.keys(localPayload).length > 0 ||
        Object.keys(sessionFieldState).length > 0 ||
        Object.keys(memoryFieldState).length > 0;
      setHasSavedProgress(savedProgressExists);
      setSavedProgressMetadata(
        savedProgressExists
          ? {
              lastUpdatedAt: now,
              currentStepId,
              completedStepIds,
              sources: [
                ...(Object.keys(localPayload).length > 0 ? (['local'] as const) : []),
                ...(Object.keys(sessionFieldState).length > 0
                  ? (['session'] as const)
                  : []),
                ...(Object.keys(memoryFieldState).length > 0
                  ? (['memory'] as const)
                  : [])
              ],
              staleEntriesPruned: 0
            }
          : null
      );
      if (savedProgressExists) {
        setSavedProgressIsStale(false);
      }
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

  useEffect(() => {
    currentStepIdRef.current = currentStepId;
  }, [currentStepId]);

  useEffect(() => {
    completedStepIdsRef.current = [...completedStepIds];
  }, [completedStepIds]);

  useEffect(() => {
    isSubmittedRef.current = isSubmitted;
  }, [isSubmitted]);

  const hasPendingRemoteSync = useCallback(() => {
    return (
      Object.keys(pendingRemoteValuesRef.current as Record<string, unknown>).length > 0 ||
      (includeStepStateInRemoteUpdate && pendingRemoteStepStateRef.current !== null)
    );
  }, [includeStepStateInRemoteUpdate]);

  const flushRemoteUpdates = useCallback(async () => {
    if (!resolvedRemoteUpdate) {
      return;
    }

    if (remoteSyncTimerRef.current) {
      clearTimeout(remoteSyncTimerRef.current);
      remoteSyncTimerRef.current = null;
    }

    if (remoteSyncInFlightRef.current) {
      await remoteSyncInFlightRef.current;
    }

    if (!hasPendingRemoteSync()) {
      return;
    }

    const pendingValues = pendingRemoteValuesRef.current;
    const pendingStepState = pendingRemoteStepStateRef.current;
    pendingRemoteValuesRef.current = {} as Partial<TValues>;
    pendingRemoteStepStateRef.current = null;
    setRemoteSyncStatus('syncing');

    const syncPromise = (async () => {
      try {
        if (updateRemote) {
          await updateRemote(pendingValues);
        } else if (remoteUpdate) {
          await remoteUpdate({
            values: pendingValues,
            ...(includeStepStateInRemoteUpdate && pendingStepState
              ? { stepState: pendingStepState }
              : {})
          });
        }

        setLastSuccessfulRemoteSyncAt(Date.now());
        setRemoteSyncStatus(hasPendingRemoteSync() ? 'pending' : 'synced');

        if (hasPendingRemoteSync()) {
          if (debounceMs > 0) {
            remoteSyncTimerRef.current = setTimeout(() => {
              void flushRemoteUpdates();
            }, debounceMs);
          } else {
            void flushRemoteUpdates();
          }
        }
      } catch {
        pendingRemoteValuesRef.current = {
          ...(pendingValues as Record<string, unknown>),
          ...(pendingRemoteValuesRef.current as Record<string, unknown>)
        } as Partial<TValues>;
        if (
          includeStepStateInRemoteUpdate &&
          pendingStepState &&
          pendingRemoteStepStateRef.current === null
        ) {
          pendingRemoteStepStateRef.current = pendingStepState;
        }
        setRemoteSyncStatus('failed');
      }
    })();

    remoteSyncInFlightRef.current = syncPromise.finally(() => {
      remoteSyncInFlightRef.current = null;
    });

    await remoteSyncInFlightRef.current;
  }, [
    debounceMs,
    hasPendingRemoteSync,
    includeStepStateInRemoteUpdate,
    remoteUpdate,
    resolvedRemoteUpdate,
    updateRemote
  ]);

  const queueRemoteUpdate = useCallback(
    (partialValues: Partial<TValues>, nextStepState?: PersistedStepState<TStepId>) => {
      if (!resolvedRemoteUpdate || isSubmittedRef.current) {
        return;
      }

      if (Object.keys(partialValues as Record<string, unknown>).length > 0) {
        pendingRemoteValuesRef.current = {
          ...(pendingRemoteValuesRef.current as Record<string, unknown>),
          ...(partialValues as Record<string, unknown>)
        } as Partial<TValues>;
      }

      if (includeStepStateInRemoteUpdate && nextStepState) {
        pendingRemoteStepStateRef.current = nextStepState;
      }

      if (!hasPendingRemoteSync()) {
        return;
      }

      if (remoteSyncStatus !== 'syncing') {
        setRemoteSyncStatus('pending');
      }

      if (remoteSyncTimerRef.current) {
        clearTimeout(remoteSyncTimerRef.current);
      }

      if (debounceMs > 0) {
        remoteSyncTimerRef.current = setTimeout(() => {
          void flushRemoteUpdates();
        }, debounceMs);
      } else {
        void flushRemoteUpdates();
      }
    },
    [
      debounceMs,
      flushRemoteUpdates,
      hasPendingRemoteSync,
      includeStepStateInRemoteUpdate,
      remoteSyncStatus,
      resolvedRemoteUpdate
    ]
  );

  const retryRemoteUpdates = useCallback(async () => {
    if (!resolvedRemoteUpdate || !hasPendingRemoteSync()) {
      return;
    }

    await flushRemoteUpdates();
  }, [flushRemoteUpdates, hasPendingRemoteSync, resolvedRemoteUpdate]);

  useEffect(
    () => () => {
      if (remoteSyncTimerRef.current) {
        clearTimeout(remoteSyncTimerRef.current);
      }
    },
    []
  );

  const updateValues = useCallback(
    (nextValues: Partial<TValues>) => {
      const mergedValues = {
        ...values,
        ...nextValues
      } as Partial<TValues>;
      setValues(mergedValues);
      setAllValidationState(createEmptyValidationState());
      runStepValidation(currentStepIdRef.current, mergedValues);
      queueRemoteUpdate(nextValues, {
        currentStepId: currentStepIdRef.current,
        completedStepIds: completedStepIdsRef.current
      });
    },
    [queueRemoteUpdate, runStepValidation, values]
  );

  const clearValues = useCallback(() => {
    setValues(resolvedInitialValues);
    setIsSubmitted(false);
    isSubmittedRef.current = false;
    setSubmitStatus('idle');
    setSubmitError(null);
    setStepValidationState(createEmptyValidationState());
    setAllValidationState(createEmptyValidationState());
    queueRemoteUpdate(resolvedInitialValues, {
      currentStepId: currentStepIdRef.current,
      completedStepIds: completedStepIdsRef.current
    });
  }, [queueRemoteUpdate, resolvedInitialValues]);

  const clearSavedProgress = useCallback(() => {
    if (storageKey) {
      adapters.local.removeItem(storageKey);
      adapters.session.removeItem(storageKey);
      adapters.memory.removeItem(storageKey);
    }
    setHasSavedProgress(false);
    setSavedProgressIsStale(false);
    setSavedProgressMetadata(null);
  }, [adapters, storageKey]);

  const continueSavedProgress = useCallback(() => {
    setSavedProgressIsStale(false);
  }, []);

  const startAgain = useCallback(() => {
    clearSavedProgress();
    setValues(resolvedInitialValues);
    setCurrentStepId(initialCurrentStepId);
    setCompletedStepIds([]);
    setIsSubmitted(false);
    isSubmittedRef.current = false;
    setSubmitStatus('idle');
    setSubmitError(null);
    setStepValidationState(createEmptyValidationState());
    setAllValidationState(createEmptyValidationState());
    setRemoteSyncStatus('idle');
    pendingRemoteValuesRef.current = {} as Partial<TValues>;
    pendingRemoteStepStateRef.current = null;
    if (remoteSyncTimerRef.current) {
      clearTimeout(remoteSyncTimerRef.current);
      remoteSyncTimerRef.current = null;
    }
    if (createSession) {
      requestSessionCreation();
    } else {
      setSessionMetadata(null);
      setSessionCreationStatus('idle');
      setSessionCreationError(null);
    }
  }, [
    clearSavedProgress,
    createSession,
    initialCurrentStepId,
    requestSessionCreation,
    resolvedInitialValues
  ]);

  const markSubmitted = useCallback(() => {
    setIsSubmitted(true);
    isSubmittedRef.current = true;
    setSubmitStatus('submitted');
    setSubmitError(null);
    setStepValidationState(createEmptyValidationState());
    setAllValidationState(createEmptyValidationState());
  }, []);

  const submit = useCallback(async () => {
    if (submitStatus === 'submitting') {
      return;
    }

    setSubmitStatus('submitting');
    setSubmitError(null);

    try {
      if (validateAll) {
        const validationResult = await validateAll(values);
        const nextValidationState = toValidationState(validationResult);
        setAllValidationState(nextValidationState);
        if (hasValidationErrors(nextValidationState)) {
          throw {
            stepErrors: nextValidationState.stepErrors,
            fieldErrors: nextValidationState.fieldErrors
          };
        }
      } else {
        setAllValidationState(createEmptyValidationState());
      }

      await flushRemoteUpdates();

      if (submitRemote) {
        await submitRemote(values);
      }
      if (remoteSyncTimerRef.current) {
        clearTimeout(remoteSyncTimerRef.current);
        remoteSyncTimerRef.current = null;
      }
      pendingRemoteValuesRef.current = {} as Partial<TValues>;
      pendingRemoteStepStateRef.current = null;
      setRemoteSyncStatus('idle');
      setIsSubmitted(true);
      isSubmittedRef.current = true;
      setSubmitStatus('submitted');
      setSubmitError(null);
      setStepValidationState(createEmptyValidationState());
      setAllValidationState(createEmptyValidationState());
      clearSavedProgress();
    } catch (error) {
      const nextValidationState = toValidationState(error);
      if (hasValidationErrors(nextValidationState)) {
        setAllValidationState(nextValidationState);
      }
      setSubmitStatus('failed');
      setSubmitError(error);
      throw error;
    }
  }, [
    clearSavedProgress,
    flushRemoteUpdates,
    submitRemote,
    submitStatus,
    validateAll,
    values
  ]);

  const goToStep = useCallback(
    (stepId: TStepId) => {
      if (!stepIds.has(stepId)) {
        throw new Error('Step id must exist in steps.');
      }
      setCurrentStepId(stepId);
      runStepValidation(stepId, values);
      queueRemoteUpdate({} as Partial<TValues>, {
        currentStepId: stepId,
        completedStepIds: completedStepIdsRef.current
      });
    },
    [queueRemoteUpdate, runStepValidation, stepIds, values]
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

      const nextStepId = steps[previousIndex + 1] as TStepId;
      runStepValidation(nextStepId, values);
      queueRemoteUpdate({} as Partial<TValues>, {
        currentStepId: nextStepId,
        completedStepIds: completedStepIdsRef.current
      });
      return nextStepId;
    });
  }, [queueRemoteUpdate, runStepValidation, steps, values]);

  const previousStep = useCallback(() => {
    setCurrentStepId(previousStepId => {
      if (previousStepId === null) {
        return previousStepId;
      }

      const previousIndex = steps.findIndex(stepId => stepId === previousStepId);
      if (previousIndex <= 0) {
        return previousStepId;
      }

      const nextStepId = steps[previousIndex - 1] as TStepId;
      runStepValidation(nextStepId, values);
      queueRemoteUpdate({} as Partial<TValues>, {
        currentStepId: nextStepId,
        completedStepIds: completedStepIdsRef.current
      });
      return nextStepId;
    });
  }, [queueRemoteUpdate, runStepValidation, steps, values]);

  const markStepComplete = useCallback(
    (stepId: TStepId) => {
      if (!stepIds.has(stepId)) {
        throw new Error('Step id must exist in steps.');
      }
      setCompletedStepIds(previous => {
        const nextCompletedIds = previous.includes(stepId)
          ? previous
          : [...previous, stepId];
        queueRemoteUpdate({} as Partial<TValues>, {
          currentStepId: currentStepIdRef.current,
          completedStepIds: nextCompletedIds
        });
        return nextCompletedIds;
      });
    },
    [queueRemoteUpdate, stepIds]
  );

  const markStepIncomplete = useCallback(
    (stepId: TStepId) => {
      if (!stepIds.has(stepId)) {
        throw new Error('Step id must exist in steps.');
      }
      setCompletedStepIds(previous => {
        const nextCompletedIds = previous.filter(id => id !== stepId);
        queueRemoteUpdate({} as Partial<TValues>, {
          currentStepId: currentStepIdRef.current,
          completedStepIds: nextCompletedIds
        });
        return nextCompletedIds;
      });
    },
    [queueRemoteUpdate, stepIds]
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
  const currentStepValidationErrors = useMemo(
    () => [...stepValidationState.stepErrors, ...allValidationState.stepErrors],
    [allValidationState.stepErrors, stepValidationState.stepErrors]
  );
  const fieldValidationErrors = useMemo(
    () => ({
      ...allValidationState.fieldErrors,
      ...stepValidationState.fieldErrors
    }),
    [allValidationState.fieldErrors, stepValidationState.fieldErrors]
  );
  const canContinueCurrentStep = useMemo(
    () => !hasValidationErrors(stepValidationState),
    [stepValidationState]
  );

  return {
    values,
    isReady,
    isDirty,
    isSubmitted,
    hasSavedProgress,
    savedProgressExists: hasSavedProgress,
    savedProgressIsStale,
    savedProgressMetadata,
    remoteSyncStatus,
    lastSuccessfulRemoteSyncAt,
    sessionMetadata,
    sessionCreationStatus,
    sessionCreationError,
    submitStatus,
    submitError,
    currentStepValidationErrors,
    fieldValidationErrors,
    canContinueCurrentStep,
    currentStepId,
    completedStepIds,
    canGoNext,
    canGoBack,
    updateValues,
    clearValues,
    continueSavedProgress,
    clearSavedProgress,
    startAgain,
    markSubmitted,
    goToStep,
    nextStep,
    previousStep,
    markStepComplete,
    markStepIncomplete,
    submit,
    flushRemoteUpdates,
    retryRemoteUpdates
  };
}
