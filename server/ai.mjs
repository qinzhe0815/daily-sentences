import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { AppError, ensure, text } from "./model.mjs";
import { taskPrompt, outputSchema } from "./prompts.mjs";
export const RULE_VERSION = "translation-v6";
export function validateAI(task, o) {
  ensure(o && typeof o === "object" && !Array.isArray(o), "AI_FORMAT", 502);
  const str = (v, max = 10000, empty = false) => {
    try {
      return text(v, max, empty);
    } catch {
      throw new AppError("AI_FORMAT", 502);
    }
  };
  if (task === "generate") {
    return {
      source: str(o.source, 3000),
      context: str(o.context ?? "", 3000, true),
      reference: str(o.reference, 4000),
      knowledge:
        Array.isArray(o.knowledge) && o.knowledge.length <= 12
          ? o.knowledge.map((k) => str(k, 300))
          : [],
    };
  }
  if (task === "grade") {
    ensure(
      typeof o.valid === "boolean" &&
        Array.isArray(o.issues) &&
        o.issues.length <= 30 &&
        Array.isArray(o.references) &&
        o.references.length > 0 &&
        o.references.length <= 5,
      "AI_FORMAT",
      502,
    );
    ensure(
      typeof o.overall === "string" && !/^\s*\d+[.%]?\s*$/.test(o.overall),
      "AI_FORMAT",
      502,
    );
    const r = {
      valid: o.valid,
      overall: str(o.overall),
      strength: str(o.strength ?? "", 3000, true),
      issues: o.issues.map((i) => {
        ensure(
          ["error", "polish"].includes(i.kind) &&
            ["meaning", "grammar", "vocabulary", "register", "style"].includes(
              i.category,
            ) &&
            ["major", "minor"].includes(i.severity),
          "AI_FORMAT",
          502,
        );
        return {
          quote: str(i.quote, 3000, true),
          kind: i.kind,
          category: i.category,
          severity: i.severity,
          explanation: str(i.explanation),
          suggestion: str(i.suggestion, 4000),
        };
      }),
      references: o.references.map((v) => str(v, 4000)),
      dimensions: null,
      total: null,
    };
    if (o.valid) {
      ensure(
        o.dimensions && typeof o.total === "number" && Number.isFinite(o.total),
        "AI_FORMAT",
        502,
      );
      for (const k of ["meaning", "grammar", "vocabulary", "naturalness"])
        ensure(
          typeof o.dimensions[k] === "number" &&
            Number.isFinite(o.dimensions[k]) &&
            o.dimensions[k] >= 0 &&
            o.dimensions[k] <= 100,
          "AI_FORMAT",
          502,
        );
      const d = o.dimensions,
        total = Math.round(
          d.meaning * 0.4 +
            d.grammar * 0.25 +
            d.vocabulary * 0.2 +
            d.naturalness * 0.15,
        );
      ensure(
        o.total >= 0 && o.total <= 100 && Math.abs(total - o.total) <= 2,
        "AI_FORMAT",
        502,
      );
      ensure(
        !r.issues.some(
          (i) =>
            i.kind === "error" &&
            i.category === "meaning" &&
            i.severity === "major" &&
            d.meaning > 75,
        ),
        "AI_FORMAT",
        502,
      );
      r.dimensions = {
        meaning: d.meaning,
        grammar: d.grammar,
        vocabulary: d.vocabulary,
        naturalness: d.naturalness,
      };
      r.total = total;
    } else {
      ensure(o.total === null && o.dimensions === null, "AI_FORMAT", 502);
      // A meaningful translation error needs a score; it is not unrelated text.
      ensure(
        !r.issues.some(
          (i) =>
            i.kind === "error" &&
            i.category === "meaning" &&
            i.severity === "major",
        ),
        "AI_FORMAT",
        502,
      );
    }
    return r;
  }
  if (task === "followup") return { answer: str(o.answer) };
  if (task === "diagnose") {
    ensure(
      Number.isInteger(o.level) && o.level >= 1 && o.level <= 5,
      "AI_FORMAT",
      502,
    );
    return { level: o.level, reason: str(o.reason, 3000) };
  }
  ensure(o.ok === true, "AI_FORMAT", 502);
  return { ok: true };
}
export function looksLikeLanguage(value, language, minimumHan = 2) {
  const han = (value.match(/\p{Script=Han}/gu) || []).length;
  if (language === "zh") return han >= minimumHan;
  if (han > 2) return false;
  const words = value.toLowerCase().match(/[a-zàâçéèêëîïôùûüÿœ']+/g) || [];
  const en = new Set([
    "the",
    "is",
    "are",
    "was",
    "were",
    "this",
    "that",
    "with",
    "your",
    "you",
    "translation",
    "correct",
    "meaning",
    "and",
    "should",
    "would",
    "could",
    "to",
    "in",
  ]);
  const fr = new Set([
    "le",
    "la",
    "les",
    "une",
    "des",
    "est",
    "sont",
    "cette",
    "avec",
    "vous",
    "votre",
    "mais",
    "dans",
    "pour",
    "qui",
    "il",
    "elle",
    "nous",
    "je",
    "traduction",
  ]);
  const a = words.filter((w) => en.has(w)).length,
    b = words.filter((w) => fr.has(w)).length;
  return language === "en" ? b < a + 3 : a < b + 3;
}
export class AI {
  constructor(directory, override) {
    this.file = join(directory, "ai-config.json");
    this.config =
      override ??
      (existsSync(this.file)
        ? JSON.parse(readFileSync(this.file, "utf8"))
        : {
            provider: process.env.AI_PROVIDER || "local",
            baseUrl: process.env.AI_BASE_URL || "http://127.0.0.1:11434",
            model: process.env.AI_MODEL || "qwen3.5:4b-q4_K_M",
            apiKey: process.env.AI_API_KEY || "",
            timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 180000,
          });
  }
  status() {
    const { provider, baseUrl, model } = this.config;
    const online =
      this.config.onlineProfile || (provider === "online" ? this.config : null);
    return {
      provider,
      baseUrl,
      model,
      onlineProfile: online
        ? {
            baseUrl: online.baseUrl,
            model: online.model,
            hasKey: !!online.apiKey,
          }
        : null,
      hasKey: !!this.config.apiKey,
      configured:
        !!model && !!baseUrl && (provider === "local" || !!this.config.apiKey),
      timeoutMs: this.config.timeoutMs || 60000,
    };
  }
  save(input) {
    ensure(["local", "online"].includes(input.provider), "INVALID_INPUT");
    const baseUrl = text(input.baseUrl, 1000).replace(/\/+$/, "");
    let url;
    try {
      url = new URL(baseUrl);
    } catch {
      throw new AppError("INVALID_URL");
    }
    ensure(
      ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash,
      "INVALID_URL",
    );
    if (input.provider === "local")
      ensure(
        ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname),
        "LOCAL_ONLY",
      );
    const previousOnline =
      this.config.provider === "online"
        ? this.config
        : this.config.onlineProfile;
    const apiKey =
      input.provider === "local"
        ? ""
        : input.apiKey === undefined
          ? previousOnline?.baseUrl === baseUrl
            ? previousOnline.apiKey
            : ""
          : text(input.apiKey, 2000, true);
    const config = {
      provider: input.provider,
      baseUrl,
      model: text(input.model, 200),
      apiKey,
      onlineProfile:
        input.provider === "online"
          ? { baseUrl, model: text(input.model, 200), apiKey }
          : previousOnline
            ? {
                baseUrl: previousOnline.baseUrl,
                model: previousOnline.model,
                apiKey: previousOnline.apiKey,
              }
            : null,
      timeoutMs: input.provider === "local" ? 180000 : 60000,
    };
    writeFileSync(this.file + ".tmp", JSON.stringify(config), { mode: 0o600 });
    renameSync(this.file + ".tmp", this.file);
    this.config = config;
    return this.status();
  }
  async call(task, input, repair = false) {
    const c = structuredClone(this.config);
    ensure(
      c.model && c.baseUrl && (c.provider === "local" || c.apiKey),
      "AI_NOT_CONFIGURED",
      503,
    );
    const prompt = taskPrompt(task, input);
    if (repair)
      prompt.system +=
        "\n上一轮输出未通过结构或语言校验。错误时态、否定反转和严重误译仍是有效翻译尝试，必须 valid=true 并降低分数；valid=false 仅限答非所问或错误输出语言。重新生成完整结果，严格按 schema 字段填写。原句/背景用 source language，所有整体判断和解释用 source language，参考译文和修改后的短语只用 target language。overall 必须是一段判断文字，不是分数。";
    const messages = [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ];
    const local = c.provider === "local";
    const root = c.baseUrl
      .replace(/\/+$/, "")
      .replace(local ? /\/v1$/ : /$^/, "");
    const url = local ? root + "/api/chat" : root + "/chat/completions";
    const payload = local
      ? {
          model: c.model,
          messages,
          stream: false,
          format: outputSchema(task, input),
          think: false,
          options: {
            temperature: task === "generate" ? 0.75 : 0.2,
            num_ctx: 8192,
            num_predict: 2500,
          },
        }
      : {
          model: c.model,
          messages,
          response_format: { type: "json_object" },
          stream: false,
        };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(!local && c.apiKey
            ? { Authorization: `Bearer ${c.apiKey}` }
            : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(c.timeoutMs || 60000),
      });
      if (!response.ok) {
        const code =
          response.status === 401 || response.status === 403
            ? "AI_AUTH"
            : response.status === 402
              ? "AI_QUOTA"
              : response.status === 429
                ? "AI_RATE_LIMIT"
                : response.status === 404 && local
                  ? "MODEL_MISSING"
                  : "AI_SERVICE";
        throw new AppError(code, 502);
      }
      const body = await response.json();
      let content = local
        ? body.message?.content
        : body.choices?.[0]?.message?.content;
      ensure(
        typeof content === "string" && content.length < 100000,
        "AI_FORMAT",
        502,
      );
      content = content
        .trim()
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```$/, "");
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new AppError("AI_FORMAT", 502);
      }
      if (task === "grade" && parsed.valid === false) {
        parsed.total = null;
        parsed.dimensions = null;
      } else if (
        task === "grade" &&
        parsed.total === undefined &&
        parsed.dimensions
      ) {
        const d = parsed.dimensions;
        parsed.total = Math.round(
          d.meaning * 0.4 +
            d.grammar * 0.25 +
            d.vocabulary * 0.2 +
            d.naturalness * 0.15,
        );
      }
      const result = validateAI(task, parsed);
      const config = input.config || input.question?.snapshot;
      if (config && task === "generate") {
        ensure(
          looksLikeLanguage(result.source, config.source) &&
            looksLikeLanguage(result.reference, config.target),
          "AI_LANGUAGE",
          502,
        );
      }
      if (config && task === "grade") {
        ensure(
          looksLikeLanguage(result.overall, config.source) &&
            result.issues.every(
              (i) =>
                looksLikeLanguage(i.explanation, config.source) &&
                looksLikeLanguage(i.suggestion, config.target, 1),
            ) &&
            result.references.every((r) => looksLikeLanguage(r, config.target)),
          "AI_LANGUAGE",
          502,
        );
      }
      return {
        ...result,
        metadata: {
          model: c.model,
          provider: c.provider,
          promptVersion: RULE_VERSION,
          scoringVersion: "40-25-20-15-v1",
        },
      };
    } catch (e) {
      if (e instanceof AppError) {
        if (local && !repair && ["AI_FORMAT", "AI_LANGUAGE"].includes(e.code))
          return this.call(task, input, true);
        throw e;
      }
      throw new AppError(
        e.name === "TimeoutError" || e.name === "AbortError"
          ? "AI_TIMEOUT"
          : "AI_NETWORK",
        502,
      );
    }
  }
  async models() {
    ensure(this.config.provider === "local", "LOCAL_ONLY");
    try {
      const r = await fetch(
        this.config.baseUrl.replace(/\/v1\/?$/, "").replace(/\/$/, "") +
          "/api/tags",
        { signal: AbortSignal.timeout(3000) },
      );
      ensure(r.ok, "AI_SERVICE", 502);
      const b = await r.json();
      return (b.models || []).map((m) => ({ name: m.name, size: m.size }));
    } catch (e) {
      throw e instanceof AppError ? e : new AppError("AI_NETWORK", 502);
    }
  }
}
