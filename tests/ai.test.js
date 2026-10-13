import test from "node:test";
import assert from "node:assert/strict";
import { validateAI, AI } from "../server/ai.mjs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const grade = {
  valid: true,
  overall: "Accurate.",
  strength: "Good.",
  issues: [],
  references: ["A translation"],
  dimensions: { meaning: 100, grammar: 100, vocabulary: 100, naturalness: 100 },
  total: 100,
};
test("feedback accepts alternate full marks and rejects invalid scores, contradictions and missing sections", () => {
  assert.equal(validateAI("grade", grade).total, 100);
  assert.throws(() => validateAI("grade", { ...grade, total: 50 }), {
    code: "AI_FORMAT",
  });
  assert.throws(
    () =>
      validateAI("grade", {
        ...grade,
        dimensions: { ...grade.dimensions, grammar: 101 },
      }),
    { code: "AI_FORMAT" },
  );
  assert.throws(
    () =>
      validateAI("grade", {
        ...grade,
        issues: [
          {
            quote: "not",
            kind: "error",
            category: "meaning",
            severity: "major",
            explanation: "Negation reversed.",
            suggestion: "not",
          },
        ],
      }),
    { code: "AI_FORMAT" },
  );
  assert.throws(() => validateAI("grade", { ...grade, references: [] }), {
    code: "AI_FORMAT",
  });
  assert.equal(
    validateAI("grade", {
      ...grade,
      valid: false,
      total: null,
      dimensions: null,
    }).total,
    null,
  );
});
test("AI credentials stay in server config; local mode rejects remote addresses", () => {
  const dir = mkdtempSync(join(tmpdir(), "daily-ai-"));
  const ai = new AI(dir);
  ai.save({
    provider: "online",
    baseUrl: "https://example.com/v1",
    model: "m",
    apiKey: "secret",
  });
  assert.equal(JSON.stringify(ai.status()).includes("secret"), false);
  assert.equal(ai.status().hasKey, true);
  assert.throws(
    () =>
      ai.save({
        provider: "local",
        baseUrl: "https://example.com",
        model: "m",
      }),
    { code: "LOCAL_ONLY" },
  );
  ai.save({
    provider: "local",
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen3.5:2b",
  });
  assert.equal(ai.status().hasKey, false);
  rmSync(dir, { recursive: true, force: true });
});
test("switching local/cloud preserves cloud config, but never reuses a key for a new endpoint", () => {
  const dir = mkdtempSync(join(tmpdir(), "daily-profiles-"));
  const ai = new AI(dir);
  ai.save({
    provider: "online",
    baseUrl: "https://one.example/v1",
    model: "cloud",
    apiKey: "keep-private",
  });
  ai.save({
    provider: "local",
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen3.5:2b",
  });
  ai.save({
    provider: "online",
    baseUrl: "https://one.example/v1",
    model: "cloud",
  });
  assert.equal(ai.status().hasKey, true);
  ai.save({
    provider: "online",
    baseUrl: "https://two.example/v1",
    model: "other",
  });
  assert.equal(ai.status().hasKey, false);
  assert.equal(JSON.stringify(ai.status()).includes("keep-private"), false);
  rmSync(dir, { recursive: true, force: true });
});

// Schema constraints prevent a small local model from answering in Chinese
// when English/French prose is requested. Translation quotes remain unrestricted.
test("schema constrains explanation language without constraining source quotes", async () => {
  const { outputSchema } = await import("../server/prompts.mjs");
  const schema = outputSchema("grade", {
    question: { snapshot: { source: "en", target: "zh" } },
  });
  const pattern = new RegExp(schema.properties.overall.pattern);
  assert.equal(
    pattern.test("Your translation preserves the original meaning."),
    true,
  );
  assert.equal(pattern.test("译文准确。"), false);
  assert.equal(
    schema.properties.issues.items.properties.quote.pattern,
    undefined,
  );
  assert.equal(
    schema.properties.issues.items.properties.quote.description,
    undefined,
  );
  assert.equal(schema.properties.references.items.pattern, undefined);
});

test("a one-character Chinese correction is accepted without a repair request", async () => {
  const { looksLikeLanguage } = await import("../server/ai.mjs");
  assert.equal(looksLikeLanguage("去", "zh", 1), true);
  let requests = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    requests++;
    return new Response(
      JSON.stringify({
        message: {
          content: JSON.stringify({
            ...grade,
            overall: "The verb changes the direction of movement.",
            references: ["我会去。"],
            dimensions: {
              meaning: 70,
              grammar: 100,
              vocabulary: 80,
              naturalness: 90,
            },
            total: 82,
            issues: [
              {
                quote: "来",
                kind: "error",
                category: "meaning",
                severity: "minor",
                explanation: "Use the verb for moving away.",
                suggestion: "去",
              },
            ],
          }),
        },
      }),
    );
  };
  try {
    const ai = new AI("/tmp", {
      provider: "local",
      baseUrl: "http://127.0.0.1:11434",
      model: "test",
    });
    await ai.call("grade", {
      question: {
        source: "I will go.",
        context: "",
        snapshot: { source: "en", target: "zh" },
      },
      answer: "我会来。",
    });
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a reversed translation must not be published as an invalid unscored sample", () => {
  assert.throws(
    () =>
      validateAI("grade", {
        ...grade,
        valid: false,
        total: null,
        dimensions: null,
        issues: [
          {
            quote: "went",
            kind: "error",
            category: "meaning",
            severity: "major",
            explanation: "Negation was reversed.",
            suggestion: "did not go",
          },
        ],
      }),
    { code: "AI_FORMAT" },
  );
});
