import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

// Minimal query/mutation library replacing @tanstack/react-query.
// Backed by an in-memory cache keyed on JSON-stringified query keys.
// Sized for a local-first Electron app where every IPC call is
// already cheap and there is no network coalescing benefit.

export type QueryKey = readonly unknown[];

type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

interface QueryState<T> {
  status: QueryStatus;
  data: T | undefined;
  error: unknown;
}

interface CacheEntry<T = unknown> {
  state: QueryState<T>;
  listeners: Set<() => void>;
  fetcher: (() => Promise<T>) | null;
  inflight: Promise<T> | null;
  cancelToken: { cancelled: boolean } | null;
}

function serializeKey(key: QueryKey): string {
  return JSON.stringify(key);
}

function keyMatchesPrefix(entryKey: QueryKey, prefix: QueryKey): boolean {
  if (entryKey.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (JSON.stringify(entryKey[i]) !== JSON.stringify(prefix[i])) return false;
  }
  return true;
}

export class QueryClient {
  private cache = new Map<string, CacheEntry>();
  private keyIndex = new Map<string, QueryKey>();

  private entry<T>(key: QueryKey): CacheEntry<T> {
    const id = serializeKey(key);
    let e = this.cache.get(id) as CacheEntry<T> | undefined;
    if (!e) {
      e = {
        state: { status: 'idle', data: undefined, error: undefined },
        listeners: new Set(),
        fetcher: null,
        inflight: null,
        cancelToken: null,
      };
      this.cache.set(id, e as CacheEntry);
      this.keyIndex.set(id, key);
    }
    return e;
  }

  getQueryData<T>(key: QueryKey): T | undefined {
    return this.cache.get(serializeKey(key))?.state.data as T | undefined;
  }

  setQueryData<T>(
    key: QueryKey,
    updater: T | ((prev: T | undefined) => T | undefined),
  ): void {
    const e = this.entry<T>(key);
    const next =
      typeof updater === 'function'
        ? (updater as (prev: T | undefined) => T | undefined)(e.state.data)
        : updater;
    if (next === undefined && e.state.data === undefined) return;
    e.state = { status: 'success', data: next, error: undefined };
    this.notify(e);
  }

  private notify(e: CacheEntry): void {
    for (const fn of e.listeners) fn();
  }

  async invalidateQueries(opts: { queryKey: QueryKey }): Promise<void> {
    const prefix = opts.queryKey;
    const refetches: Array<Promise<unknown>> = [];
    for (const [id, key] of this.keyIndex) {
      if (!keyMatchesPrefix(key, prefix)) continue;
      const e = this.cache.get(id);
      if (!e || !e.fetcher) continue;
      refetches.push(this.runFetcher(e));
    }
    await Promise.allSettled(refetches);
  }

  async cancelQueries(opts: { queryKey: QueryKey }): Promise<void> {
    const prefix = opts.queryKey;
    for (const [id, key] of this.keyIndex) {
      if (!keyMatchesPrefix(key, prefix)) continue;
      const e = this.cache.get(id);
      if (!e || !e.cancelToken) continue;
      e.cancelToken.cancelled = true;
    }
  }

  runFetcher<T>(e: CacheEntry<T>): Promise<T | undefined> {
    if (!e.fetcher) return Promise.resolve(undefined);
    const token = { cancelled: false };
    e.cancelToken = token;
    e.state = { ...e.state, status: 'loading' };
    this.notify(e);
    const p = e.fetcher().then(
      (data) => {
        if (token.cancelled) return data;
        e.state = { status: 'success', data, error: undefined };
        e.inflight = null;
        this.notify(e);
        return data;
      },
      (error: unknown) => {
        if (token.cancelled) throw error;
        e.state = { status: 'error', data: e.state.data, error };
        e.inflight = null;
        this.notify(e);
        throw error;
      },
    );
    e.inflight = p;
    return p;
  }

  registerQuery<T>(key: QueryKey, fetcher: () => Promise<T>): CacheEntry<T> {
    const e = this.entry<T>(key);
    e.fetcher = fetcher as () => Promise<unknown> as () => Promise<T>;
    return e;
  }
}

const QueryClientContext = createContext<QueryClient | null>(null);

export function QueryClientProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}): JSX.Element {
  return createElement(QueryClientContext.Provider, { value: client }, children);
}

export function useQueryClient(): QueryClient {
  const c = useContext(QueryClientContext);
  if (!c) throw new Error('useQueryClient must be used inside <QueryClientProvider>');
  return c;
}

export interface UseQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  enabled?: boolean;
  // Accepted for API compatibility — ignored by this minimal cache.
  staleTime?: number;
  gcTime?: number;
  retry?: number | boolean;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
  refetch: () => Promise<T | undefined>;
}

