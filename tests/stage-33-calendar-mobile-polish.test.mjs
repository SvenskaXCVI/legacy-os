import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 33 makes the calendar the primary scheduling experience", async () => {
  const app = await read("app/legacy-app.tsx");
  assert.match(app, /useState<"calendar" \| "intelligence">\("calendar"\)/);
  assert.match(app, /useState<"day" \| "week" \| "month">\("week"\)/);
  assert.match(app, /Capacity planning/);
  assert.match(app, /calendar-primary-surface/);
});

test("Stage 33 closes notifications outside the menu and cleans contact actions", async () => {
  const app = await read("app/legacy-app.tsx");
  assert.match(app, /notificationAnchorRef/);
  assert.match(app, /window\.addEventListener\("pointerdown", closeOutside\)/);
  assert.match(app, /function formatPhone/);
  assert.match(app, /function cleanSocialHandle/);
  assert.match(app, /href=\{`tel:/);
});

test("Client portal keeps a working reply composer", async () => {
  const app = await read("app/legacy-app.tsx");
  assert.match(app, /className="message-composer" onSubmit=\{sendMessage\}/);
  assert.match(app, /placeholder="Write a message to your artist\.\.\."/);
});
