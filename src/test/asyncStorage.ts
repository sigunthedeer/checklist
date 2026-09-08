/**
 * In-memory stand-in for AsyncStorage.
 *
 * The real module needs a native host, and the persistence code is specifically
 * written to survive a storage layer that fails, so the fake can be told to fail
 * on demand rather than only ever succeeding.
 */
type Mode = 'ok' | 'read-fails' | 'write-fails';

const store = new Map<string, string>();
let mode: Mode = 'ok';

export const mockAsyncStorage = {
  getItem: jest.fn(async (key: string) => {
    if (mode === 'read-fails') throw new Error('read failed');
    return store.has(key) ? (store.get(key) as string) : null;
  }),
  setItem: jest.fn(async (key: string, value: string) => {
    if (mode === 'write-fails') throw new Error('quota exceeded');
    store.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    store.delete(key);
  }),

  /** Test helpers. */
  __reset() {
    store.clear();
    mode = 'ok';
    mockAsyncStorage.getItem.mockClear();
    mockAsyncStorage.setItem.mockClear();
    mockAsyncStorage.removeItem.mockClear();
  },
  __seed(key: string, value: string) {
    store.set(key, value);
  },
  __read(key: string): string | null {
    return store.get(key) ?? null;
  },
  __fail(next: Mode) {
    mode = next;
  },
};

export default mockAsyncStorage;
