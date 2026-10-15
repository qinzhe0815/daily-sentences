import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../server/model.mjs";
import { shell, esc, newForm, editForm } from "../public/views.js";
import { catalog, setLanguage, errorMessage } from "../public/i18n.js";
import { Dictation } from "../public/speech.js";
globalThis.document = { documentElement: { lang: "zh" } };
test("practice settings offer automatic, local and AI sources with legacy default", () => {
  setLanguage("zh");
  const c = { id: "source-chat", title: "", config: { source: "zh", target: "en", role: "daily", level: 2, mode: "fixed", scene: "" } };
  let html = editForm(c, initialState());
  assert.match(html, /name="questionSource"/);
  assert.match(html, /value="auto" selected[^>]*>默认／自动选择/);
  for (const value of ["local", "ai"]) {
    c.config.questionSource = value;
    html = editForm(c, initialState());
    assert.match(html, new RegExp(`value="${value}" selected`));
  }
  assert.match(errorMessage("CORPUS_EMPTY"), /本地题库/);
});
Object.defineProperty(globalThis, "navigator", {
  value: { language: "fr-FR" },
  configurable: true,
});
test("all UI catalog keys have three translations; interface follows system and remains independent", () => {
  for (const [key, values] of Object.entries(catalog)) {
    assert.equal(values.length, 3, key);
    assert.ok(
      values.every((v) => typeof v === "string" && v.trim()),
      key,
    );
  }
  setLanguage("system");
  assert.equal(document.documentElement.lang, "fr");
  assert.match(errorMessage("AI_AUTH"), /authentification/);
  setLanguage("zh");
  assert.equal(document.documentElement.lang, "zh");
});
test("AI and learner content is escaped; review hides old attempts and references until submit", () => {
  const state = initialState(),
    c = {
      id: "c",
      title: "",
      config: {
        source: "zh",
        target: "en",
        role: "daily",
        mode: "auto",
        level: 2,
        scene: "",
      },
      currentQuestionId: "q",
      window: [],
      adjustments: [],
      generationStatus: "completed",
    };
  state.conversations.push(c);
  state.questions.push({
    id: "q",
    conversationId: "c",
    source: "<script>alert(1)</script>",
    context: "",
    knowledge: ["SECRET-HINT"],
    snapshot: c.config,
    drafts: { answer: "", followup: "" },
    followups: [],
    attempts: [
      {
        id: "a",
        kind: "first",
        status: "completed",
        answer: "SECRET-ANSWER",
        createdAt: new Date().toISOString(),
        feedback: {
          valid: true,
          overall: "Fine",
          strength: "",
          issues: [],
          references: ["SECRET-REFERENCE"],
          total: 100,
          dimensions: {
            meaning: 100,
            grammar: 100,
            vocabulary: 100,
            naturalness: 100,
          },
          metadata: {},
        },
      },
    ],
  });
  const ctx = {
    state,
    ui: {
      page: "practice",
      cid: "c",
      viewQid: "q",
      review: "q",
      composerMode: {},
      relatedAttempt: {},
    },
    ai: { provider: "local" },
    speech: {},
    draft: () => "",
  };
  const view = shell(ctx);
  assert.equal(view.includes("SECRET-ANSWER"), false);
  assert.equal(view.includes("SECRET-REFERENCE"), false);
  assert.equal(view.includes("SECRET-HINT"), false);
  assert.equal(view.includes("<script>"), false);
  assert.match(view, /&lt;script&gt;/);
  assert.equal(esc('"<&'), "&quot;&lt;&amp;");
});
test("dictation language, cancel preservation, append and undo across all target languages", () => {
  class Recognition {
    start() {}
    stop() {
      this.onend();
    }
    abort() {
      this.onend();
    }
  }
  globalThis.window = { SpeechRecognition: Recognition };
  let value = "Existing draft";
  const d = new Dictation({
    getDraft: () => value,
    setDraft: (_, __, text) => {
      value = text;
    },
    onChange: () => {},
  });
  for (const [lang, locale] of Object.entries({
    zh: "zh-CN",
    en: "en-US",
    fr: "fr-FR",
  })) {
    d.start("q", lang);
    assert.equal(d.recognition.lang, locale);
    d.cancel();
    assert.equal(value, "Existing draft");
  }
  d.start("q", "en");
  d.recognition.onresult({
    resultIndex: 0,
    results: [Object.assign([{ transcript: "New words" }], { isFinal: true })],
  });
  d.stop();
  assert.equal(value, "Existing draft New words");
  d.undo();
  assert.equal(value, "Existing draft");
  window.SpeechRecognition = null;
  d.start("q", "fr");
  assert.equal(d.message, "voiceUnsupported");
  assert.equal(value, "Existing draft");
});
test("late recognition end cannot append a new session’s words to the old question", () => {
  class DelayedRecognition {
    start() {}
    stop() {}
    abort() {}
  }
  window.SpeechRecognition = DelayedRecognition;
  const drafts = { a: "Draft A", b: "Draft B" };
  const d = new Dictation({
    getDraft: (qid) => drafts[qid],
    setDraft: (qid, _, v) => {
      drafts[qid] = v;
    },
    onChange: () => {},
  });
  d.start("a", "en");
  const a = d.recognition;
  d.stop();
  d.start("b", "fr");
  const b = d.recognition;
  b.onresult({
    resultIndex: 0,
    results: [Object.assign([{ transcript: "Bonjour" }], { isFinal: true })],
  });
  a.onend();
  assert.equal(drafts.a, "Draft A");
  assert.equal(d.recognition, b);
  b.onend();
  assert.equal(drafts.b, "Draft B Bonjour");
});

