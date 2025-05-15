import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Default timeout for requests (12 seconds)
const DEFAULT_TIMEOUT = 12000;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  timeout = DEFAULT_TIMEOUT,
): Promise<Response> {
  // Create AbortController for request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId); // Clear timeout if request completes
    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    clearTimeout(timeoutId); // Clean up timeout
    
    // Customize error message for timeouts
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout: The server took too long to respond (>${timeout/1000}s)`);
    }
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  timeout?: number;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, timeout = DEFAULT_TIMEOUT }) =>
  async ({ queryKey }) => {
    // Create AbortController for request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId); // Clear timeout if request completes
    
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      clearTimeout(timeoutId); // Clean up timeout
      
      // Customize error message for timeouts
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout: The server took too long to respond (>${timeout/1000}s)`);
      }
      
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ 
        on401: "throw",
        timeout: DEFAULT_TIMEOUT
      }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: 1, // One retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: 1, // One retry for mutations
      retryDelay: 1000,
    },
  },
});
