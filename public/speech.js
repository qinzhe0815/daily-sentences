export class Dictation {
  constructor({ getDraft, setDraft, onChange }) {
    this.getDraft = getDraft;
    this.setDraft = setDraft;
    this.onChange = onChange;
    this.status = "idle";
    this.message = "";
    this.canUndo = false;
    this.recognition = null;
    this.session = null;
  }
  snapshot() {
    return {
      status: this.status,
      message: this.message,
      canUndo: this.canUndo,
    };
  }
  start(qid, language) {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      this.message = "voiceUnsupported";
      this.onChange();
      return;
    }
    this.cancel();
    const r = new Recognition();
    const session = { r, qid, words: [], cancelled: false, timer: null };
    this.session = session;
    this.recognition = r;
    this.canUndo = false;
    this.status = "recording";
    this.message = "";
    r.lang = { zh: "zh-CN", en: "en-US", fr: "fr-FR" }[language];
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      if (this.session !== session || session.cancelled) return;
      for (let i = e.resultIndex; i < e.results.length; i++)
        if (e.results[i].isFinal) session.words[i] = e.results[i][0].transcript;
    };
    r.onerror = () => {
      if (this.session === session && !session.cancelled)
        this.message = "voiceFailed";
    };
    r.onend = () => {
      clearTimeout(session.timer);
      if (this.session !== session || session.cancelled) return;
      this.status = "idle";
      this.recognition = null;
      this.session = null;
      const words = session.words.filter(Boolean).join(" ").trim();
      if (words) {
        const old = this.getDraft(qid, "answer");
        this.added = (old && !/\s$/.test(old) ? " " : "") + words;
        this.undoQid = qid;
        this.setDraft(qid, "answer", old + this.added);
        this.canUndo = true;
        if (!this.message) this.message = "voiceDone";
      } else if (!this.message) this.message = "voiceFailed";
      this.onChange();
    };
    try {
      r.start();
      session.timer = setTimeout(() => {
        if (this.session === session) this.stop();
      }, 60000);
    } catch {
      this.status = "idle";
      this.recognition = null;
      this.session = null;
      this.message = "voiceFailed";
    }
    this.onChange();
  }
  stop() {
    if (this.recognition) {
      this.status = "transcribing";
      this.recognition.stop();
      this.onChange();
    }
  }
  cancel() {
    const s = this.session;
    if (s) {
      s.cancelled = true;
      clearTimeout(s.timer);
      this.session = null;
      this.recognition = null;
      s.r.abort();
    }
    this.status = "idle";
    this.message = "";
    this.onChange();
  }
  undo() {
    if (this.canUndo) {
      const current = this.getDraft(this.undoQid, "answer");
      if (current.endsWith(this.added))
        this.setDraft(
          this.undoQid,
          "answer",
          current.slice(0, -this.added.length),
        );
      this.canUndo = false;
      this.message = "";
      this.onChange();
    }
  }
}
