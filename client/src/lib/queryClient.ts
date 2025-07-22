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
  options?: { unpackVE30?: boolean; timeout?: number },
): Promise<any> {
  const timeout = options?.timeout || DEFAULT_TIMEOUT;
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
    
    // Handle VE30 unpacking if requested
    if (options?.unpackVE30) {
      const jsonResponse = await res.json();
      console.log('🔧 VE30 UNPACKER: Full ValidationEngine30 response structure:', JSON.stringify(jsonResponse, null, 2));
      console.log('🔧 VE30 UNPACKER: Checking path jsonResponse?.threads?.transaction?.data');
      console.log('🔧 VE30 UNPACKER: jsonResponse.threads exists:', !!jsonResponse?.threads);
      console.log('🔧 VE30 UNPACKER: jsonResponse.threads.transaction exists:', !!jsonResponse?.threads?.transaction);
      console.log('🔧 VE30 UNPACKER: jsonResponse.threads.transaction.data exists:', !!jsonResponse?.threads?.transaction?.data);
      
      if (jsonResponse?.threads?.transaction?.data) {
        console.log('🔧 VE30 UNPACKER: ✅ EXTRACTION PATH FOUND - Extracting data from ValidationEngine30 response');
        console.log('🔧 VE30 UNPACKER: Raw jsonResponse.threads.transaction.data:', JSON.stringify(jsonResponse.threads.transaction.data, null, 2));
        const extracted = jsonResponse.threads.transaction.data;
        console.log('🔧 VE30 UNPACKER: Extracted data weekStructureLocked:', extracted.weekStructureLocked);
        return extracted;
      } else {
        console.log('🔧 VE30 UNPACKER: ❌ EXTRACTION PATH NOT FOUND - Returning full jsonResponse');
        console.log('🔧 VE30 UNPACKER: Full response keys:', Object.keys(jsonResponse));
        return jsonResponse;
      }
    }
    
    return res.json();
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
        on401: "returnNull", // Return null instead of throwing on 401 (prevents error toasts during logout)
        timeout: 8000 // Reduced timeout for faster error detection
      }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Standard caching configuration
      staleTime: 300000, // 5 minutes
      gcTime: 600000, // 10 minutes
      retry: 1,
      retryDelay: 500,
      networkMode: 'online',
      refetchOnMount: 'always'
    },
    mutations: {
      retry: 1,
      retryDelay: 500,
    },
  },
});
