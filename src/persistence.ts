export type FieldPersistenceMode =
  | 'local'
  | 'session'
  | 'memory'
  | 'never'
  | 'remoteOnly';

export interface FieldPersistencePolicy {
  persist: FieldPersistenceMode;
  ttlMs?: number;
}

export type FieldPersistencePolicies = Record<string, FieldPersistencePolicy>;

export interface PersistedFieldEntry {
  value: unknown;
  expiresAt: number | null;
}

export type PersistedFieldState = Record<string, PersistedFieldEntry>;

function isSafePathSegment(segment: string): boolean {
  return (
    segment.length > 0 &&
    segment !== '__proto__' &&
    segment !== 'prototype' &&
    segment !== 'constructor'
  );
}

function toSafePathSegments(path: string): string[] | null {
  const segments = path.split('.');
  if (segments.some(segment => !isSafePathSegment(segment))) {
    return null;
  }
  return segments;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getValueAtPath(
  source: Record<string, unknown>,
  path: string
): unknown {
  const segments = toSafePathSegments(path);
  if (!segments) {
    return undefined;
  }
  let current: unknown = source;

  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

export function setValueAtPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const segments = toSafePathSegments(path);
  if (!segments) {
    return;
  }
  let current = target;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]!;
    if (
      segment === '__proto__' ||
      segment === 'prototype' ||
      segment === 'constructor'
    ) {
      return;
    }
    const next = current[segment];

    if (!isRecord(next)) {
      current[segment] = {};
    }

    current = current[segment] as Record<string, unknown>;
  }

  const finalSegment = segments[segments.length - 1]!;
  if (
    finalSegment === '__proto__' ||
    finalSegment === 'prototype' ||
    finalSegment === 'constructor'
  ) {
    return;
  }
  current[finalSegment] = value;
}

export function normalizeFieldPolicies(
  policies: FieldPersistencePolicies | undefined
): FieldPersistencePolicies {
  if (!policies) {
    return {};
  }

  const normalized: FieldPersistencePolicies = {};
  for (const [path, policy] of Object.entries(policies)) {
    if (
      !path ||
      !policy ||
      typeof policy.persist !== 'string' ||
      !toSafePathSegments(path)
    ) {
      continue;
    }
    normalized[path] = policy;
  }
  return normalized;
}

export function buildFieldStateForMode(
  values: Record<string, unknown>,
  policies: FieldPersistencePolicies,
  mode: 'local' | 'session' | 'memory',
  now: number
): PersistedFieldState {
  const fieldState: PersistedFieldState = {};

  for (const [path, policy] of Object.entries(policies)) {
    if (policy.persist !== mode) {
      continue;
    }

    const value = getValueAtPath(values, path);
    if (typeof value === 'undefined') {
      continue;
    }

    const ttlMs =
      typeof policy.ttlMs === 'number' && Number.isFinite(policy.ttlMs)
        ? policy.ttlMs
        : null;
    const expiresAt = ttlMs === null ? null : now + Math.max(ttlMs, 0);
    if (expiresAt !== null && expiresAt <= now) {
      continue;
    }

    fieldState[path] = {
      value,
      expiresAt
    };
  }

  return fieldState;
}

export function applyFieldStateForMode(
  target: Record<string, unknown>,
  policies: FieldPersistencePolicies,
  mode: 'local' | 'session' | 'memory',
  fieldState: PersistedFieldState,
  now: number
): { nextValues: Record<string, unknown>; expiredPaths: string[] } {
  const nextValues = { ...target };
  const expiredPaths: string[] = [];

  for (const [path, policy] of Object.entries(policies)) {
    if (policy.persist !== mode) {
      continue;
    }

    const entry = fieldState[path];
    if (!entry) {
      continue;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= now) {
      expiredPaths.push(path);
      continue;
    }

    setValueAtPath(nextValues, path, entry.value);
  }

  return { nextValues, expiredPaths };
}

export function isPersistedFieldEntry(value: unknown): value is PersistedFieldEntry {
  return (
    isRecord(value) &&
    'value' in value &&
    ('expiresAt' in value
      ? value.expiresAt === null || typeof value.expiresAt === 'number'
      : true)
  );
}

export function readPersistedFieldState(value: unknown): PersistedFieldState {
  if (!isRecord(value)) {
    return {};
  }

  const fieldState: PersistedFieldState = {};
  for (const [path, entry] of Object.entries(value)) {
    if (!isPersistedFieldEntry(entry)) {
      continue;
    }

    fieldState[path] = {
      value: entry.value,
      expiresAt: typeof entry.expiresAt === 'number' ? entry.expiresAt : null
    };
  }

  return fieldState;
}
