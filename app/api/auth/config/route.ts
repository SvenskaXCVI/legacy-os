import { authConfiguration, supabasePublicKey } from "../../_lib";
import { env } from "cloudflare:workers";

export async function GET() {
  const config = authConfiguration();
  return Response.json(
    {
      ...config,
      supabaseUrl: config.mode === "supabase" ? env.SUPABASE_URL : null,
      supabaseAnonKey:
        config.mode === "supabase" ? supabasePublicKey() : null,
    },
    {
      headers: {
        "cache-control": "private, no-store, max-age=0",
        pragma: "no-cache",
      },
    },
  );
}
