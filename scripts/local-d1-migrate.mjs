import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const stateDirectory = path.resolve(
  ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
);
const candidates = (await readdir(stateDirectory))
  .filter((name) => name.endsWith(".sqlite"))
  .map((name) => path.join(stateDirectory, name));

let selected = null;
let emptyCandidate = null;
for (const candidate of candidates) {
  const database = new DatabaseSync(candidate);
  const tables = database
    .prepare("select name from sqlite_master where type = 'table'")
    .all()
    .map((row) => row.name);
  database.close();
  console.log(`${path.basename(candidate)}: ${tables.join(", ") || "empty"}`);
  if (tables.includes("users") && path.basename(candidate) !== "metadata.sqlite") {
    selected = candidate;
  }
  if (!tables.length && path.basename(candidate) !== "metadata.sqlite") {
    emptyCandidate = candidate;
  }
}

selected ??= emptyCandidate;
if (!selected) {
  throw new Error("No local Legacy OS D1 database was found");
}

const database = new DatabaseSync(selected);
database.exec("pragma foreign_keys = on");
const migrations = (await readdir(path.resolve("drizzle")))
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort((left, right) => left.localeCompare(right))
  .map((name) => path.join("drizzle", name));

for (const migration of migrations) {
  const marker = `local:${path.basename(migration)}`;
  database.exec(
    "create table if not exists _local_migrations (name text primary key, applied_at text not null)",
  );
  const applied = database
    .prepare("select name from _local_migrations where name = ?")
    .get(marker);
  if (applied) {
    console.log(`${path.basename(migration)} already applied`);
    continue;
  }
  const sql = await readFile(path.resolve(migration), "utf8");
  database.exec("begin");
  try {
    database.exec(sql.replaceAll("--> statement-breakpoint", ""));
    database
      .prepare(
        "insert into _local_migrations (name, applied_at) values (?, ?)",
      )
      .run(marker, new Date().toISOString());
    database.exec("commit");
    console.log(`${path.basename(migration)} applied`);
  } catch (error) {
    database.exec("rollback");
    if (
      error instanceof Error &&
      /already exists|duplicate column name/i.test(error.message)
    ) {
      console.log(
        `${path.basename(migration)} appears to be partially present; inspect before retrying`,
      );
    }
    throw error;
  }
}

const verificationTables = [
  "clients",
  "projects",
  "appointments",
  "approvals",
  "assets",
  "client_messages",
  "ai_runs",
  "audit_events",
];
const counts = Object.fromEntries(
  verificationTables.map((table) => [
    table,
    database.prepare(`select count(*) as count from ${table}`).get().count,
  ]),
);
console.log(
  `Local D1 ready: ${Object.entries(counts)
    .map(([table, count]) => `${table}=${count}`)
    .join(", ")}`,
);

database.close();
