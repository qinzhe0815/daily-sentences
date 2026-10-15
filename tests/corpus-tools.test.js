import test from "node:test";
import assert from "node:assert/strict";
const tools = await import("../scripts/corpus-tools.mjs").catch(() => ({}));
const sentence = (id, lang, text, extra = {}) => ({
  id,
  lang,
  text,
  owner: "contributor",
  license: "CC BY 2.0 FR",
  is_unapproved: false,
  script: lang === "cmn" ? "Hans" : null,
  ...extra,
});
const pair = () => [
  sentence(1, "eng", "Please open the window."),
  sentence(2, "cmn", "请打开窗户。", { is_direct: true }),
];
test("source screening checks both licenses, owners, approval, scripts, privacy and direct links", () => {
  assert.equal(typeof tools.screenPair, "function");
  assert.equal(tools.screenPair(...pair()), null);
  for (const [side, patch, reason] of [
    [0, { license: "PROBLEM" }, "license"],
    [1, { owner: null }, "owner"],
    [1, { is_unapproved: true }, "unapproved"],
    [1, { is_direct: false }, "indirect"],
    [0, { text: "请打开窗户。" }, "language"],
    [1, { text: "联系我 test@example.com。" }, "privacy"],
    [0, { text: "<script>alert(1)</script>" }, "content"],
  ]) {
    const p = pair();
    p[side] = { ...p[side], ...patch };
    assert.equal(tools.screenPair(...p), reason);
  }
});
test("comparison normalizes unicode and punctuation, detects near duplicate families", () => {
  assert.equal(typeof tools.normalize, "function");
  assert.equal(
    tools.normalize(" Ｈello, WORLD! "),
    tools.normalize("Hello world."),
  );
  assert.ok(
    tools.similarity(
      "I would like a cup of coffee.",
      "I would like a cup of tea.",
    ) > 0.65,
  );
  assert.ok(
    tools.similarity("The train is late.", "Please open the window.") < 0.4,
  );
});
test("collection URLs constrain official direct translations and persist complete metadata", () => {
  assert.equal(typeof tools.collectionURL, "function");
  const u = new URL(tools.collectionURL("fra", "cmn", "8-12"));
  assert.equal(u.origin, "https://api.tatoeba.org");
  assert.equal(u.searchParams.get("trans:is_direct"), "yes");
  assert.equal(u.searchParams.get("showtrans"), "matching");
  assert.equal(u.searchParams.get("trans:is_unapproved"), "no");
  assert.equal(u.searchParams.get("is_orphan"), "no");
});