test("every new conversation offers diagnosis or skip for all directions, with or without a saved profile", () => {
  for (const language of ["zh", "en", "fr"]) {
    setLanguage(language);
    for (const source of ["zh", "en", "fr"])
      for (const target of ["zh", "en", "fr"]) {
        if (source === target) continue;
        for (const hasProfile of [false, true]) {
          const state = initialState();
          state.settings.source = source;
          state.settings.target = target;
          if (hasProfile) state.profiles[target] = { level: 4 };
          const html = newForm(state);
          const choice = html.match(/<div id="assessment-choice"[^>]*>/)?.[0];
          assert.ok(choice);
          assert.doesNotMatch(
            choice,
            /hidden/,
            `${source} → ${target}, profile=${hasProfile}`,
          );
          assert.match(html, /name="assessment" value="diagnostic" checked/);
          assert.match(html, /name="assessment" value="skip"/);
          assert.match(
            html,
            new RegExp(`<option value="${hasProfile ? 4 : 2}" selected>`),
          );
        }
      }
  }
  setLanguage("zh");
});

test("corpus source is localized; attribution links appear only after reveal and never accept unsafe URLs", async () => {
  const { questionSource } = await import("../public/views.js");
  assert.equal(typeof questionSource, "function");
  const q = {
    metadata: { provider: "corpus" },
    provenance: [
      {
        sentenceId: 123,
        author: "<author>",
        license: "CC BY 2.0 FR",
        url: "javascript:alert(1)",
        licenseUrl: "javascript:alert(2)",
      },
    ],
  };
  for (const lang of ["zh", "en", "fr"]) {
    setLanguage(lang);
    const hidden = questionSource(q, false);
    assert.doesNotMatch(hidden, /sentences\/show|&lt;author&gt;/);
    const shown = questionSource(q, true);
    assert.match(shown, /https:\/\/tatoeba.org\/en\/sentences\/show\/123/);
    assert.match(shown, /&lt;author&gt;/);
    assert.doesNotMatch(shown, /javascript:/);
  }
  setLanguage("zh");
  assert.match(questionSource(q, false), /本地语料/);
  assert.match(questionSource({ metadata: { provider: "local" } }, true), /AI/);
});

test("completed diagnostic results render both sentence attributions", () => {
  const state = initialState();
  const config = {
    source: "zh",
    target: "en",
    role: "daily",
    level: 2,
    mode: "fixed",
    scene: "",
  };
  state.conversations.push({
    id: "c",
    title: "",
    config,
    currentQuestionId: null,
    activeDiagnosticId: "d",
    window: [],
    adjustments: [],
    generationStatus: "completed",
  });
  state.diagnostics.push({
    id: "d",
    status: "completed",
    config,
    questionIds: ["q"],
    result: { level: 2, reason: "练习估计" },
  });
  state.questions.push({
    id: "q",
    conversationId: "c",
    diagnosticId: "d",
    source: "测试句子。",
    context: "",
    snapshot: config,
    knowledge: [],
    metadata: { provider: "corpus" },
    provenance: [
      { sentenceId: 123, author: "SOURCE-AUTHOR", license: "CC BY 2.0 FR" },
      { sentenceId: 456, author: "TARGET-AUTHOR", license: "CC BY 2.0 FR" },
    ],
    attempts: [],
    followups: [],
    drafts: { answer: "", followup: "" },
  });
  const html = shell({
    state,
    ui: { page: "practice", cid: "c", composerMode: {}, relatedAttempt: {} },
    ai: { provider: "local" },
    speech: {},
    draft: () => "",
  });
  assert.match(html, /SOURCE-AUTHOR/);
  assert.match(html, /TARGET-AUTHOR/);
  assert.match(html, /sentences\/show\/456/);
});

test("source badge distinguishes recorded human acceptance from pending AI curation", async () => {
  const { questionSource } = await import("../public/views.js");
  setLanguage("zh");
  assert.match(
    questionSource(
      { metadata: { provider: "corpus", reviewStatus: "human-reviewed" } },
      false,
    ),
    /独立人工审核通过/,
  );
  assert.match(
    questionSource(
      { metadata: { provider: "corpus", reviewStatus: "ai-reviewed" } },
      false,
    ),
    /独立人工审核待完成/,
  );
});

test("user acceptance badge states its basis instead of claiming independent review", async () => {
  const { questionSource } = await import("../public/views.js");
  setLanguage("zh");
  const html = questionSource(
    { metadata: { provider: "corpus", reviewStatus: "user-accepted" } },
    false,
  );
  assert.match(html, /按用户要求视为人工检查通过/);
  assert.doesNotMatch(html, /独立人工审核通过/);
});
