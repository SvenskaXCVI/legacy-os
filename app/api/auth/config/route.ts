import { authConfiguration } from "../../_lib";
import { env } from "cloudflare:workers";

export async function GET() {
  const config = authConfiguration();
  return Response.json({
    ...config,
    supabaseUrl: config.mode === "supabase" ? env.SUPABASE_URL : null,
    supabaseAnonKey:
      config.mode === "supabase" ? env.SUPABASE_ANON_KEY : null,
  });
}
