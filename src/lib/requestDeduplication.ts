/**
 * Request Deduplication Utility
 * Prevents duplicate API calls when React StrictMode causes double-mounting
 * or when multiple components make the same request simultaneously
 */

const pendingRequests = new Map<string, Promise<any>>();

/**
 * Deduplicate a request - if the same request is already in flight, return the existing promise
 * @param key - Unique key for the request (e.g., "rpc:super_list_orgs_v1:{}")
 * @param requestFn - Function that makes the actual request
 * @returns Promise that resolves/rejects with the request result
 */
export function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // If request is already in flight, return the existing promise
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  // Create new request and cache the promise
  const promise = requestFn()
    .then((result) => {
      // Remove from pending after success
      pendingRequests.delete(key);
      return result;
    })
    .catch((error) => {
      // Remove from pending after error
      pendingRequests.delete(key);
      throw error;
    });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Create a deduplication key for RPC calls
 */
export function createRpcKey(functionName: string, params?: any): string {
  const paramsStr = params ? JSON.stringify(params) : "";
  return `rpc:${functionName}:${paramsStr}`;
}

/**
 * Create a deduplication key for query calls
 */
export function createQueryKey(
  table: string,
  select: string,
  filters?: Record<string, any>
): string {
  const filtersStr = filters ? JSON.stringify(filters) : "";
  return `query:${table}:${select}:${filtersStr}`;
}

/**
 * Clear all pending requests (useful for testing or cleanup)
 */
export function clearPendingRequests() {
  pendingRequests.clear();
}

