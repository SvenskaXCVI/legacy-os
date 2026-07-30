import { sql } from "drizzle-orm";
import { getDb } from "../../../db";

export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    await getDb().run(sql`select 1`);
    return Response.json({
      status: "healthy",
      checkedAt,
      services: {
        application: "healthy",
        database: "healthy",
        telemetry: "healthy",
      },
    });
  } catch {
    return Response.json(
      {
        status: "degraded",
        checkedAt,
        services: {
          application: "healthy",
          database: "unavailable",
          telemetry: "unavailable",
        },
      },
      { status: 503 },
    );
  }
}
