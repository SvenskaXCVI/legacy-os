import {
  authConfiguration,
  bootstrapAuthenticatedUser,
  jsonError,
  resolveUser,
} from "../../_lib";

export async function GET(request: Request) {
  try {
    const access = await resolveUser(request);
    return Response.json({
      configured: authConfiguration(),
      authenticated: Boolean(access?.user),
      emailVerified: access?.emailVerified ?? false,
      user: access?.user
        ? {
            id: access.user.id,
            email: access.user.email,
            displayName: access.user.displayName,
            role: access.user.role,
            clientId: access.user.clientId,
            mfaRequired: access.user.mfaRequired,
            authProvider: access.user.authProvider,
            emailVerifiedAt: access.user.emailVerifiedAt,
            lastLoginAt: access.user.lastLoginAt,
            status: access.user.status,
          }
        : null,
      assuranceLevel: access?.assuranceLevel ?? null,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to inspect access",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      invitationToken?: string;
    };
    const user = await bootstrapAuthenticatedUser(
      request,
      payload.invitationToken,
    );
    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        clientId: user.clientId,
        mfaRequired: user.mfaRequired,
        authProvider: user.authProvider,
        emailVerifiedAt: user.emailVerifiedAt,
        lastLoginAt: user.lastLoginAt,
        status: user.status,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError(
      error instanceof Error ? error.message : "Unable to create account",
      500,
    );
  }
}
