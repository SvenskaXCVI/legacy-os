import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sources = [
  new URL("../app/access-shell.tsx", import.meta.url),
  new URL("../app/legacy-app.tsx", import.meta.url),
];

function tagName(node) {
  return node.tagName?.getText().toLowerCase();
}

function attributes(node) {
  return new Map(
    node.attributes.properties
      .filter(ts.isJsxAttribute)
      .map((attribute) => [
        attribute.name.getText().toLowerCase(),
        attribute,
      ]),
  );
}

function hasFormAncestor(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      ts.isJsxElement(parent) &&
      tagName(parent.openingElement) === "form"
    ) {
      return true;
    }
  }
  return false;
}

function literalAttribute(attribute) {
  return attribute?.initializer && ts.isStringLiteral(attribute.initializer)
    ? attribute.initializer.text.toLowerCase()
    : "";
}

function location(source, node) {
  const point = source.getLineAndCharacterOfPosition(node.getStart(source));
  return `${source.fileName}:${point.line + 1}`;
}

test("every enabled button has an interaction contract", async () => {
  const failures = [];
  for (const url of sources) {
    const text = await readFile(url, "utf8");
    const source = ts.createSourceFile(
      url.pathname,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node) {
      const opening = ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : null;
      if (opening && tagName(opening) === "button") {
        const attrs = attributes(opening);
        const formAction =
          hasFormAncestor(opening) &&
          (!attrs.has("type") ||
            ["submit", "reset"].includes(literalAttribute(attrs.get("type"))));
        const interactive =
          attrs.has("onclick") ||
          attrs.has("onpointerdown") ||
          attrs.has("disabled") ||
          formAction;
        if (!interactive) {
          failures.push(`${location(source, opening)} enabled button has no action`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(failures, []);
});

test("form controls are stateful, submitted, or explicitly read-only", async () => {
  const failures = [];
  for (const url of sources) {
    const text = await readFile(url, "utf8");
    const source = ts.createSourceFile(
      url.pathname,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node) {
      const opening = ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : null;
      const tag = opening ? tagName(opening) : "";
      if (opening && ["input", "select", "textarea"].includes(tag)) {
        const attrs = attributes(opening);
        const controlled =
          attrs.has("onchange") ||
          attrs.has("readonly") ||
          attrs.has("name");
        if (!controlled) {
          failures.push(
            `${location(source, opening)} ${tag} is neither stateful nor submitted`,
          );
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(failures, []);
});

test("client asset downloads carry authenticated access", async () => {
  const app = await readFile(sources[1], "utf8");
  assert.match(app, /async function downloadAsset/);
  assert.match(app, /authorization.*Bearer/s);
  assert.match(app, /openPortalAsset/);
  assert.doesNotMatch(
    app,
    /<a href=\{`\/api\/files\?id=\$\{asset\.id\}&token=/,
  );
});
