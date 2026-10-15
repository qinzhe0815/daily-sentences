import {
  id,
  now,
  ensure,
  text,
  AppError,
  validateConfig,
  publicState,
  updateDifficulty,
  LANGUAGES,
  ROLES,
  validateBackup,
} from "./model.mjs";
import { Corpus } from "./corpus.mjs";
export class Service {
  constructor(store, ai, { corpus = new Corpus() } = {}) {
    this.store = store;
    this.ai = ai;
    this.corpus = corpus;
    this.reservedFamilies = new Set();
    this.inflight = new Set();
    this.objectLocks = new Set();
  }
  state() {
    return publicState(this.store.read());
  }
  conversation(s, cid) {
    const c = s.conversations.find((x) => x.id === cid);
    ensure(c, "NOT_FOUND", 404);
    return c;
  }
  question(s, qid) {
    const q = s.questions.find((x) => x.id === qid);
    ensure(q, "NOT_FOUND", 404);
    return q;
  }
  activate(cid) {
    this.store.mutate((s) => {
      this.conversation(s, cid);
      s.activeConversationId = cid;
    });
  }
  settings(input) {
    this.store.mutate((s) => {
      if (input.uiLanguage !== undefined) {
        ensure(
          ["system", ...LANGUAGES].includes(input.uiLanguage),
          "INVALID_INPUT",
        );
        s.settings.uiLanguage = input.uiLanguage;
      }
      if (input.defaultRole !== undefined) {
        ensure(ROLES.includes(input.defaultRole), "INVALID_ROLE");
        s.settings.defaultRole = input.defaultRole;
      }
      if (input.source !== undefined || input.target !== undefined) {
        const source = input.source ?? s.settings.source,
          target = input.target ?? s.settings.target;
        ensure(
          LANGUAGES.includes(source) &&
            LANGUAGES.includes(target) &&
            source !== target,
          "INVALID_DIRECTION",
        );
        s.settings.source = source;
        s.settings.target = target;
      }
      if (input.onboarded === true) s.settings.onboarded = true;
    });
  }
  profile(lang, level) {
    ensure(
      LANGUAGES.includes(lang) &&
        Number.isInteger(level) &&
        level >= 1 &&
        level <= 5,
      "INVALID_LEVEL",
    );
    this.store.mutate((s) => {
      s.profiles[lang] = {
        level,
        source: "manual",
        updatedAt: now(),
        diagnosticIds: s.profiles[lang]?.diagnosticIds || [],
      };
    });
  }
  async createConversation(input) {
    const s = this.store.read();
    const config = validateConfig({
      source: input.source ?? s.settings.source,
      target: input.target ?? s.settings.target,
      role: input.role ?? s.settings.defaultRole,
      level:
        input.level ??
        s.profiles[input.target ?? s.settings.target]?.level ??
        2,
      mode: input.mode ?? "auto",
      scene: input.scene ?? "",
    });
    const c = {
      id: id(),
      title: input.title ? text(input.title, 120) : "",
      config,
      currentQuestionId: null,
      activeDiagnosticId: null,
      window: [],
      epoch: 0,
      adjustments: [],
      generationStatus: "idle",
      createdAt: now(),
      updatedAt: now(),
    };
    this.store.mutate((s) => {
      s.conversations.push(c);
      s.activeConversationId = c.id;
      s.settings.onboarded = true;
      if (input.skipDiagnostic && !s.profiles[config.target])
        s.profiles[config.target] = {
          level: config.level,
          source: "self",
          updatedAt: now(),
          diagnosticIds: [],
        };
    });
    try {
      if (input.diagnostic || !input.skipDiagnostic)
        await this.startDiagnostic(c.id);
      else await this.generate(c.id, id());
    } catch {
      /* Saved error is displayed on the created conversation. */
    }
    return c;
  }
  updateConversation(cid, input) {
    this.store.mutate((s) => {
      const c = this.conversation(s, cid);
      if (input.title !== undefined) c.title = text(input.title, 120, true);
      if (input.config) {
        const config = validateConfig({ ...c.config, ...input.config });
        if (
          config.target !== c.config.target ||
          config.role !== c.config.role ||
          config.level !== c.config.level ||
          config.mode !== c.config.mode
        ) {
          c.window = [];
          c.epoch = (c.epoch || 0) + 1;
        }
        if (config.target !== c.config.target) {
          if (s.profiles[config.target])
            config.level = s.profiles[config.target].level;
          else ensure(input.selfLevel, "PROFILE_REQUIRED");
        }
        if (input.selfLevel) {
          ensure(
            Number.isInteger(input.selfLevel) &&
              input.selfLevel >= 1 &&
              input.selfLevel <= 5,
            "INVALID_LEVEL",
          );
          config.level = input.selfLevel;
          s.profiles[config.target] = {
            level: input.selfLevel,
            source: "self",
            updatedAt: now(),
            diagnosticIds: s.profiles[config.target]?.diagnosticIds || [],
          };
        }
        c.config = config;
      }
      c.updatedAt = now();
    });
  }
  draft(qid, input) {
    this.store.mutate((s) => {
      const q = this.question(s, qid);
      ensure(["answer", "followup"].includes(input.mode), "INVALID_INPUT");
      q.drafts[input.mode] =
        typeof input.text === "string" && input.text.length <= 10000
          ? input.text
          : (() => {
              throw new AppError("INVALID_INPUT");
            })();
      q.drafts.updatedAt = now();
    });
  }
  request(s, requestId, task, targetId) {
    ensure(
      typeof requestId === "string" &&
        requestId.length > 0 &&
        requestId.length <= 200,
      "INVALID_INPUT",
    );
    const existing = s.requests.find((r) => r.id === requestId);
    if (existing) {
      ensure(
        existing.task === task && existing.targetId === targetId,
        "CONFLICT",
        409,
      );
      return existing;
    }
    const r = {
      id: requestId,
      task,
      targetId,
      status: "pending",
      createdAt: now(),
    };
    s.requests.push(r);
    return r;
  }
  async job(requestId, task, targetId, prepare, work, success, failure) {
    const objectKey = task + ":" + targetId;
    ensure(
      !this.inflight.has(requestId) && !this.objectLocks.has(objectKey),
      "BUSY",
      409,
    );
    this.inflight.add(requestId);
    this.objectLocks.add(objectKey);
    let context,
      skip = false;
    try {
      this.store.mutate((s) => {
        const r = this.request(s, requestId, task, targetId);
        if (r.status === "completed") {
          skip = true;
          return;
        }
        context = prepare(s, r);
        r.status = "pending";
        delete r.error;
      });
      if (skip) return;
      const result = await work(context);
      this.store.mutate((s) => {
        success(s, result, context);
        const r = s.requests.find((r) => r.id === requestId);
        r.status = "completed";
        r.completedAt = now();
      });
    } catch (e) {
      const error = e.code || "SAVE_FAILED";
      try {
        this.store.mutate((s) => {
          const r = s.requests.find((r) => r.id === requestId);
          if (r && r.status !== "completed") {
            r.status = "failed";
            r.error = error;
          }
          if (context) failure(s, error, context);
        });
      } catch {
        /* HTTP layer still reports saving failure. */
      }
      throw e;
    } finally {
      this.inflight.delete(requestId);
      this.objectLocks.delete(objectKey);
    }
  }
  async generate(cid, requestId, diagnosticId = null) {
    let reservedFamily;
    try {
      await this.job(
        requestId,
        "generate",
        cid,
        (s) => {
          const c = this.conversation(s, cid);
          ensure(c.generationStatus !== "pending", "BUSY", 409);
          const active =
            c.currentQuestionId && this.question(s, c.currentQuestionId);
          ensure(
            !active ||
              ![...active.attempts, ...active.followups].some(
                (a) => a.status === "pending",
              ),
            "BUSY",
            409,
          );
          const d = diagnosticId
            ? s.diagnostics.find((d) => d.id === diagnosticId)
            : null;
          ensure(!c.activeDiagnosticId || d, "DIAGNOSTIC_REQUIRED");
          const config = structuredClone(d?.config ?? c.config);
          if (d?.questionIds.length) {
            const previous = this.question(s, d.questionIds.at(-1));
            const feedback = previous.attempts.at(-1)?.feedback;
            if (feedback?.valid)
              config.level = Math.max(
                1,
                Math.min(
                  5,
                  previous.snapshot.level +
                    (feedback.total >= 85 ? 1 : feedback.total < 60 ? -1 : 0),
                ),
              );
          }
          if (!d && config.mode === "auto") {
            const roll = Math.random();
            if (roll < 0.15) config.level = Math.max(1, config.level - 1);
            else if (roll > 0.85) config.level = Math.min(5, config.level + 1);
          }
          if (d) {
            ensure(
              d.status === "active" && d.questionIds.length < 5,
              "CONFLICT",
              409,
            );
            d.busy = true;
            delete d.error;
          }
          c.generationStatus = "pending";
          delete c.generationError;
          return {
            cid,
            diagnosticId,
            config,
            epoch: c.epoch || 0,
            recent: s.questions
              .filter((q) => q.conversationId === cid)
              .slice(-20)
              .map((q) => ({ source: q.source, knowledge: q.knowledge })),
          };
        },
        async (ctx) => {
          const local = this.corpus?.select({
            config: ctx.config,
            purpose: diagnosticId ? "diagnostic" : "practice",
            seen: [
              ...this.store.read().questions,
              ...[...this.reservedFamilies].map((groupId) => ({
                metadata: { groupId },
              })),
            ],
          });
          if (local) {
            reservedFamily = local.metadata.groupId;
            this.reservedFamilies.add(reservedFamily);
            return local;
          }
          const result = await this.ai.call("generate", {
            config: ctx.config,
            recent: ctx.recent,
            diagnostic: !!diagnosticId,
          });
          return {
            ...result,
            metadata: {
              ...result.metadata,
              origin: "ai-generated",
              fallbackReason: this.corpus
                ? "no-matching-local-task"
                : "corpus-disabled",
            },
          };
        },
        (s, result, ctx) => {
          ensure(
            !ctx.recent.some(
              (q) =>
                q.source.trim().toLocaleLowerCase() ===
                result.source.trim().toLocaleLowerCase(),
            ),
            "AI_DUPLICATE",
            502,
          );
          const c = this.conversation(s, cid);
          const q = {
            id: id(),
            conversationId: cid,
            diagnosticId,
            epoch: ctx.epoch,
            source: result.source,
            context: result.context,
            reference: result.reference,
            knowledge: result.knowledge,
            snapshot: ctx.config,
            metadata: result.metadata,
            ...(result.rubric
              ? { rubric: result.rubric, provenance: result.provenance }
              : {}),
            attempts: [],
            followups: [],
            drafts: { answer: "", followup: "" },
            createdAt: now(),
          };
          s.questions.push(q);
          c.generationStatus = "completed";
          c.updatedAt = now();
          if (diagnosticId) {
            const d = s.diagnostics.find((d) => d.id === diagnosticId);
            d.questionIds.push(q.id);
            d.config.level = ctx.config.level;
            d.busy = false;
          } else c.currentQuestionId = q.id;
        },
        (s, error) => {
          const c = this.conversation(s, cid);
          c.generationStatus = "failed";
          c.generationError = error;
          if (diagnosticId) {
            const d = s.diagnostics.find((d) => d.id === diagnosticId);
            d.busy = false;
            d.error = error;
          }
        },
      );
    } finally {
      if (reservedFamily) this.reservedFamilies.delete(reservedFamily);
    }
  }
  async submit(qid, input) {
    const answer = text(input.answer);
    const requestId = input.requestId;
    let aid;
    this.store.mutate((s) => {
      const q = this.question(s, qid);
      const r = s.requests.find((r) => r.id === requestId);
      if (r) {
        ensure(
          r.task === "grade" && q.attempts.some((a) => a.id === r.targetId),
          "CONFLICT",
          409,
        );
        aid = r.targetId;
        return;
      }
      ensure(!q.attempts.some((a) => a.status === "pending"), "BUSY", 409);
      if (q.diagnosticId) {
        const d = s.diagnostics.find((d) => d.id === q.diagnosticId);
        ensure(
          d.status === "active" &&
            !q.attempts.some((a) => a.status === "completed" && a.valid),
          "CONFLICT",
          409,
        );
      }
      const c = this.conversation(s, q.conversationId),
        kind =
          input.kind === "review"
            ? "review"
            : q.attempts.length
              ? "revision"
              : "first";
      const a = {
        id: id(),
        questionId: qid,
        answer,
        kind,
        inputMethod: input.inputMethod === "voice" ? "voice" : "text",
        previousAttemptId: q.attempts.at(-1)?.id ?? null,
        status: "pending",
        eligible:
          !q.diagnosticId &&
          kind === "first" &&
          c.currentQuestionId === qid &&
          c.config.target === q.snapshot.target &&
          c.config.role === q.snapshot.role &&
          (c.epoch || 0) === (q.epoch || 0),
        createdAt: now(),
      };
      aid = a.id;
      q.attempts.push(a);
      q.drafts.answer = "";
      this.request(s, requestId, "grade", aid);
    });
    await this.grade(qid, aid, requestId);
    return aid;
  }
  async retryAttempt(qid, aid) {
    const q = this.question(this.store.read(), qid);
    ensure(
      q.attempts.some((a) => a.id === aid),
      "NOT_FOUND",
      404,
    );
    return this.grade(qid, aid, id());
  }
  async grade(qid, aid, requestId) {
    await this.job(
      requestId,
      "grade",
      aid,
      (s) => {
        const q = this.question(s, qid),
          a = q.attempts.find((a) => a.id === aid);
        ensure(a, "NOT_FOUND", 404);
        if (a.status === "completed") throw new AppError("CONFLICT", 409);
        a.status = "pending";
        delete a.error;
        return {
          question: {
            source: q.source,
            context: q.context,
            snapshot: q.snapshot,
            ...(q.rubric ? { rubric: structuredClone(q.rubric) } : {}),
          },
          answer: a.answer,
        };
      },
      (ctx) => this.ai.call("grade", ctx),
      (s, result) => {
        const q = this.question(s, qid),
          a = q.attempts.find((a) => a.id === aid);
        a.feedback = { id: id(), ...result, createdAt: now() };
        a.status = "completed";
        a.valid = result.valid;
        if (!q.diagnosticId) {
          const c = this.conversation(s, q.conversationId);
          if (
            c.config.target === q.snapshot.target &&
            c.config.role === q.snapshot.role &&
            (c.epoch || 0) === (q.epoch || 0)
          )
            updateDifficulty(c, a);
        }
      },
      (s, error) => {
        const a = this.question(s, qid).attempts.find((a) => a.id === aid);
        a.status = "failed";
        a.error = error;
      },
    );
  }
  async followup(qid, input) {
    const content = text(input.text);
    let fid;
    this.store.mutate((s) => {
      const q = this.question(s, qid);
      ensure(!q.diagnosticId, "DIAGNOSTIC_REQUIRED");
      const old = s.requests.find((r) => r.id === input.requestId);
      if (old) {
        ensure(
          old.task === "followup" &&
            q.followups.some((f) => f.id === old.targetId),
          "CONFLICT",
          409,
        );
        fid = old.targetId;
        return;
      }
      ensure(!q.followups.some((f) => f.status === "pending"), "BUSY", 409);
      const a = q.attempts.find((a) => a.id === input.attemptId);
      ensure(a?.feedback, "FEEDBACK_REQUIRED");
      const f = {
        id: id(),
        attemptId: a.id,
        text: content,
        status: "pending",
        createdAt: now(),
      };
      fid = f.id;
      q.followups.push(f);
      q.drafts.followup = "";
      this.request(s, input.requestId, "followup", fid);
    });
    return this.answerFollowup(qid, fid, input.requestId);
  }
  async answerFollowup(qid, fid, requestId = id()) {
    await this.job(
      requestId,
      "followup",
      fid,
      (s) => {
        const q = this.question(s, qid),
          f = q.followups.find((f) => f.id === fid);
        ensure(f, "NOT_FOUND", 404);
        ensure(f.status !== "completed", "CONFLICT", 409);
        f.status = "pending";
        delete f.error;
        const a = q.attempts.find((a) => a.id === f.attemptId);
        return {
          question: {
            source: q.source,
            context: q.context,
            snapshot: q.snapshot,
            ...(q.rubric ? { rubric: structuredClone(q.rubric) } : {}),
          },
          answer: a.answer,
          feedback: a.feedback,
          questionFromLearner: f.text,
          history: q.followups
            .filter((x) => x.status === "completed")
            .slice(-6)
            .map((x) => ({ question: x.text, answer: x.answer })),
        };
      },
      (ctx) => this.ai.call("followup", ctx),
      (s, result) => {
        const f = this.question(s, qid).followups.find((f) => f.id === fid);
        Object.assign(f, {
          answer: result.answer,
          metadata: result.metadata,
          status: "completed",
        });
      },
      (s, error) => {
        const f = this.question(s, qid).followups.find((f) => f.id === fid);
        f.status = "failed";
        f.error = error;
      },
    );
  }
  favorite({ type, objectId, on }) {
    this.store.mutate((s) => {
      ensure(type === "question" || type === "feedback", "INVALID_INPUT");
      ensure(
        type === "question"
          ? s.questions.some((q) => q.id === objectId && !q.diagnosticId)
          : s.questions.some(
              (q) =>
                !q.diagnosticId &&
                q.attempts.some((a) => a.id === objectId && a.feedback),
            ),
        "NOT_FOUND",
        404,
      );
      const existing = s.favorites.find(
        (f) => f.type === type && f.objectId === objectId,
      );
      if (on && !existing)
        s.favorites.push({ id: id(), type, objectId, createdAt: now() });
      if (!on && existing)
        s.favorites = s.favorites.filter((f) => f.id !== existing.id);
    });
  }
  async startDiagnostic(cid) {
    let did;
    this.store.mutate((s) => {
      const c = this.conversation(s, cid);
      ensure(!c.activeDiagnosticId, "DIAGNOSTIC_REQUIRED");
      const d = {
        id: id(),
        conversationId: cid,
        config: structuredClone(c.config),
        questionIds: [],
        status: "active",
        busy: false,
        createdAt: now(),
      };
      s.diagnostics.push(d);
      did = d.id;
      c.activeDiagnosticId = did;
    });
    await this.generate(cid, id(), did);
    return did;
  }
  async advanceDiagnostic(did) {
    const s = this.store.read(),
      d = s.diagnostics.find((d) => d.id === did);
    ensure(d && d.status === "active", "NOT_FOUND", 404);
    ensure(!d.busy, "BUSY", 409);
    const q = d.questionIds.length
      ? this.question(s, d.questionIds.at(-1))
      : null;
    if (q) {
      const a = q.attempts.at(-1);
      ensure(a?.status === "completed", "ANSWER_REQUIRED");
      ensure(a.feedback.valid, "ANSWER_INVALID");
    }
    if (d.questionIds.length < 5)
      return this.generate(d.conversationId, id(), did);
    await this.job(
      id(),
      "diagnose",
      did,
      (s) => {
        const d = s.diagnostics.find((d) => d.id === did);
        ensure(!d.busy, "BUSY", 409);
        d.busy = true;
        delete d.error;
        return {
          config: d.config,
          answers: d.questionIds.map((qid) => {
            const q = this.question(s, qid);
            return {
              source: q.source,
              level: q.snapshot.level,
              answer: q.attempts.at(-1).answer,
              feedback: q.attempts.at(-1).feedback,
            };
          }),
        };
      },
      (ctx) => this.ai.call("diagnose", ctx),
      (s, result) => {
        const d = s.diagnostics.find((d) => d.id === did);
        d.result = result;
        d.status = "completed";
        d.busy = false;
        d.completedAt = now();
      },
      (s, error) => {
        const d = s.diagnostics.find((d) => d.id === did);
        d.busy = false;
        d.error = error;
      },
    );
  }
  async applyDiagnostic(did, { updateProfile = false, level } = {}) {
    let cid;
    this.store.mutate((s) => {
      const d = s.diagnostics.find((d) => d.id === did);
      ensure(d && d.status === "completed", "NOT_FOUND", 404);
      const c = this.conversation(s, d.conversationId);
      ensure(c.activeDiagnosticId === did, "CONFLICT", 409);
      const value = level ?? d.result.level;
      ensure(
        Number.isInteger(value) && value >= 1 && value <= 5,
        "INVALID_LEVEL",
      );
      if (updateProfile)
        s.profiles[d.config.target] = {
          level: value,
          source: "diagnostic",
          updatedAt: now(),
          diagnosticIds: [
            ...(s.profiles[d.config.target]?.diagnosticIds || []),
            did,
          ],
        };
      c.config.level = value;
      c.window = [];
      c.epoch = (c.epoch || 0) + 1;
      c.activeDiagnosticId = null;
      cid = c.id;
      d.appliedAt = now();
    });
    await this.generate(cid, id());
  }
  async skipDiagnostic(cid, level) {
    ensure(
      Number.isInteger(level) && level >= 1 && level <= 5,
      "INVALID_LEVEL",
    );
    this.store.mutate((s) => {
      const c = this.conversation(s, cid);
      if (c.activeDiagnosticId) {
        const d = s.diagnostics.find((d) => d.id === c.activeDiagnosticId);
        ensure(!d.busy, "BUSY", 409);
        d.status = "skipped";
        c.activeDiagnosticId = null;
      }
      c.config.level = level;
      c.window = [];
      c.epoch = (c.epoch || 0) + 1;
      if (!s.profiles[c.config.target])
        s.profiles[c.config.target] = {
          level,
          source: "self",
          updatedAt: now(),
          diagnosticIds: [],
        };
    });
    await this.generate(cid, id());
  }
  backupPreview(backup) {
    const s = validateBackup(backup);
    return {
      conversations: s.conversations.length,
      questions: s.questions.length,
      attempts: s.questions.reduce((n, q) => n + q.attempts.length, 0),
      favorites: s.favorites.length,
    };
  }
  importBackup(backup) {
    ensure(this.inflight.size === 0, "BUSY", 409);
    const s = validateBackup(backup);
    return this.store.restore(s);
  }
}
