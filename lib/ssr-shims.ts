// Basic no-op shims for SSR/Static Export environments where browser globals don't exist.
if (typeof globalThis !== 'undefined') {
  const needsPolyfill =
    typeof (globalThis as any).localStorage === 'undefined' ||
    typeof (globalThis as any).localStorage?.getItem !== 'function';

  if (needsPolyfill) {
    const storage: any = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => (key in storage ? storage[key] : null),
      setItem: (key: string, value: string) => {
        storage[key] = String(value);
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      },
      key: (index: number) => Object.keys(storage)[index] ?? null,
      get length() {
        return Object.keys(storage).length;
      },
    };
  }
}
