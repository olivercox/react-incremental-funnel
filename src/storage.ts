export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStorageAdapter(
  initialState?: Record<string, string>
): StorageAdapter {
  const store = new Map<string, string>(Object.entries(initialState ?? {}));
  return {
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
    removeItem(key: string): void {
      store.delete(key);
    }
  };
}

export function createLocalStorageAdapter(): StorageAdapter {
  return {
    getItem(key: string): string | null {
      try {
        if (
          typeof window === 'undefined' ||
          typeof window.localStorage === 'undefined'
        ) {
          return null;
        }
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      try {
        if (
          typeof window === 'undefined' ||
          typeof window.localStorage === 'undefined'
        ) {
          return;
        }
        window.localStorage.setItem(key, value);
      } catch {
        return;
      }
    },
    removeItem(key: string): void {
      try {
        if (
          typeof window === 'undefined' ||
          typeof window.localStorage === 'undefined'
        ) {
          return;
        }
        window.localStorage.removeItem(key);
      } catch {
        return;
      }
    }
  };
}

export function createSessionStorageAdapter(): StorageAdapter {
  return {
    getItem(key: string): string | null {
      try {
        if (
          typeof window === 'undefined' ||
          typeof window.sessionStorage === 'undefined'
        ) {
          return null;
        }
        return window.sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      try {
        if (
          typeof window === 'undefined' ||
          typeof window.sessionStorage === 'undefined'
        ) {
          return;
        }
        window.sessionStorage.setItem(key, value);
      } catch {
        return;
      }
    },
    removeItem(key: string): void {
      try {
        if (
          typeof window === 'undefined' ||
          typeof window.sessionStorage === 'undefined'
        ) {
          return;
        }
        window.sessionStorage.removeItem(key);
      } catch {
        return;
      }
    }
  };
}
