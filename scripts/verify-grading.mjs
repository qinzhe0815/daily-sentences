// Synthetic grading cases, independent of the model's generated references.
import { AI } from "../server/ai.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const model = process.env.VERIFY_MODEL || "qwen3.5:4b-q4_K_M";
const ai = new AI("data", {
  provider: "local",
  baseUrl: "http://127.0.0.1:11434",
  model,
  timeoutMs: 180000,
});
const cases = [
  {
    name: "correct paraphrase",
    source: "我昨天没有去办公室，而是在家工作。",
    target: "en",
    answer: "I didn't go to the office yesterday; I worked from home instead.",
    expected: "Accept meaning, no major error.",
  },
  {
    name: "negation reversed",
    source: "我昨天没有去办公室，而是在家工作。",
    target: "en",
    answer: "I went to the office yesterday instead of working from home.",
    expected: "Identify reversal, substantially lower meaning.",
  },
  {
    name: "regional variant",
    source: "我喜欢这件蓝色毛衣的颜色。",
    target: "en",
    answer: "I like the colour of this blue jumper.",
    expected: "Accept British spelling and vocabulary.",
  },
  {
    name: "wrong tense",
    source: "我昨天完成了这份报告。",
    target: "en",
    answer: "I will finish this report tomorrow.",
    expected: "Identify time and tense change.",
  },
  {
    name: "French politeness",
    source: "请给我一杯水。",
    target: "fr",
    answer: "Pourriez-vous m'apporter un verre d'eau, s'il vous plaît ?",
    expected: "Accept polite equivalent without major meaning penalty.",
  },
  {
    name: "Chinese equivalent",
    source: "Could you close the window, please?",
    sourceLanguage: "en",
    target: "zh",
    answer: "麻烦把窗户关一下，好吗？",
    expected: "Accept natural equivalent and explain in English.",
  },
];
const report = {
  at: new Date().toISOString(),
  model,
  note: "Synthetic content checks; not an independent human language-quality certification.",
  samples: [],
};
for (const c of cases) {
  const start = Date.now(),
    sample = { ...c };
  try {
    sample.feedback = await ai.call("grade", {
      question: {
        source: c.source,
        context: "",
        snapshot: {
          source: c.sourceLanguage || "zh",
          target: c.target,
          role: "daily",
          level: 2,
        },
      },
      answer: c.answer,
    });
    sample.ok = true;
  } catch (e) {
    sample.ok = false;
    sample.error = e.code || e.message;
  }
  sample.elapsedMs = Date.now() - start;
  report.samples.push(sample);
  mkdirSync("docs/validation", { recursive: true });
  writeFileSync(
    "docs/validation/grading-cases.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    sample.name + ": " + (sample.ok ? sample.feedback.total : sample.error),
  );
}
process.exitCode = report.samples.every((s) => s.ok) ? 0 : 1;
