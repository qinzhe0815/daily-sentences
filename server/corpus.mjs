import { readFileSync } from "node:fs";
import { normalize } from "../scripts/corpus-tools.mjs";
// Exact aliases only. Unknown user scenes deliberately go to the model.
export const SCENE_ALIASES = {
  daily: [
    "日常交流",
    "日常生活",
    "Daily life",
    "Everyday life",
    "Vie quotidienne",
  ],
  work: [
    "职场沟通",
    "工作沟通",
    "Work communication",
    "Communication professionnelle",
  ],
  travel: ["旅行", "旅行出行", "Travel", "Voyage", "Voyages"],
  study: [
    "学习",
    "学校生活",
    "学习校园",
    "Study",
    "School life",
    "Study & campus",
    "Vie scolaire",
    "Études",
  ],
  food: ["餐饮购物", "Food & shopping", "Repas et achats"],
  abroad: ["海外生活", "Living abroad", "Vie à l’étranger"],
  ideas: ["观点表达", "Expressing opinions", "Exprimer des opinions"],
  society: ["社会话题", "Society", "Société"],
};
export class Corpus {
  constructor(
    data = JSON.parse(
      readFileSync(new URL("../corpus/tasks.json", import.meta.url), "utf8"),
    ),
  ) {
    this.version = data.version;
    this.tasks = data.tasks;
  }
  select({ config, purpose, seen }) {
    if (!["practice", "diagnostic"].includes(purpose)) return null;
    const scene = config.scene.trim();
    const sceneKey = scene
      ? Object.keys(SCENE_ALIASES).find((key) =>
          SCENE_ALIASES[key].some(
            (alias) => alias.toLocaleLowerCase() === scene.toLocaleLowerCase(),
          ),
        )
      : null;
    if (scene && !sceneKey) return null;
    const families = new Set(
      seen.map((q) => q.metadata?.groupId).filter(Boolean),
    );
    const texts = new Set(
      seen
        .filter((q) => q.snapshot?.source === config.source)
        .map((q) => normalize(q.source)),
    );
    const candidates = this.tasks.filter(
      (t) =>
        t.split === purpose &&
        t.sourceLang === config.source &&
        t.targetLang === config.target &&
        t.level === config.level &&
        t.roles.includes(config.role) &&
        (!sceneKey || t.scene === sceneKey) &&
        !families.has(t.groupId) &&
        !texts.has(normalize(t.source)),
    );
    if (!candidates.length) return null;
    const t = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      source: t.source,
      context: t.context,
      reference: t.references[0],
      knowledge: structuredClone(t.knowledge),
      rubric: {
        references: structuredClone(t.references),
        requiredMeaning: structuredClone(t.requiredMeaning),
      },
      provenance: structuredClone(t.provenance),
      metadata: {
        provider: "corpus",
        model: "Tatoeba",
        corpusVersion: this.version,
        taskId: t.id,
        groupId: t.groupId,
        split: t.split,
        reviewStatus: t.review.status,
        levelStatus: "provisional",
      },
    };
  }
}
