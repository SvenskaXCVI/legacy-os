import {
  requireOwner,
  routeError,
  supabaseRequestClient,
  type SupabaseWorkspaceMembership,
  WORKSPACE_ID,
} from "../_lib";

type MembershipEvent = {
  id: number;
  membership_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

function clientFor(request: Request) {
  const client = supabaseRequestClient(request);
  if (!client) {
    throw new Response(
      JSON.stringify({ error: "Supabase account authentication is required" }),
      { status: 409, headers: { "content-type": "application/json" } },
    );
  }
  return client;
}

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    const client = clientFor(request);
    const [memberships, events] = await Promise.all([
      client
        .from("workspace_memberships")
        .select("id,workspace_id,user_id,email,role,status,mfa_required,client_id,created_by,created_at,updated_at")
        .eq("workspace_id", WORKSPACE_ID)
        .order("created_at", { ascending: true }),
      client
        .from("workspace_membership_events")
        .select("id,membership_id,action,details,created_at")
        .eq("workspace_id", WORKSPACE_ID)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (memberships.error) throw new Error(memberships.error.message);
    if (events.error) throw new Error(events.error.message);
    return Response.json({
      memberships: memberships.data as SupabaseWorkspaceMembership[],
      events: events.data as MembershipEvent[],
      policy: {
        provider: "Supabase Auth + Postgres RLS",
        ownerMfa: "aal2 required",
        legacyFallback: true,
      },
    });
  } catch (error) {
    return routeError(error, "Unable to load the team access registry");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as { email?: string };
    const email = payload.email?.trim().toLowerCase() || "";
    const client = clientFor(request);
    const result = await client.rpc("invite_workspace_owner", {
      target_workspace: WORKSPACE_ID,
      target_email: email,
    });
    if (result.error) throw new Error(result.error.message);
    const inviteUrl = new URL(request.url);
    inviteUrl.pathname = "/";
    inviteUrl.search = "";
    inviteUrl.searchParams.set("role", "owner");
    inviteUrl.searchParams.set("email", email);
    return Response.json({
      membership: result.data as SupabaseWorkspaceMembership,
      inviteUrl: inviteUrl.toString(),
    });
  } catch (error) {
    return routeError(error, "Unable to prepare owner access");
  }
}

export async function PATCH(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      membershipId?: string;
      status?: "active" | "suspended" | "revoked";
    };
    if (!payload.membershipId || !payload.status) {
      throw new Response(JSON.stringify({ error: "Membership and status are required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const client = clientFor(request);
    const result = await client.rpc("set_workspace_membership_status", {
      target_membership: payload.membershipId,
      next_status: payload.status,
    });
    if (result.error) throw new Error(result.error.message);
    return Response.json({ membership: result.data as SupabaseWorkspaceMembership });
  } catch (error) {
    return routeError(error, "Unable to update owner access");
  }
}

