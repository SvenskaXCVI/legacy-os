declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
    MEDIA: R2Bucket;
  };
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface D1Database {
  prepare(query: string): unknown;
  batch<T = unknown>(statements: unknown[]): Promise<T[]>;
  exec(query: string): Promise<unknown>;
}

interface R2Bucket {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<unknown>;
  delete(key: string): Promise<void>;
}
