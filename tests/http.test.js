import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Store } from "../server/store.mjs";
import { AI } from "../server/ai.mjs";
import { Service } from "../server/service.mjs";
import { createApp } from "../server/http.mjs";
async function app(t) {
  const dir = mkdtempSync(join(tmpdir(), "daily-http-")),
    store = new Store(dir),
    ai = new AI(dir, {
      provider: "online",
      baseUrl: "https://example.com/v1",
      model: "example",
      apiKey: "never-export-this",
    });
  const service = new Service(store, ai),
    server = createApp(service, { publicDir: resolve("public") });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { store, service, url: `http://127.0.0.1:${server.address().port}` };
}
test("HTTP local-only mutations require same-origin token; keys are absent from public state and backup", async (t) => {
  const { url } = await app(t);
  const response = await fetch(url + "/api/state"),
    data = await response.json();
  assert.equal(JSON.stringify(data).includes("never-export-this"), false);
  assert.equal(
    (
      await fetch(url + "/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(url + "/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Local-Token": data.token,
          Origin: "https://evil.example",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  const good = await fetch(url + "/api/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Local-Token": data.token,
    },
    body: JSON.stringify({ uiLanguage: "fr" }),
  });
  assert.equal(good.status, 200);
  const backup = await (await fetch(url + "/api/backup")).json();
  assert.equal(backup.state.settings.uiLanguage, "fr");
  assert.equal(JSON.stringify(backup).includes("never-export-this"), false);
  assert.equal((await fetch(url + "/server/ai.mjs")).status, 404);
  assert.equal((await fetch(url + "/.env")).status, 404);
  assert.match(
    response.headers.get("content-security-policy"),
    /script-src 'self'/,
  );
});
test("backup preview, confirmation, automatic safety copy and invalid import rollback", async (t) => {
  const { url, store, service } = await app(t);
  const { token } = await (await fetch(url + "/api/state")).json();
  const headers = {
    "Content-Type": "application/json",
    "X-Local-Token": token,
  };
  const old = store.export();
  service.settings({ uiLanguage: "en" });
  const preview = await fetch(url + "/api/backup/preview", {
    method: "POST",
    headers,
    body: JSON.stringify({ backup: old }),
  });
  assert.equal(preview.status, 200);
  const unconfirmed = await fetch(url + "/api/backup/import", {
    method: "POST",
    headers,
    body: JSON.stringify({ backup: old }),
  });
  assert.equal(unconfirmed.status, 400);
  assert.equal(store.read().settings.uiLanguage, "en");
  const confirmed = await fetch(url + "/api/backup/import", {
    method: "POST",
    headers,
    body: JSON.stringify({ backup: old, confirm: true }),
  });
  assert.equal(confirmed.status, 200);
  assert.match((await confirmed.json()).backupPath, /before-import/);
  assert.equal(store.read().settings.uiLanguage, "system");
  old.state.questions = [{ id: "broken" }];
  const invalid = await fetch(url + "/api/backup/import", {
    method: "POST",
    headers,
    body: JSON.stringify({ backup: old, confirm: true }),
  });
  assert.equal(invalid.status, 400);
  assert.equal(store.read().settings.uiLanguage, "system");
});