export function useQuery<T>(opts: UseQueryOptions<T>): UseQueryResult<T> {
  const qc = useQueryClient();
  const enabled = opts.enabled !== false;
  const keyId = serializeKey(opts.queryKey);
  const fnRef = useRef(opts.queryFn);
  fnRef.current = opts.queryFn;

  const entry = useMemo(
    () => qc.registerQuery<T>(opts.queryKey, () => fnRef.current()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc, keyId],
  );

  // useSyncExternalStore is React's safe subscription primitive — it
  // schedules re-renders correctly so notify() from inside an effect
  // never trips React's "flushSync inside lifecycle" warning.
  const subscribe = useCallback(
    (cb: () => void) => {
      entry.listeners.add(cb);
      return () => {
        entry.listeners.delete(cb);
      };
    },
    [entry],
  );
  const getSnapshot = useCallback(() => entry.state, [entry]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!enabled) return;
    if (state.status === 'idle' || state.data === undefined) {
      void qc.runFetcher(entry);
    }
  }, [enabled, entry, qc, state.status, state.data]);

  const refetch = useCallback(async () => {
    return (await qc.runFetcher(entry)) as T | undefined;
  }, [qc, entry]);

  const { status, data, error } = state;
  return {
    data,
    isLoading: enabled && (status === 'loading' || (status === 'idle' && data === undefined)),
    isFetching: status === 'loading',
    isError: status === 'error',
    isSuccess: status === 'success',
    error,
    refetch,
  };
}

export interface UseMutationOptions<TData, TError, TVars, TContext> {
  mutationFn: (vars: TVars) => Promise<TData>;
  onMutate?: (vars: TVars) => Promise<TContext | undefined> | TContext | undefined;
  onSuccess?: (data: TData, vars: TVars, ctx: TContext | undefined) => unknown;
  onError?: (err: TError, vars: TVars, ctx: TContext | undefined) => unknown;
  onSettled?: (
    data: TData | undefined,
    err: TError | null,
    vars: TVars,
    ctx: TContext | undefined,
  ) => unknown;
}

// Per-call hooks layered on top of the mutation-level options. Fire
// AFTER the mutation-level hook for the same lifecycle event.
export interface MutateOptions<TData, TError, TVars> {
  onSuccess?: (data: TData, vars: TVars) => unknown;
  onError?: (err: TError, vars: TVars) => unknown;
  onSettled?: (data: TData | undefined, err: TError | null, vars: TVars) => unknown;
}

interface BaseMutationResult<TData, TError, TVars> {
  mutate: (vars: TVars, options?: MutateOptions<TData, TError, TVars>) => void;
  mutateAsync: (
    vars: TVars,
    options?: MutateOptions<TData, TError, TVars>,
  ) => Promise<TData>;
  isPending: boolean;
  isSuccess: boolean;
  reset: () => void;
}

// Discriminated union mirrors react-query v5's narrowing: once you
// branch on isError / isSuccess, `error` and `data` carry their
// non-null types.
export type UseMutationResult<TData, TError, TVars> =
  | (BaseMutationResult<TData, TError, TVars> & {
      isError: false;
      error: null;
      data: TData | undefined;
    })
  | (BaseMutationResult<TData, TError, TVars> & {
      isError: true;
      error: TError;
      data: undefined;
    });

export function useMutation<
  TData = unknown,
  TError = Error,
  TVars = void,
  TContext = unknown,
>(
  opts: UseMutationOptions<TData, TError, TVars, TContext>,
): UseMutationResult<TData, TError, TVars> {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const [state, setState] = useState<{
    status: 'idle' | 'pending' | 'success' | 'error';
    data: TData | undefined;
    error: TError | null;
  }>({ status: 'idle', data: undefined, error: null });

  const mutateAsync = useCallback(
    async (
      vars: TVars,
      perCall?: MutateOptions<TData, TError, TVars>,
    ): Promise<TData> => {
      setState((s) => ({ ...s, status: 'pending', error: null }));
      let ctx: TContext | undefined;
      try {
        ctx = (await optsRef.current.onMutate?.(vars)) as TContext | undefined;
      } catch (err) {
        const error = err as TError;
        setState({ status: 'error', data: undefined, error });
        optsRef.current.onError?.(error, vars, undefined);
        perCall?.onError?.(error, vars);
        optsRef.current.onSettled?.(undefined, error, vars, undefined);
        perCall?.onSettled?.(undefined, error, vars);
        throw err;
      }
      try {
        const data = await optsRef.current.mutationFn(vars);
        setState({ status: 'success', data, error: null });
        optsRef.current.onSuccess?.(data, vars, ctx);
        perCall?.onSuccess?.(data, vars);
        optsRef.current.onSettled?.(data, null, vars, ctx);
        perCall?.onSettled?.(data, null, vars);
        return data;
      } catch (err) {
        const error = err as TError;
        setState({ status: 'error', data: undefined, error });
        optsRef.current.onError?.(error, vars, ctx);
        perCall?.onError?.(error, vars);
        optsRef.current.onSettled?.(undefined, error, vars, ctx);
        perCall?.onSettled?.(undefined, error, vars);
        throw err;
      }
    },
    [],
  );

  const mutate = useCallback(
    (vars: TVars, perCall?: MutateOptions<TData, TError, TVars>) => {
      void mutateAsync(vars, perCall).catch(() => {});
    },
    [mutateAsync],
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', data: undefined, error: null });
  }, []);

  const base: BaseMutationResult<TData, TError, TVars> = {
    mutate,
    mutateAsync,
    isPending: state.status === 'pending',
    isSuccess: state.status === 'success',
    reset,
  };

  if (state.status === 'error' && state.error !== null) {
    return {
      ...base,
      isError: true,
      error: state.error,
      data: undefined,
    };
  }
  return {
    ...base,
    isError: false,
    error: null,
    data: state.data,
  };
}
