import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("owner access accepts safe opaque-origin mobile webviews", async () => {
  const route = await read("app/api/auth/owner-access/route.ts");

  assert.match(route, /origin === "null"/);
  assert.match(route, /fetchSite === "same-origin"/);
  assert.match(route, /fetchSite === "none"/);
});

test("owner code input removes invisible mobile characters without changing case", async () => {
  const [authLibrary, shell] = await Promise.all([
    read("app/api/_lib.ts"),
    read("app/access-shell.tsx"),
  ]);

  assert.match(authLibrary, /normalizeOwnerAccessCode/);
  assert.match(authLibrary, /normalize\("NFKC"\)/);
  assert.match(authLibrary, /\\u200B-\\u200D/);
  assert.match(authLibrary, /sha256\(normalizeOwnerAccessCode\(code\)\)/);
  assert.match(shell, /normalizedOwnerCode/);
  assert.match(shell, /autoCapitalize="none"/);
  assert.match(shell, /autoCorrect="off"/);
  assert.match(shell, /spellCheck=\{false\}/);
  assert.match(shell, /credentials: "same-origin"/);
  assert.match(shell, /cache: "no-store"/);
});
