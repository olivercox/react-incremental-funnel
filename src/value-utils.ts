import { getValueAtPath, isRecord, setValueAtPath } from './persistence';

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

function cloneValue<TValue>(value: TValue): TValue {
  if (Array.isArray(value)) {
    return value.map(item => cloneValue(item)) as TValue;
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, cloneValue(entryValue)])
    ) as TValue;
  }

  return value;
}

function deleteValueAtPath(target: Record<string, unknown>, path: string): void {
  const segments = toSafePathSegments(path);
  if (!segments || segments.length === 0) {
    return;
  }

  let current: Record<string, unknown> = target;
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
      return;
    }
    current = next;
  }

  const finalSegment = segments[segments.length - 1]!;
  if (
    finalSegment === '__proto__' ||
    finalSegment === 'prototype' ||
    finalSegment === 'constructor'
  ) {
    return;
  }
  delete current[finalSegment];
}

export function pickPersistableValues(
  values: Record<string, unknown>,
  persistablePaths: readonly string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const path of persistablePaths) {
    const value = getValueAtPath(values, path);
    if (typeof value === 'undefined') {
      continue;
    }
    setValueAtPath(result, path, cloneValue(value));
  }

  return result;
}

export function removeBlockedFields(
  values: Record<string, unknown>,
  blockedPaths: readonly string[]
): Record<string, unknown> {
  const result = cloneValue(values);
  for (const path of blockedPaths) {
    deleteValueAtPath(result, path);
  }
  return result;
}

export function redactValues(
  values: Record<string, unknown>,
  sensitivePaths: readonly string[],
  redactedValue: unknown = '[REDACTED]'
): Record<string, unknown> {
  const result = cloneValue(values);
  for (const path of sensitivePaths) {
    const currentValue = getValueAtPath(result, path);
    if (typeof currentValue === 'undefined') {
      continue;
    }
    setValueAtPath(result, path, redactedValue);
  }
  return result;
}
