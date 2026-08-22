import { QueryClient } from '@tanstack/react-query';

/**
 * Shared client for list/caching. Screens use stable queryKey tuples (e.g. ['api','products', path]).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
