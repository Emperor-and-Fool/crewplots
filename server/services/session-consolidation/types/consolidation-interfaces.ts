export interface CacheOptions {
  ttl?: number;
  category: string;
  connectionId?: string;
}

export interface ConsolidatedResponse<T> {
  data: T;
  metadata: {
    cached: boolean;
    timestamp: Date;
    userId: number;
  };
}

export interface DataFetcherFunction<T> {
  (): Promise<T>;
}