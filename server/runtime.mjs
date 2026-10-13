import {
  existsSync,
  mkdirSync,
  createWriteStream,
  createReadStream,
  rmSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { AppError, ensure } from "./model.mjs";
const exec = promisify(execFile);
const RELEASE = {
  version: "v0.40.3",
  url: "https://api.github.com/repos/ollama/ollama/releases/assets/629762492",
  sha256: "a2d1d906a2c8febd9cb18f5c183854d0a6db5dc522940d68b0c0ed048e8dfdea",
};
export class LocalRuntime {
  constructor(directory) {
    this.directory = resolve(directory);
    this.progress = { stage: "idle", completed: 0, total: 0 };
    this.child = null;
    this.running = false;
    this.task = null;
  }
  status() {
    return {
      ...this.progress,
      supported: process.platform === "darwin",
      installed: !!this.binary(),
      running: this.running,
      model: "qwen3.5:4b-q4_K_M",
    };
  }
  binary() {
    for (const p of [
      join(this.directory, "runtime", "ollama"),
      join(this.directory, "runtime", "bin", "ollama"),
      "/opt/homebrew/bin/ollama",
      "/usr/local/bin/ollama",
      "/Applications/Ollama.app/Contents/Resources/ollama",
    ])
      if (existsSync(p)) return p;
    return null;
  }
  async reachable() {
    try {
      const r = await fetch("http://127.0.0.1:11434/api/version", {
        signal: AbortSignal.timeout(1500),
      });
      return r.ok;
    } catch {
      return false;
    }
  }
  async start() {
    if (await this.reachable()) {
      this.running = true;
      return this.status();
    }
    const binary = this.binary();
    ensure(binary, "UNAVAILABLE", 503);
    mkdirSync(join(this.directory, "models"), { recursive: true });
    this.progress.stage = "starting";
    this.child = spawn(binary, ["serve"], {
      env: {
        ...process.env,
        OLLAMA_HOST: "127.0.0.1:11434",
        OLLAMA_MODELS: join(this.directory, "models"),
        OLLAMA_NO_CLOUD: "1",
      },
      stdio: "ignore",
    });
    this.child.on("error", () => {
      this.running = false;
      this.progress = { stage: "failed", error: "UNAVAILABLE" };
    });
    this.child.on("exit", () => {
      this.running = false;
      this.child = null;
    });
    for (let i = 0; i < 40; i++) {
      if (await this.reachable()) {
        this.running = true;
        this.progress.stage = "idle";
        return this.status();
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new AppError("AI_NETWORK", 503);
  }
  setup() {
    if (this.task) return this.status();
    this.task = this.provision()
      .catch((e) => {
        this.progress = { stage: "failed", error: e.code || "AI_NETWORK" };
      })
      .finally(() => {
        this.task = null;
      });
    return this.status();
  }
  async provision() {
    if (!this.binary() && !(await this.reachable())) {
      ensure(process.platform === "darwin", "UNAVAILABLE", 503);
      const dir = join(this.directory, "runtime");
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const archive = join(dir, "ollama.tgz.part");
      this.progress = { stage: "runtime", completed: 0, total: 167455486 };
      try {
        const response = await fetch(RELEASE.url, {
          headers: { Accept: "application/octet-stream" },
          signal: AbortSignal.timeout(300000),
        });
        ensure(response.ok, "AI_NETWORK", 502);
        const runtime = this;
        const total =
          Number(response.headers.get("content-length")) || 167455486;
        runtime.progress.total = total;
        await pipeline(
          Readable.fromWeb(response.body),
          async function* (source) {
            for await (const chunk of source) {
              runtime.progress.completed += chunk.length;
              yield chunk;
            }
          },
          createWriteStream(archive, { mode: 0o600 }),
        );
        const hash = createHash("sha256");
        for await (const chunk of createReadStream(archive)) hash.update(chunk);
        ensure(hash.digest("hex") === RELEASE.sha256, "DOWNLOAD_INVALID", 502);
        const listing = await exec("tar", ["-tzf", archive], {
          maxBuffer: 4 * 1024 * 1024,
        });
        ensure(
          listing.stdout
            .split("\n")
            .every((p) => !p.startsWith("/") && !p.split("/").includes("..")),
          "DOWNLOAD_INVALID",
          502,
        );
        await exec("tar", ["-xzf", archive, "-C", dir]);
      } finally {
        rmSync(archive, { force: true });
      }
    }
    this.progress = { stage: "starting", completed: 0, total: 0 };
    await this.start();
    this.progress = { stage: "model", completed: 0, total: 0 };
    const response = await fetch("http://127.0.0.1:11434/api/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "qwen3.5:4b-q4_K_M", stream: true }),
      signal: AbortSignal.timeout(3600000),
    });
    ensure(response.ok, "AI_SERVICE", 502);
    const reader = response.body.getReader(),
      decoder = new TextDecoder();
    let buffer = "",
      success = false;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        const p = JSON.parse(line);
        ensure(!p.error, "AI_SERVICE", 502);
        if (p.total)
          this.progress = {
            stage: "model",
            completed: p.completed || 0,
            total: p.total,
          };
        if (p.status === "success") success = true;
      }
    }
    ensure(success, "AI_SERVICE", 502);
    this.progress = { stage: "ready", completed: 0, total: 0 };
    return this.status();
  }
  stop() {
    this.child?.kill();
    this.child = null;
  }
}
