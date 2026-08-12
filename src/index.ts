import { useMemo, useState } from 'react';

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

export interface UseIncrementalFunnelResult<
  TStepId extends FunnelStepId = FunnelStepId
> {
  currentStepId: TStepId;
  steps: readonly FunnelStep<TStepId>[];
  advanceTo: (nextStepId: TStepId) => void;
  reset: () => void;
}

export function useIncrementalFunnel<TStepId extends FunnelStepId>(
  steps: readonly FunnelStep<TStepId>[],
  initialStepId?: TStepId
): UseIncrementalFunnelResult<TStepId> {
  const initialState = useMemo(
    () => createFunnel(steps, initialStepId),
    [steps, initialStepId]
  );
  const [state, setState] = useState(initialState);

  return {
    currentStepId: state.currentStepId,
    steps: state.steps,
    advanceTo: nextStepId => {
      setState(previousState => advanceFunnel(previousState, nextStepId));
    },
    reset: () => {
      setState(initialState);
    }
  };
}
