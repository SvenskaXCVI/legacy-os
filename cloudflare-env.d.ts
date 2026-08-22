declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
    MEDIA: R2Bucket;
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    SUPABASE_ANON_KEY?: string;
    OWNER_EMAILS?: string;
    OWNER_ACCESS_CODE_HASH?: string;
    AI_PROVIDER?: string;
    AI_BASE_URL?: string;
    AI_API_KEY?: string;
    AI_MODEL?: string;
    AI_VISION_MODEL?: string;
    INSTAGRAM_CLIENT_ID?: string;
    INSTAGRAM_CLIENT_SECRET?: string;
    INSTAGRAM_REDIRECT_URI?: string;
    SOCIAL_TOKEN_ENCRYPTION_KEY?: string;
    STRIPE_RESTRICTED_KEY?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    STRIPE_LIVE_PAYMENTS_ENABLED?: string;
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
  put(
    key: string,
    value: unknown,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}
