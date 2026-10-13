import { t, errorMessage, setLanguage, langName } from "./i18n.js";
import {
  shell,
  newForm,
  editForm,
  esc,
  button,
  levelOptions,
  icon,
  chatTitle,
  attemptCard,
} from "./views.js";
import { Dictation } from "./speech.js";
const root = document.querySelector("#app"),
  modal = document.querySelector("#modal");
let state,
  ai,
  token,
  dataPath,
  runtime,
  lastRevision = -1,
  loading = false,
  toastTimer,
  importBackup;
const drafts = new Map(),
  saveTimers = new Map(),
  saveChains = new Map();
const ui = {
  page: "practice",
  cid: null,
  drawer: false,
  viewQid: null,
  review: null,
  composerMode: {},
  relatedAttempt: {},
  saveStatus: "saved",
  favoriteType: "",
  favoritePair: "",
  favoriteChat: "",
  creating: false,
};
function draftKey(qid, mode) {
  return `${state?.userId || ""}:${qid}:${mode}`;
}
function draft(qid, mode) {
  const key = draftKey(qid, mode);
  if (drafts.has(key)) return drafts.get(key);
  const q = state.questions.find((q) => q.id === qid);
  let value = q?.drafts[mode] || "";
  try {
    const local = localStorage.getItem("daily-draft:" + key);
    if (local !== null) value = local;
  } catch {}
  drafts.set(key, value);
  return value;
}
function setDraft(qid, mode, value) {
  const key = draftKey(qid, mode);
  drafts.set(key, value);
  try {
    localStorage.setItem("daily-draft:" + key, value);
  } catch {}
  ui.saveStatus = "saving";
  clearTimeout(saveTimers.get(key));
  saveTimers.set(
    key,
    setTimeout(() => saveDraft(qid, mode), 450),
  );
  updateSaveLabel();
}
async function saveDraft(qid, mode) {
  const key = draftKey(qid, mode),
    value = draft(qid, mode);
  clearTimeout(saveTimers.get(key));
  saveTimers.delete(key);
  const chain = (saveChains.get(key) || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      try {
        await api(`/api/questions/${qid}/draft`, "PATCH", {
          mode,
          text: value,
        });
        if (draft(qid, mode) === value) {
          ui.saveStatus = "saved";
          try {
            localStorage.removeItem("daily-draft:" + key);
          } catch {}
        }
      } catch {
        ui.saveStatus = "failed";
      }
      updateSaveLabel();
    });
  saveChains.set(key, chain);
  return chain;
}
function updateSaveLabel() {
  const el = document.querySelector(".save-state");
  if (el) {
    el.innerHTML =
      icon(ui.saveStatus === "saving" ? "history" : "check") +
      esc(
        t(
          ui.saveStatus === "failed"
            ? "unsaved"
            : ui.saveStatus === "saving"
              ? "saving"
              : "saved",
        ),
      );
    el.classList.toggle("save-error", ui.saveStatus === "failed");
  }
}
const speech = new Dictation({
  getDraft: draft,
  setDraft,
  onChange: () => render(),
});
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 6000);
}
async function api(path, method = "GET", body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body
        ? { "Content-Type": "application/json", "X-Local-Token": token }
        : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error("AI_NETWORK"), { code: "AI_NETWORK" });
  }
  let value;
  try {
    value = await response.json();
  } catch {
    throw Object.assign(new Error("SAVE_FAILED"), { code: "SAVE_FAILED" });
  }
  if (!response.ok)
    throw Object.assign(new Error(value.error), { code: value.error });
  return value;
}
async function load(force = false) {
  if (loading) return;
  loading = true;
  try {
    const response = await api("/api/state");
    state = response.state;
    ai = response.ai;
    token = response.token;
    dataPath = response.dataPath;
    const runtimeChanged =
      JSON.stringify(runtime) !== JSON.stringify(response.runtime);
    runtime = response.runtime;
    setLanguage(state.settings.uiLanguage);
    if (
      !ui.cid ||
      !state.conversations.some((c) => c.id === ui.cid) ||
      ui.creating
    )
      ui.cid = state.activeConversationId;
    if (force || state.revision !== lastRevision || runtimeChanged) {
      lastRevision = state.revision;
      render();
    }
  } catch (e) {
    toast(errorMessage(e.code));
    if (!state)
      root.innerHTML = `<main class="boot"><h1>Daily Sentences</h1><p>${esc(errorMessage(e.code))}</p>${button("reload", esc(t("retry")))}</main>`;
  } finally {
    loading = false;
  }
}
function render() {
  if (!state) return;
  const focused = document.activeElement;
  const focus = focused?.id;
  const selection =
    focused?.tagName === "TEXTAREA"
      ? [focused.selectionStart, focused.selectionEnd]
      : null;
  const scroll = document.querySelector("#main-content")?.scrollTop;
  root.innerHTML = shell({
    state,
    ai,
    ui,
    dataPath,
    runtime,
    draft,
    speech: speech.snapshot(),
  });
  if (focus) {
    const el = document.getElementById(focus);
    if (el) {
      el.focus({ preventScroll: true });
      if (selection) el.setSelectionRange(...selection);
    }
  }
  if (scroll) document.querySelector("#main-content").scrollTop = scroll;
}
function showModal(html) {
  modal.innerHTML = `${button("closeModal", icon("close"), `aria-label="${esc(t("close"))}"`, "icon-button modal-close")}<div class="modal-body">${html}</div>`;
  if (!modal.open) modal.showModal();
}
function closeModal() {
  modal.close();
  modal.innerHTML = "";
}
function formObject(form) {
  return Object.fromEntries(new FormData(form));
}
async function mutation(path, method, body) {
  try {
    const result = await api(path, method, body);
    await load(true);
    return result;
  } catch (e) {
    await load(true);
    throw e;
  }
}
function goPractice(q, review = false) {
  ui.page = "practice";
  ui.cid = q.conversationId;
  ui.viewQid = q.id;
  ui.review = review ? q.id : null;
  ui.composerMode[q.id] = "answer";
  if (review) setDraft(q.id, "answer", "");
  render();
  window.scrollTo({ top: 0 });
}
async function action(el) {
  const a = el.dataset.action,
    c = state?.conversations.find((c) => c.id === ui.cid);
  switch (a) {
    case "reload":
      return load(true);
    case "menu":
      ui.drawer = true;
      return render();
    case "closeDrawer":
      ui.drawer = false;
      return render();
    case "closeModal":
      return closeModal();
    case "new":
      return showModal(newForm(state));
    case "nav":
      ui.page = el.dataset.page;
      ui.drawer = false;
      ui.viewQid = null;
      ui.review = null;
      return render();
    case "activate":
      ui.cid = el.dataset.cid;
      ui.creating = false;
      ui.page = "practice";
      ui.drawer = false;
      ui.viewQid = null;
      ui.review = null;
      render();
      return mutation(`/api/conversations/${ui.cid}/activate`, "POST", {});
    case "swap": {
      const form = el.closest("form"),
        source = form.elements.source,
        target = form.elements.target;
      const old = source.value;
      source.value = target.value;
      target.value = old;
      updateProfileNote(form);
      return;
    }
    case "edit":
      return showModal(editForm(c, state));
    case "next":
      return mutation(`/api/conversations/${el.dataset.cid}/next`, "POST", {
        requestId: crypto.randomUUID(),
      });
    case "favorite":
      return mutation("/api/favorites", "POST", {
        type: el.dataset.type,
        objectId: el.dataset.object,
        on: el.dataset.on === "true",
      });
    case "composerMode":
      ui.composerMode[el.dataset.qid] = el.dataset.mode;
      return render();
    case "retrySave": {
      const input = document.querySelector("#answer-input");
      if (input) await saveDraft(input.dataset.qid, input.dataset.mode);
      return;
    }
    case "submit": {
      const qid = el.dataset.qid,
        mode = el.dataset.mode,
        value = draft(qid, mode);
      if (!value.trim()) {
        toast(t("emptyInput"));
        return;
      }
      speech.cancel();
      await saveDraft(qid, mode);
      const failed = ui.saveStatus === "failed";
      if (failed) {
        toast(errorMessage("SAVE_FAILED"));
        return;
      }
      el.disabled = true;
      const related = document.querySelector("#related-attempt")?.value;
      try {
        const result = await api(
          `/api/questions/${qid}/${mode === "answer" ? "submit" : "followup"}`,
          "POST",
          mode === "answer"
            ? {
                answer: value,
                requestId: crypto.randomUUID(),
                kind: ui.review === qid ? "review" : undefined,
                inputMethod: speech.canUndo ? "voice" : "text",
              }
            : {
                text: value,
                attemptId: related,
                requestId: crypto.randomUUID(),
              },
        );
        drafts.set(draftKey(qid, mode), "");
        try {
          localStorage.removeItem("daily-draft:" + draftKey(qid, mode));
        } catch {}
        if (ui.review === qid) ui.review = null;
        await load(true);
        const q = state.questions.find((q) => q.id === qid);
        if (
          q.diagnosticId &&
          q.attempts.at(-1)?.status === "completed" &&
          q.attempts.at(-1)?.valid
        )
          await mutation(
            `/api/diagnostics/${q.diagnosticId}/advance`,
            "POST",
            {},
          );
        return result;
      } catch (e) {
        await load(true);
        throw e;
      } finally {
        el.disabled = false;
      }
    }
    case "retryGrade":
      return mutation(
        `/api/questions/${el.dataset.qid}/attempts/${el.dataset.aid}/retry`,
        "POST",
        {},
      );
    case "retryFollowup":
      return mutation(
        `/api/questions/${el.dataset.qid}/followups/${el.dataset.fid}/retry`,
        "POST",
        {},
      );
    case "revise": {
      const q = state.questions.find((q) => q.id === el.dataset.qid),
        attempt = q.attempts.find((a) => a.id === el.dataset.aid);
      ui.composerMode[q.id] = "answer";
      setDraft(q.id, "answer", attempt.answer);
      render();
      document.querySelector("#answer-input")?.focus();
      return;
    }
    case "ask":
      ui.composerMode[el.dataset.qid] = "followup";
      ui.relatedAttempt[el.dataset.qid] = el.dataset.aid;
      render();
      document.querySelector("#answer-input")?.focus();
      return;
    case "review": {
      const q = state.questions.find((q) => q.id === el.dataset.qid);
      return goPractice(q, true);
    }
    case "original": {
      const q = state.questions.find((q) => q.id === el.dataset.qid);
      goPractice(q);
      if (el.dataset.aid)
        document
          .getElementById("attempt-" + el.dataset.aid)
          ?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    case "backPractice":
      ui.viewQid = null;
      ui.review = null;
      return render();
    case "history": {
      const questions = state.questions
        .filter((q) => q.conversationId === el.dataset.cid && !q.diagnosticId)
        .slice()
        .reverse();
      return showModal(
        `<h2>${esc(t("history"))}</h2><div class="history-list">${questions.length ? questions.map((q) => `<div class="history-item"><p lang="${q.snapshot.source}">${esc(q.source)}</p><small>${esc(q.snapshot.source.toUpperCase() + " → " + q.snapshot.target.toUpperCase())} · L${q.snapshot.level} · ${q.attempts.length} ${esc(t("attempt"))}</small><div>${button("review", esc(t("reviewNow")), `data-qid="${q.id}"`)}${button("original", esc(t("showOriginal")), `data-qid="${q.id}"`, "text-button")}</div></div>`).join("") : esc(t("noChats"))}</div>`,
      );
    }
    case "continueDiagnostic":
      return mutation(`/api/diagnostics/${el.dataset.did}/advance`, "POST", {});
    case "skipDiagnostic":
      return showModal(
        `<form data-form="skipDiagnostic" data-cid="${el.dataset.cid}" class="stack"><h2>${esc(t("skipAssessment"))}</h2><label class="field"><span>${esc(t("level"))}</span><select name="level">${levelOptions(c.config.level)}</select></label><button type="submit" class="primary">${esc(t("start"))}</button></form>`,
      );
    case "reassess": {
      const target = el.dataset.lang,
        source =
          target === state.settings.source
            ? target === "zh"
              ? "en"
              : "zh"
            : state.settings.source;
      ui.creating = true;
      const result = await mutation("/api/conversations", "POST", {
        source,
        target,
        role: state.settings.defaultRole,
        level: state.profiles[target]?.level || 2,
        skipDiagnostic: false,
        diagnostic: true,
      });
      ui.cid = result.id;
      ui.page = "practice";
      ui.creating = false;
      const created = state.conversations.find((c) => c.id === result.id);
      if (!created.activeDiagnosticId)
        await mutation(`/api/conversations/${result.id}/diagnose`, "POST", {});
      render();
      return;
    }
    case "assessmentHistory": {
      const records = state.diagnostics
        .filter(
          (d) =>
            d.config.target === el.dataset.lang && d.status === "completed",
        )
        .slice()
        .reverse();
      return showModal(
        `<h2>${esc(langName(el.dataset.lang) + " · " + t("assessmentHistory"))}</h2>${records
          .map(
            (d) =>
              `<details><summary>L${d.result.level} · ${esc(new Date(d.completedAt).toLocaleDateString())}</summary><p>${esc(d.result.reason)}</p>${d.questionIds
                .map((qid) => {
                  const q = state.questions.find((q) => q.id === qid);
                  return `<h3>${esc(q.source)}</h3>${q.attempts.map((a) => attemptCard({ state }, q, a)).join("")}`;
                })
                .join("")}</details>`,
          )
          .join("")}`,
      );
    }
    case "voice": {
      if (speech.status === "recording") return speech.stop();
      const input = document.querySelector("#answer-input"),
        q = state.questions.find((q) => q.id === input?.dataset.qid);
      if (q) speech.start(q.id, q.snapshot.target);
      return;
    }
    case "cancelVoice":
      return speech.cancel();
    case "undoVoice":
      return speech.undo();
    case "testAI":
      ui.testingAI = true;
      ui.connectionResult = null;
      render();
      try {
        await api("/api/ai/test", "POST", {});
        ui.connectionResult = "ok";
      } catch (e) {
        ui.connectionResult = e.code;
      } finally {
        ui.testingAI = false;
        render();
      }
      return;
    case "models": {
      const result = await api("/api/ai/models");
      return showModal(
        `<h2>${esc(t("checkModels"))}</h2>${result.models.length ? result.models.map((m) => `<p><strong>${esc(m.name)}</strong> · ${(m.size / 1024 ** 3).toFixed(1)} GB</p>`).join("") : `<p>${esc(t("emptyModels"))}</p>`}`,
      );
    }
    case "setupLocal":
      await mutation("/api/local/setup", "POST", {});
      return load(true);
    case "startLocal":
      await mutation("/api/local/start", "POST", {});
      toast(t("connected"));
      return;
    case "confirmImport":
      await mutation("/api/backup/import", "POST", {
        backup: importBackup,
        confirm: true,
      });
      importBackup = null;
      drafts.clear();
      try {
        for (const key of Object.keys(localStorage))
          if (key.startsWith("daily-draft:")) localStorage.removeItem(key);
      } catch {}
      ui.cid = state.activeConversationId;
      ui.viewQid = null;
      ui.review = null;
      closeModal();
      render();
      toast(t("importDone"));
      return;
  }
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const actionName = el.dataset.action;
  if (["review", "original"].includes(actionName) && modal.open) closeModal();
  Promise.resolve(action(el)).catch((err) => toast(errorMessage(err.code)));
});
document.addEventListener("input", (e) => {
  const input = e.target;
  if (input.id === "answer-input") {
    setDraft(input.dataset.qid, input.dataset.mode, input.value);
    const counter = document.querySelector(".char-count");
    if (counter) counter.textContent = input.value.length + " / 10000";
  }
});
function updateProfileNote(form) {
  if (form.dataset.form !== "new") return;
  const p = state.profiles[form.elements.target.value];
  const note = form.querySelector("#profile-note");
  if (note) note.textContent = p ? t("profileExists") : "";
  form.elements.level.value = p?.level || 2;
}
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "ui-language")
    mutation("/api/settings", "PATCH", { uiLanguage: el.value }).catch((err) =>
      toast(errorMessage(err.code)),
    );
  if (el.id === "related-attempt") {
    const input = document.querySelector("#answer-input");
    ui.relatedAttempt[input.dataset.qid] = el.value;
  }
  if (el.id?.startsWith("favorite-")) {
    ui[
      {
        "favorite-type": "favoriteType",
        "favorite-pair": "favoritePair",
        "favorite-chat": "favoriteChat",
      }[el.id]
    ] = el.value;
    render();
  }
  if (el.name === "target" || el.name === "source") {
    const form = el.closest("form");
    if (form) updateProfileNote(form);
  }
  if (el.name === "provider") {
    const form = el.closest("form"),
      local = el.value === "local";
    form.elements.baseUrl.value = local
      ? "http://127.0.0.1:11434"
      : ai.onlineProfile?.baseUrl ||
        "https://dashscope.aliyuncs.com/compatible-mode/v1";
    form.elements.model.value = local
      ? "qwen3.5:4b-q4_K_M"
      : ai.onlineProfile?.model || "qwen-plus";
    form.querySelector("#provider-info").textContent = t(
      local ? "localInfo" : "onlineInfo",
    );
  }
  if (el.id === "backup-file" && el.files[0])
    readBackup(el.files[0]).catch((err) => toast(errorMessage(err.code)));
});
document.addEventListener("submit", (e) => {
  const form = e.target.closest("[data-form]");
  if (!form) return;
  e.preventDefault();
  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;
  submitForm(form)
    .catch((err) => toast(errorMessage(err.code)))
    .finally(() => {
      if (submit) submit.disabled = false;
    });
});
async function submitForm(form) {
  const v = formObject(form);
  switch (form.dataset.form) {
    case "new": {
      ui.creating = true;
      closeModal();
      ui.page = "practice";
      try {
        const c = await mutation("/api/conversations", "POST", {
          ...v,
          level: Number(v.level),
          skipDiagnostic: v.assessment === "skip",
        });
        if (ui.creating) ui.cid = c.id;
      } finally {
        ui.creating = false;
        render();
      }
      return;
    }
    case "edit": {
      const cid = form.dataset.cid,
        target = v.target;
      await mutation(`/api/conversations/${cid}`, "PATCH", {
        title: v.title,
        config: {
          source: v.source,
          target,
          role: v.role,
          scene: v.scene,
          level: Number(v.level),
          mode: v.mode,
        },
        ...(!state.profiles[target] ? { selfLevel: Number(v.level) } : {}),
      });
      closeModal();
      toast(t("nextOnly"));
      return;
    }
    case "defaults":
      await mutation("/api/settings", "PATCH", {
        uiLanguage: v.uiLanguage,
        source: v.source,
        target: v.target,
        defaultRole: v.role,
      });
      toast(t("saved"));
      return;
    case "profile":
      await mutation(`/api/profiles/${form.dataset.lang}`, "PATCH", {
        level: Number(v.level),
      });
      toast(t("saved"));
      return;
    case "ai":
      await mutation("/api/ai", "PATCH", {
        provider: v.provider,
        baseUrl: v.baseUrl,
        model: v.model,
        ...(v.apiKey ? { apiKey: v.apiKey } : {}),
      });
      ui.connectionResult = null;
      toast(t("saved"));
      render();
      return;
    case "applyDiagnostic":
      await mutation(`/api/diagnostics/${form.dataset.did}/apply`, "POST", {
        level: Number(v.level),
        updateProfile: v.updateProfile === "on",
      });
      closeModal();
      return;
    case "skipDiagnostic":
      await mutation(
        `/api/conversations/${form.dataset.cid}/skip-diagnostic`,
        "POST",
        { level: Number(v.level) },
      );
      closeModal();
      return;
  }
}
async function readBackup(file) {
  if (file.size > 25 * 1024 * 1024) throw { code: "BACKUP_INVALID" };
  try {
    importBackup = JSON.parse(await file.text());
  } catch {
    throw { code: "BACKUP_INVALID" };
  }
  const counts = await api("/api/backup/preview", "POST", {
    backup: importBackup,
  });
  showModal(
    `<h2>${esc(t("importPreview"))}</h2><div class="backup-counts"><p>${esc(t("conversations"))}: ${counts.conversations}</p><p>${esc(t("question"))}: ${counts.questions}</p><p>${esc(t("attempt"))}: ${counts.attempts}</p><p>${esc(t("favorites"))}: ${counts.favorites}</p></div><p>${esc(t("importConfirm"))}</p>${button("confirmImport", esc(t("import")), "", "primary")}`,
  );
}
document.addEventListener("keydown", (e) => {
  if (
    e.target.id === "answer-input" &&
    (e.ctrlKey || e.metaKey) &&
    e.key === "Enter"
  ) {
    e.preventDefault();
    document.querySelector('[data-action="submit"]')?.click();
  }
});
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
window.addEventListener("pagehide", () => {
  for (const [key, timer] of saveTimers) {
    clearTimeout(timer);
    const [user, qid, mode] = key.split(":");
    const value = drafts.get(key);
    if (value !== undefined)
      fetch(`/api/questions/${qid}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Local-Token": token },
        body: JSON.stringify({ mode, text: value }),
        keepalive: true,
      }).catch(() => {});
  }
});
await load(true);
setInterval(() => {
  if (!document.hidden) load();
}, 2000);
