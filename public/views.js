import {
  t,
  pick,
  language,
  langName,
  roleName,
  roleLabels,
  levelName,
  levelLabels,
  scenes,
  errorMessage,
} from "./i18n.js";
export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  plus: "M12 5v14M5 12h14",
  chat: "M21 11a8 8 0 0 1-8 8H7l-5 3 1-6a8 8 0 1 1 18-5Z",
  book: "M5 4h14v17l-7-4-7 4Z",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  swap: "M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4",
  check: "m5 12 4 4L19 6",
  mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0ZM5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  history: "M3 11a9 9 0 1 1 3 8M3 4v7h7m2-4v6l4 2",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  upload: "M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5",
  edit: "m14 5 5 5M4 20l5-1L21 7l-5-5L4 14Z",
  leaf: "M4 20C3 6 10 3 21 3c0 12-3 19-15 16M4 20 15 9",
  chevron: "m9 5 7 7-7 7",
};
export const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.spark}"/></svg>`;
export const button = (action, label, extra = "", cls = "secondary") =>
  `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
const option = (v, label, selected) =>
  `<option value="${esc(v)}" ${v === selected ? "selected" : ""}>${esc(label)}</option>`;
export const langOptions = (v) =>
  ["zh", "en", "fr"].map((l) => option(l, langName(l), v)).join("");
export const levelOptions = (v) =>
  [1, 2, 3, 4, 5]
    .map((l) => option(String(l), `L${l} · ${levelName(l)}`, String(v)))
    .join("");
const roleOptions = (v) =>
  Object.keys(roleLabels)
    .map((r) => option(r, roleName(r), v))
    .join("");
export const chatTitle = (c) =>
  c.title ||
  `${roleName(c.config.role)} · ${langName(c.config.source)} → ${langName(c.config.target)}${c.config.scene ? " · " + c.config.scene : ""}`;
const date = (iso) =>
  iso
    ? new Intl.DateTimeFormat(language, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "";
const field = (label, content, cls = "") =>
  `<label class="field ${cls}"><span>${esc(label)}</span>${content}</label>`;
export const errorBox = (code) =>
  `<div class="notice error" role="alert">${esc(errorMessage(code))}</div>`;
export function directionForm(c, withScene = true) {
  return `<div class="direction-fields">${field(t("source"), `<select name="source" required>${langOptions(c.source)}</select>`)}${button("swap", icon("swap"), `aria-label="${esc(t("source") + " ↔ " + t("target"))}"`, "icon-button swap")}${field(t("target"), `<select name="target" required>${langOptions(c.target)}</select>`)}</div>${field(t("role"), `<select name="role">${roleOptions(c.role)}</select>`)}${
    withScene
      ? field(
          t("scene"),
          `<input name="scene" maxlength="500" list="scenes" value="${esc(c.scene)}" placeholder="${esc(t("scenePlaceholder"))}"><datalist id="scenes">${Object.values(
            scenes,
          )
            .map((s) => `<option value="${esc(pick(s))}"></option>`)
            .join("")}</datalist>`,
        )
      : ""
  }`;
}
export function newForm(state) {
  const c = {
    source: state.settings.source,
    target: state.settings.target,
    role: state.settings.defaultRole,
    scene: "",
    level: state.profiles[state.settings.target]?.level || 2,
  };
  return `<form data-form="new" class="stack"><p class="eyebrow">${esc(t("localSpace"))}</p><h2>${esc(t("setup"))}</h2>${directionForm(c)}<div id="assessment-choice"><label class="choice"><input type="radio" name="assessment" value="diagnostic" checked><span><strong>${esc(t("diagnostic"))}</strong><small>${esc(t("diagnosticInfo"))}</small></span></label><label class="choice"><input type="radio" name="assessment" value="skip"><span>${esc(t("skip"))}</span></label></div>${field(t("level"), `<select name="level">${levelOptions(c.level)}</select>`)}<p class="muted small" id="profile-note">${state.profiles[c.target] ? esc(t("profileExists")) : ""}</p><p class="small muted">${esc(t("examNote"))}</p><button class="primary" type="submit">${esc(t("create"))}${icon("arrow")}</button></form>`;
}
export function editForm(c, state) {
  return `<form data-form="edit" data-cid="${c.id}" class="stack"><h2>${esc(t("editChat"))}</h2><p class="muted">${esc(t("nextOnly"))}</p>${field(t("title"), `<input name="title" value="${esc(c.title)}" maxlength="120" placeholder="${esc(chatTitle(c))}">`)}${directionForm(c.config)}${field(t("level"), `<select name="level">${levelOptions(c.config.level)}</select>`)}${field(t("mode"), `<select name="mode">${option("auto", t("auto"), c.config.mode)}${option("fixed", t("fixed"), c.config.mode)}</select>`)}<p class="small muted">${esc(t("profileRequired"))}</p><button class="primary" type="submit">${esc(t("save"))}</button></form>`;
}
export function shell(ctx) {
  const { state: s, ui, ai } = ctx,
    c = s.conversations.find((c) => c.id === ui.cid);
  const nav = (page, ico) =>
    button(
      "nav",
      `${icon(ico)}<span>${esc(t(page))}</span>`,
      `data-page="${page}"`,
      ui.page === page ? "nav-item active" : "nav-item",
    );
  return `<div class="layout ${ui.drawer ? "drawer-open" : ""}"><aside class="sidebar"><a class="brand" href="/" aria-label="Daily Sentences"><span class="brand-icon">${icon("swap")}</span><span>Daily<span class="brand-light">Sentences</span><small>译 日 · LANGUAGES IN MOTION</small></span></a>${button("new", `${icon("plus")}${esc(t("newChat"))}`, "", "new-chat")}<nav>${nav("practice", "chat")}${nav("favorites", "book")}</nav><div class="sidebar-heading">${esc(t("conversations"))}<span>${s.conversations.length.toString().padStart(2, "0")}</span></div><div class="chat-list">${
    s.conversations.length
      ? s.conversations
          .slice()
          .reverse()
          .map(
            (c) =>
              `<button class="chat-item ${c.id === ui.cid && ui.page === "practice" ? "selected" : ""}" data-action="activate" data-cid="${c.id}"><span class="chat-dot"></span><span><strong>${esc(chatTitle(c))}</strong><small>${esc(c.config.source.toUpperCase() + " → " + c.config.target.toUpperCase())} <span>· L${c.config.level}</span></small></span>${c.generationStatus === "pending" ? '<span class="spinner tiny"></span>' : ""}</button>`,
          )
          .join("")
      : `<p class="empty-sidebar">${esc(t("noChats"))}</p>`
  }</div><div class="sidebar-bottom">${nav("settings", "settings")}<div class="local-badge"><span class="status-dot"></span><span>${esc(t("localData"))}<small>${esc(ai.provider === "local" ? t("localModel") : t("onlineModel"))}</small></span>${icon("leaf")}</div></div></aside><div class="drawer-shade" data-action="closeDrawer"></div><div class="workspace"><header class="topbar">${button("menu", icon("menu"), `aria-label="${esc(t("menu"))}"`, "icon-button mobile-menu")}<div class="breadcrumb">${esc(t(ui.page))}<span>/</span><span>${esc(c && ui.page === "practice" ? roleName(c.config.role) : "Daily Sentences")}</span></div><div class="top-actions"><span class="local-label"><span class="status-dot"></span> LOCAL</span><select id="ui-language" aria-label="${esc(t("interface"))}">${option("system", t("system"), s.settings.uiLanguage)}${langOptions(s.settings.uiLanguage)}</select></div></header><main class="main-content" id="main-content">${ui.page === "settings" ? settings(ctx) : ui.page === "favorites" ? favorites(ctx) : practice(ctx)}</main><footer class="workspace-footer"><span>DAILY SENTENCES</span><span>${esc(t("yourPace"))}</span><span>ZH · EN · FR</span></footer></div></div>`;
}
export function practice(ctx) {
  const { state: s, ui } = ctx,
    c = s.conversations.find((c) => c.id === ui.cid);
  if (!c)
    return `<section class="welcome"><div class="welcome-copy"><p class="eyebrow"><span class="line"></span>${esc(t("localSpace"))}</p><h1>${esc(t("tagline"))}</h1><p class="lead">${esc(t("welcomeText"))}</p><div class="language-art" aria-hidden="true"><span>你好。</span><span>Hello.</span><span>Bonjour.</span><div class="art-line"></div><small>ONE SENTENCE AT A TIME</small></div><div class="welcome-meta"><span>${icon("leaf")}${esc(t("localData"))}</span><span>中文 / English / Français</span></div></div><div class="welcome-form panel">${newForm(s)}</div></section>`;
  const d =
    c.activeDiagnosticId &&
    s.diagnostics.find((d) => d.id === c.activeDiagnosticId);
  const q =
    d && d.status === "active"
      ? s.questions.find((q) => q.id === d.questionIds.at(-1))
      : s.questions.find((q) => q.id === (ui.viewQid || c.currentQuestionId));
  const attempts = s.questions
    .filter((q) => q.conversationId === c.id && !q.diagnosticId)
    .flatMap((q) => q.attempts)
    .filter((a) => a.status === "completed");
  const first = attempts.filter((a) => a.kind === "first" && a.feedback?.valid);
  const avg = first.length
    ? Math.round(first.reduce((n, a) => n + a.feedback.total, 0) / first.length)
    : "—";
  return `<section class="practice-head"><div><p class="eyebrow">${esc(t("localSpace"))}</p><h1>${esc(c.config.scene || roleName(c.config.role))}</h1><div class="practice-tags"><span>${esc(langName(c.config.source))}${icon("arrow")}${esc(langName(c.config.target))}</span><span>${esc(t(c.config.mode))} · L${c.config.level}</span><span>${esc(roleName(c.config.role))}</span></div></div><div class="head-actions">${button("history", icon("history") + esc(t("history")), `data-cid="${c.id}"`)}${button("edit", icon("settings"), `data-cid="${c.id}" aria-label="${esc(t("editChat"))}"`, "icon-button bordered")}</div></section>${c.adjustments.length ? `<div class="adjustment">${icon("spark")}${esc(t(c.adjustments.at(-1).reason === "up" ? "adjustUp" : "adjustDown"))}</div>` : ""}<div class="practice-grid"><div class="practice-column">${d ? diagnosis(ctx, c, d) : ""}${!d && ui.viewQid ? `<div class="review-banner">${esc(t(ui.review ? "reviewHidden" : "history"))}${button("backPractice", esc(t("backPractice")))}</div>` : ""}${!d || d.status === "active" ? (q ? questionCard(ctx, q, c, !!d) : `<div class="empty-card panel">${c.generationStatus === "pending" ? '<span class="spinner"></span>' : icon("spark")}<h2>${esc(t(c.generationStatus === "pending" ? "generating" : "emptyChat"))}</h2>${c.generationError ? errorBox(c.generationError) + button("nav", esc(t("configureAI")), 'data-page="settings"') : ""}${c.generationStatus !== "pending" ? button(d ? "continueDiagnostic" : "next", esc(t("generate")), d ? `data-did="${d.id}"` : `data-cid="${c.id}"`, "primary") : ""}</div>`) : ""}${!d && c.generationStatus === "pending" && q ? `<div class="notice"><span class="spinner tiny"></span>${esc(t("generating"))}</div>` : ""}${!d && c.generationError && q ? errorBox(c.generationError) : ""}</div><aside class="practice-aside"><div class="insight-card"><div class="insight-icon">${icon("leaf")}</div><p class="eyebrow">${esc(t("yourPace"))}</p><div class="stat"><strong>${attempts.length.toString().padStart(2, "0")}</strong><span>${esc(t("completedCount"))}</span></div><div class="stat"><strong>${avg}<small>${avg === "—" ? "" : " / 100"}</small></strong><span>${esc(t("average"))}</span></div><div class="fine-rule"></div><p>${esc(t("aiNote"))}</p></div><div class="aside-note"><span>01 — 02 — 03</span><p>${esc(t("welcomeText"))}</p></div></aside></div>`;
}
function diagnosis(ctx, c, d) {
  if (d.status === "completed")
    return `<section class="panel assessment-result"><p class="eyebrow">${esc(t("diagnostic"))} · 5 / 5</p><h2>${esc(t("assessmentResult"))}</h2><div class="result-level">L${d.result.level}<span>${esc(levelName(d.result.level))}</span></div><p lang="${d.config.source}">${esc(d.result.reason)}</p><p class="small muted">${esc(t("estimated"))}</p><form data-form="applyDiagnostic" data-did="${d.id}" class="stack">${field(t("level"), `<select name="level">${levelOptions(d.result.level)}</select>`)}<label class="check-label"><input type="checkbox" name="updateProfile" ${ctx.state.profiles[d.config.target] ? "" : "checked"}>${esc(t("updateProfile"))}</label><button class="primary" type="submit">${esc(t("applyLevel"))}${icon("arrow")}</button></form><details><summary>${esc(t("feedback"))} · 5</summary>${d.questionIds
      .map((qid) => {
        const q = ctx.state.questions.find((q) => q.id === qid);
        return `<div class="diagnostic-answer"><h3>${esc(q.source)}</h3>${q.attempts.map((a) => attemptCard(ctx, q, a)).join("")}</div>`;
      })
      .join("")}</details></section>`;
  const q = ctx.state.questions.find((q) => q.id === d.questionIds.at(-1));
  const count = d.questionIds.filter((qid) =>
    ctx.state.questions
      .find((q) => q.id === qid)
      ?.attempts.some((a) => a.status === "completed" && a.valid),
  ).length;
  return `<section class="assessment-progress"><div><strong>${esc(t("diagnostic"))}</strong><span>${esc(t("assessmentProgress"))} ${count} / 5</span></div><progress max="5" value="${count}"></progress><p>${esc(t("assessmentSaved"))}</p>${d.error ? errorBox(d.error) : ""}${q?.attempts.some((a) => a.status === "completed" && a.valid) && !d.busy ? button("continueDiagnostic", esc(t("continueAssessment")), `data-did="${d.id}"`, "primary") : ""}${button("skipDiagnostic", esc(t("skipAssessment")), `data-cid="${c.id}"`, "text-button")}</section>`;
}
function questionCard(ctx, q, c, diagnostic = false) {
  const { state: s, ui } = ctx;
  const hidden = ui.review === q.id;
  const starred = s.favorites.some(
    (f) => f.type === "question" && f.objectId === q.id,
  );
  const busy =
    c.generationStatus === "pending" ||
    q.attempts.some((a) => a.status === "pending") ||
    q.followups.some((f) => f.status === "pending");
  const ordinal =
    s.questions
      .filter((x) => x.conversationId === c.id && !x.diagnosticId)
      .findIndex((x) => x.id === q.id) + 1;
  return `<article class="question-card panel"><div class="question-top"><span class="eyebrow">${esc(t(diagnostic ? "diagnostic" : "question"))} ${String(diagnostic ? s.diagnostics.find((d) => d.id === q.diagnosticId).questionIds.indexOf(q.id) + 1 : ordinal).padStart(2, "0")}</span><div class="question-tools"><span class="level-chip">L${q.snapshot.level}</span>${!diagnostic ? button("favorite", icon("book"), `data-type="question" data-object="${q.id}" data-on="${!starred}" aria-label="${esc(t(starred ? "unsave" : "savedQuestion"))}" aria-pressed="${starred}"`, "icon-button " + (starred ? "starred" : "")) : ""}</div></div><div class="translation-label">${esc(t("translateInto"))} <strong>${esc(langName(q.snapshot.target))}</strong></div><blockquote lang="${q.snapshot.source}">${esc(q.source)}</blockquote>${q.context ? `<p class="question-context" lang="${q.snapshot.source}"><span>${esc(t("context"))}</span>${esc(q.context)}</p>` : ""}<div class="question-bottom"><div class="knowledge-tags">${(hidden ? [] : q.knowledge).map((k) => `<span lang="${q.snapshot.source}">${esc(k)}</span>`).join("")}</div><span>${esc(langName(q.snapshot.source))} → ${esc(langName(q.snapshot.target))}</span></div></article>${hidden ? "" : q.attempts.map((a) => (diagnostic ? `<div class="answer-bubble"><span>${esc(t("answer"))}</span><p lang="${q.snapshot.target}">${esc(a.answer)}</p>${a.status === "pending" ? `<span class="spinner tiny"></span> ${esc(t("loading"))}` : a.status === "failed" || a.status === "interrupted" ? `${errorBox(a.error)}${button("retryGrade", esc(t("retryGrade")), `data-qid="${q.id}" data-aid="${a.id}"`)}` : `<small>${esc(t(a.valid === false ? "invalidAnswer" : "saved"))}</small>`}</div>` : attemptCard(ctx, q, a))).join("")}${hidden ? "" : q.followups.map((f) => `<div class="followup-thread"><div class="ask-bubble"><span>${esc(t("followup"))} · ${esc(t("attempt"))} ${q.attempts.findIndex((a) => a.id === f.attemptId) + 1}</span><p>${esc(f.text)}</p></div><div class="tutor-bubble">${icon("spark")}<div>${f.status === "completed" ? `<p lang="${q.snapshot.source}">${esc(f.answer)}</p>` : f.status === "pending" ? `<span class="spinner tiny"></span> ${esc(t("loading"))}` : `${errorBox(f.error)}${button("retryFollowup", esc(t("retry")), `data-qid="${q.id}" data-fid="${f.id}"`)}`}</div></div></div>`).join("")}${diagnostic && q.attempts.some((a) => a.status === "completed" && a.valid) ? "" : composer(ctx, q, busy, diagnostic)}${!diagnostic && !ui.viewQid ? `<div class="next-row"><span>${esc(t("yourPace"))}</span>${button("next", esc(t(q.attempts.length ? "next" : "skipNext")) + icon("arrow"), `data-cid="${c.id}" ${busy ? "disabled" : ""}`, "primary")}</div>` : ""}`;
}
export function attemptCard(ctx, q, a) {
  const f = a.feedback,
    starred = ctx.state.favorites.some(
      (f) => f.type === "feedback" && f.objectId === a.id,
    );
  return `<section class="attempt-record" id="attempt-${a.id}"><div class="answer-bubble"><div><span>${esc(t(a.kind))} · ${q.attempts.indexOf(a) + 1}</span><small>${esc(date(a.createdAt))}</small></div><p lang="${q.snapshot.target}">${esc(a.answer)}</p></div>${
    a.status === "completed" && f
      ? `<div class="feedback-card"><div class="feedback-heading"><div class="tutor-avatar">${icon("spark")}</div><strong>${esc(t("feedback"))}</strong>${f.valid ? `<div class="score"><strong>${f.total}</strong><span>/100</span></div>` : ""}${!q.diagnosticId ? button("favorite", icon("book"), `data-type="feedback" data-object="${a.id}" data-on="${!starred}" aria-label="${esc(t(starred ? "unsave" : "savedFeedback"))}" aria-pressed="${starred}"`, "icon-button " + (starred ? "starred" : "")) : ""}</div>${!f.valid ? `<div class="notice">${esc(t("invalidAnswer"))}</div>` : ""}<div class="feedback-section"><h3>${esc(t("overall"))}</h3><p lang="${q.snapshot.source}">${esc(f.overall)}</p>${f.strength ? `<div class="strength" lang="${q.snapshot.source}">${icon("check")}${esc(f.strength)}</div>` : ""}</div><div class="feedback-section"><h3>${esc(t("issues"))}</h3>${
          f.issues.length
            ? f.issues
                .slice(0, 3)
                .map((i) => issue(q, i))
                .join("")
            : `<p class="muted">${esc(t("noIssues"))}</p>`
        }${
          f.issues.length > 3
            ? `<details><summary>${esc(t("moreIssues"))} (${f.issues.length})</summary>${f.issues
                .slice(3)
                .map((i) => issue(q, i))
                .join("")}</details>`
            : ""
        }</div><div class="reference-box"><span class="eyebrow">${esc(t("references"))}</span>${f.references.map((r) => `<p lang="${q.snapshot.target}">${esc(r)}</p>`).join("")}</div>${
          f.valid
            ? `<details class="dimensions"><summary>${esc(t("score"))} · ${f.total} / 100</summary>${Object.entries(
                f.dimensions,
              )
                .map(
                  ([k, v]) =>
                    `<div class="dimension"><span>${esc(t(k))}</span><meter min="0" max="100" value="${v}">${v}</meter><strong>${v}</strong></div>`,
                )
                .join(
                  "",
                )}<p class="small muted">40% / 25% / 20% / 15%</p></details>`
            : ""
        }${!q.diagnosticId ? `<div class="feedback-actions">${button("revise", icon("edit") + esc(t("revise")), `data-qid="${q.id}" data-aid="${a.id}"`, "text-button")}${button("ask", icon("chat") + esc(t("followup")), `data-qid="${q.id}" data-aid="${a.id}"`, "text-button")}</div>` : ""}<small class="model-meta">${esc(f.metadata?.model)} · ${esc(f.metadata?.promptVersion)}</small></div>`
      : a.status === "pending"
        ? `<div class="feedback-pending"><span class="spinner tiny"></span>${esc(t("loading"))}</div>`
        : `<div class="panel failed-feedback">${errorBox(a.error)}${button("retryGrade", esc(t("retryGrade")), `data-qid="${q.id}" data-aid="${a.id}"`)}</div>`
  }</section>`;
}
const issue = (q, i) =>
  `<div class="issue"><span class="issue-kind ${i.kind}">${esc(t(i.kind))}</span><q lang="${q.snapshot.target}">${esc(i.quote)}</q><p lang="${q.snapshot.source}">${esc(i.explanation)}</p><div class="suggestion" lang="${q.snapshot.target}">${icon("arrow")}${esc(i.suggestion)}</div></div>`;
function composer(ctx, q, busy, diagnostic) {
  const { ui } = ctx;
  const mode = ui.composerMode[q.id] || "answer";
  const value = ctx.draft(q.id, mode);
  const voice = ctx.speech;
  return `<section class="composer panel" data-question="${q.id}"><div class="composer-tabs">${button("composerMode", esc(t("answer")), `data-qid="${q.id}" data-mode="answer"`, mode === "answer" ? "tab active" : "tab")}${!diagnostic && q.attempts.some((a) => a.feedback) ? button("composerMode", esc(t("followup")), `data-qid="${q.id}" data-mode="followup"`, mode === "followup" ? "tab active" : "tab") : ""}<button class="save-state ${ui.saveStatus === "failed" ? "save-error" : ""}" data-action="retrySave" type="button">${icon(ui.saveStatus === "saving" ? "history" : "check")}${esc(t(ui.saveStatus === "failed" ? "unsaved" : ui.saveStatus === "saving" ? "saving" : "saved"))}</button></div><label class="sr-only" for="answer-input">${esc(t(mode))}</label><textarea id="answer-input" data-qid="${q.id}" data-mode="${mode}" maxlength="10000" lang="${mode === "answer" ? q.snapshot.target : q.snapshot.source}" placeholder="${esc(t(mode === "answer" ? "answerPlaceholder" : "askPlaceholder"))}" ${busy ? "disabled" : ""}>${esc(value)}</textarea>${
    mode === "followup"
      ? field(
          t("feedback"),
          `<select id="related-attempt">${q.attempts
            .filter((a) => a.feedback)
            .map((a) =>
              option(
                a.id,
                `${t(a.kind)} · ${q.attempts.indexOf(a) + 1}`,
                ui.relatedAttempt[q.id] ||
                  q.attempts.filter((a) => a.feedback).at(-1)?.id,
              ),
            )
            .join("")}</select>`,
        )
      : ""
  }<div class="composer-bottom"><div class="voice-actions">${mode === "answer" ? button("voice", icon("mic") + esc(t(voice.status === "recording" ? "stopVoice" : "voice")), `${busy ? "disabled" : ""}`, "voice-button " + (voice.status === "recording" ? "recording" : "")) : ""}${voice.status === "recording" ? button("cancelVoice", esc(t("cancelVoice")), "", "text-button") : ""}${voice.canUndo ? button("undoVoice", esc(t("undoVoice")), "", "text-button") : ""}<span class="char-count">${value.length} / 10000</span></div>${button("submit", esc(t(mode === "answer" ? "submit" : "send")) + icon("arrow"), `data-qid="${q.id}" data-mode="${mode}" ${busy ? "disabled" : ""}`, "primary")}</div><div class="composer-note">${esc(t(voice.message || "voiceIdle"))}${voice.status === "recording" ? ` · ${esc(t("recording"))}` : ""}</div></section>`;
}
function favorites(ctx) {
  const { state: s, ui } = ctx;
  const list = s.favorites
    .filter((f) => !ui.favoriteType || f.type === ui.favoriteType)
    .map((f) => {
      const q = s.questions.find((q) =>
        f.type === "question"
          ? q.id === f.objectId
          : q.attempts.some((a) => a.id === f.objectId),
      );
      return { f, q };
    })
    .filter(
      ({ q }) =>
        (!ui.favoriteChat || q.conversationId === ui.favoriteChat) &&
        (!ui.favoritePair ||
          `${q.snapshot.source}-${q.snapshot.target}` === ui.favoritePair),
    );
  const pairs = [
    ...new Set(
      s.questions.map((q) => `${q.snapshot.source}-${q.snapshot.target}`),
    ),
  ];
  return `<section class="page-heading"><p class="eyebrow">${esc(t("collectionEyebrow"))}</p><h1>${esc(t("favorites"))}<span class="heading-count">${s.favorites.length}</span></h1><p>${esc(t("favoritesIntro"))}</p></section><div class="favorite-filters"><select id="favorite-type" aria-label="${esc(t("favorites"))}">${option("", t("all"), ui.favoriteType)}${option("question", t("question"), ui.favoriteType)}${option("feedback", t("feedback"), ui.favoriteType)}</select><select id="favorite-pair" aria-label="${esc(t("allLanguages"))}">${option("", t("allLanguages"), ui.favoritePair)}${pairs.map((p) => option(p, p.split("-").map(langName).join(" → "), ui.favoritePair)).join("")}</select><select id="favorite-chat" aria-label="${esc(t("allChats"))}">${option("", t("allChats"), ui.favoriteChat)}${s.conversations.map((c) => option(c.id, chatTitle(c), ui.favoriteChat)).join("")}</select></div>${list.length ? `<div class="favorites-grid">${list.map(({ f, q }) => `<article class="favorite-card panel"><div class="question-top"><span class="eyebrow">${esc(t(f.type === "question" ? "question" : "feedback"))} · ${esc(q.snapshot.source.toUpperCase() + " → " + q.snapshot.target.toUpperCase())}</span>${button("favorite", icon("book"), `data-type="${f.type}" data-object="${f.objectId}" data-on="false" aria-label="${esc(t("unsave"))}"`, "icon-button starred")}</div><h2 lang="${q.snapshot.source}">${esc(q.source)}</h2>${f.type === "feedback" ? `<p class="favorite-excerpt" lang="${q.snapshot.source}">${esc(q.attempts.find((a) => a.id === f.objectId).feedback.overall)}</p>` : ""}<p class="muted small">${esc(roleName(q.snapshot.role))} · L${q.snapshot.level}</p><div class="favorite-actions">${button("review", esc(t("reviewNow")) + icon("arrow"), `data-qid="${q.id}"`, "primary")}${button("original", esc(t("showOriginal")), `data-qid="${q.id}" data-aid="${f.type === "feedback" ? f.objectId : ""}"`, "text-button")}</div></article>`).join("")}</div>` : `<div class="empty-favorites">${icon("book")}<h2>${esc(t("noFavorites"))}</h2><p>${esc(t("favoritesIntro"))}</p></div>`}`;
}
function settings(ctx) {
  const { state: s, ai, ui, runtime } = ctx;
  return `<section class="page-heading"><p class="eyebrow">${esc(t("settingsEyebrow"))}</p><h1>${esc(t("settings"))}</h1><p>${esc(t("privacy"))}</p></section><div class="settings-grid"><div class="settings-column"><section class="panel settings-card"><h2>${esc(t("defaults"))}</h2><p class="muted">${esc(t("defaultsInfo"))}</p><form data-form="defaults" class="stack">${field(t("interface"), `<select name="uiLanguage">${option("system", t("system"), s.settings.uiLanguage)}${langOptions(s.settings.uiLanguage)}</select>`)}${directionForm({ source: s.settings.source, target: s.settings.target, role: s.settings.defaultRole, scene: "" }, false)}<button class="primary" type="submit">${esc(t("save"))}</button></form></section><section class="panel settings-card"><h2>${esc(t("profiles"))}</h2>${["zh", "en", "fr"].map((l) => `<div class="profile-row"><div class="profile-title"><strong>${esc(langName(l))}</strong><small>${s.profiles[l] ? `L${s.profiles[l].level} · ${esc(levelName(s.profiles[l].level))}` : esc(t("noProfile"))}</small></div><form data-form="profile" data-lang="${l}"><select name="level" aria-label="${esc(langName(l) + " " + t("level"))}">${levelOptions(s.profiles[l]?.level || 2)}</select><button class="secondary" type="submit">${esc(t("save"))}</button></form>${button("reassess", esc(t("reassess")), `data-lang="${l}"`, "text-button")}${s.diagnostics.some((d) => d.config.target === l && d.status === "completed") ? button("assessmentHistory", esc(t("assessmentHistory")), `data-lang="${l}"`, "text-button") : ""}</div>`).join("")}</section><section class="panel settings-card"><h2>${esc(t("backup"))}</h2><p class="muted">${esc(t("backupInfo"))}</p><div class="button-row"><a class="secondary button-link" href="/api/backup" download>${icon("download")}${esc(t("export"))}</a><label class="secondary button-link upload-label">${icon("upload")}${esc(t("import"))}<input type="file" id="backup-file" accept="application/json,.json" class="sr-only"></label></div><div class="data-path"><strong>${esc(t("dataPath"))}</strong><code>${esc(ctx.dataPath)}</code></div></section></div><div class="settings-column"><section class="panel settings-card ai-settings"><div class="section-title"><h2>${esc(t("aiService"))}</h2><span class="level-chip">${esc(ai.provider === "local" ? "LOCAL" : "ONLINE")}</span></div><form data-form="ai" class="stack"><div class="provider-switch"><label><input type="radio" name="provider" value="local" ${ai.provider === "local" ? "checked" : ""}>${esc(t("localModel"))}</label><label><input type="radio" name="provider" value="online" ${ai.provider === "online" ? "checked" : ""}>${esc(t("onlineModel"))}</label></div><p class="muted" id="provider-info">${esc(t(ai.provider === "local" ? "localInfo" : "onlineInfo"))}</p>${field(t("baseUrl"), `<input name="baseUrl" type="url" value="${esc(ai.baseUrl)}" required spellcheck="false">`)}${field(t("model"), `<input name="model" value="${esc(ai.model)}" required list="model-presets"><datalist id="model-presets"><option value="qwen3.5:2b"></option><option value="qwen3.5:4b-q4_K_M"></option><option value="qwen-plus"></option><option value="deepseek-chat"></option></datalist>`)}${field(t("apiKey"), `<input name="apiKey" type="password" autocomplete="off" placeholder="${esc(ai.hasKey ? t("keySaved") : "sk-…")}" spellcheck="false">`)}<button class="primary" type="submit">${esc(t("save"))}</button></form><div class="button-row separated">${button("testAI", esc(t("testConnection")), `${ui.testingAI ? "disabled" : ""}`)}${ai.provider === "local" ? button("models", esc(t("checkModels"))) : ""}</div>${ui.connectionResult ? `<div class="notice ${ui.connectionResult === "ok" ? "success" : "error"}">${esc(ui.connectionResult === "ok" ? t("connected") : errorMessage(ui.connectionResult))}</div>` : ""}${ai.provider === "local" ? `<div class="local-setup"><h3>${icon("leaf")}${esc(t("localModel"))} · Qwen 3.5 4B</h3><p class="small muted">${esc(t("installInfo"))}</p>${runtime?.stage && runtime.stage !== "idle" ? `<div class="runtime-status" role="status"><strong>${esc(t({ runtime: "runtimeDownload", model: "modelDownload", starting: "runtimeStarting", ready: "localSetupReady", failed: "runtimeError" }[runtime.stage] || "loading"))}</strong>${runtime.total ? `<progress max="${runtime.total}" value="${runtime.completed || 0}"></progress><small>${Math.round(((runtime.completed || 0) / runtime.total) * 100)}%</small>` : ""}</div>` : ""}<div class="button-row">${button("setupLocal", esc(t("installLocal")), `${runtime && ["runtime", "model", "starting"].includes(runtime.stage) ? "disabled" : ""}`, "primary")}${button("startLocal", esc(t("startLocal")))}</div><a class="small external-link" href="https://ollama.com/download" target="_blank" rel="noreferrer">Ollama ↗</a></div>` : ""}</section><div class="privacy-card">${icon("leaf")}<h3>${esc(t("localData"))}</h3><p>${esc(t("privacy"))}</p><p class="small">${esc(t(ai.provider === "local" ? "localInfo" : "onlineInfo"))}</p></div></div></div>`;
}
