/**
 * Simple request deduper to prevent multiple identical ongoing requests.
 */
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicateRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}
