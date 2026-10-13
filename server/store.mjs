import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync, writeFileSync, renameSync } from "node:fs";
import { join, resolve } from "node:path";
import { initialState, recoverInterrupted, now } from "./model.mjs";
export class Store {
  constructor(directory) {
    this.directory = resolve(directory);
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    this.path = join(this.directory, "learning.sqlite");
    this.db = new DatabaseSync(this.path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL);",
    );
    this.db
      .prepare("INSERT OR IGNORE INTO state VALUES (1, ?)")
      .run(JSON.stringify(initialState()));
    chmodSync(this.path, 0o600);
    this.mutate((s) => recoverInterrupted(s));
  }
  read() {
    return JSON.parse(
      this.db.prepare("SELECT json FROM state WHERE id=1").get().json,
    );
  }
  mutate(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const s = this.read();
      const result = fn(s);
      s.revision = (s.revision || 0) + 1;
      this.db
        .prepare("UPDATE state SET json=? WHERE id=1")
        .run(JSON.stringify(s));
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  export() {
    return {
      format: "daily-sentences",
      version: 1,
      exportedAt: now(),
      state: this.read(),
    };
  }
  restore(state) {
    const stamp = Date.now();
    const backup = join(this.directory, `before-import-${stamp}.json`);
    writeFileSync(backup + ".tmp", JSON.stringify(this.export()), {
      mode: 0o600,
    });
    renameSync(backup + ".tmp", backup);
    this.mutate((s) => {
      for (const k of Object.keys(s)) delete s[k];
      Object.assign(s, recoverInterrupted(structuredClone(state)));
    });
    return backup;
  }
  close() {
    this.db.close();
  }
}
