import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Glimmerglen game shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<h1>Glimmerglen<\/h1>/);
  assert.match(html, /Builder’s folio/);
  assert.match(html, /THE GREENWARD VALE/);
  assert.match(html, /CHAPTER <!-- -->1<!-- --> OF 3/);
  assert.match(html, /Lantern Road/);
  assert.match(html, /Bloom Rite/);
  assert.match(html, /Pilgrims at the south road/);
  assert.match(html, /Open town ledger/);
  assert.match(html, /href="\/favicon\.svg"/);
  assert.match(html, /og-v2\.png/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /name="theme-color" content="#152820"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("renders an accessible interactive map", async () => {
  const response = await render();
  const html = await response.text();
  const tileButtons = html.match(/class="tile/g) ?? [];
  assert.equal(tileButtons.length, 96);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1);
  assert.equal((html.match(/tabindex="-1"/g) ?? []).length, 95);
  assert.match(html, /aria-label="Build Moonwheat Field at 3, 1"/);
  assert.match(html, /aria-label="Pause time"/);
  assert.match(html, /aria-label="Town resources"/);
  assert.match(html, /role="grid"/);
});

test("responsive styles keep objectives visible on tablet layouts", async () => {
  const css = await readFile(new URL("../app/game.css", import.meta.url), "utf8");
  assert.match(css, /grid-template-areas:"chapter goals request stats"/);
  assert.doesNotMatch(css, /\.quest-panel\{display:none\}/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /forced-colors:active/);
});
