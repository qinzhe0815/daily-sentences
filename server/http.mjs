import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { timingSafeEqual, randomBytes } from "node:crypto";
import { AppError, ensure } from "./model.mjs";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};
export function createApp(
  service,
  { publicDir = resolve("public"), runtime } = {},
) {
  const token = randomBytes(32).toString("hex");
  return createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    res.setHeader("Cache-Control", "no-store");
    try {
      const expectedHost = req.headers.host;
      ensure(
        expectedHost &&
          /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(expectedHost),
        "FORBIDDEN",
        403,
      );
      const url = new URL(req.url, `http://${expectedHost}`);
      const path = url.pathname;
      if (path.startsWith("/api/")) {
        ensure(
          !req.headers.origin ||
            req.headers.origin === `http://${expectedHost}`,
          "FORBIDDEN",
          403,
        );
        let input = {};
        if (req.method !== "GET") {
          const supplied = req.headers["x-local-token"];
          ensure(
            typeof supplied === "string" &&
              supplied.length === token.length &&
              timingSafeEqual(Buffer.from(supplied), Buffer.from(token)),
            "FORBIDDEN",
            403,
          );
          ensure(
            req.headers["content-type"]?.startsWith("application/json"),
            "INVALID_INPUT",
            415,
          );
          const chunks = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            ensure(size <= 25 * 1024 * 1024, "TOO_LARGE", 413);
            chunks.push(chunk);
          }
          try {
            input = JSON.parse(Buffer.concat(chunks).toString() || "{}");
          } catch {
            throw new AppError("INVALID_INPUT");
          }
        }
        let result = {};
        const method = req.method;
        const match = (pattern) => path.match(pattern);
        if (method === "GET" && path === "/api/state")
          result = {
            state: service.state(),
            ai: service.ai.status(),
            dataPath: service.store.path,
            token,
            runtime: runtime?.status(),
          };
        else if (method === "GET" && path === "/api/backup") {
          res.setHeader(
            "Content-Disposition",
            'attachment; filename="daily-sentences-backup.json"',
          );
          result = service.store.export();
        } else if (method === "POST" && path === "/api/backup/preview")
          result = service.backupPreview(input.backup);
        else if (method === "POST" && path === "/api/backup/import") {
          ensure(input.confirm === true, "CONFIRM_REQUIRED");
          result = { backupPath: service.importBackup(input.backup) };
        } else if (method === "PATCH" && path === "/api/settings")
          service.settings(input);
        else if (method === "PATCH" && path === "/api/ai")
          result = service.ai.save(input);
        else if (method === "POST" && path === "/api/ai/test")
          result = await service.ai.call("test", {});
        else if (method === "GET" && path === "/api/ai/models")
          result = { models: await service.ai.models() };
        else if (method === "POST" && path === "/api/local/setup") {
          ensure(runtime, "UNAVAILABLE", 503);
          result = runtime.setup();
        } else if (method === "POST" && path === "/api/local/start") {
          ensure(runtime, "UNAVAILABLE", 503);
          result = await runtime.start();
        } else if (method === "PATCH" && match(/^\/api\/profiles\/(zh|en|fr)$/))
          service.profile(
            match(/^\/api\/profiles\/(zh|en|fr)$/)[1],
            input.level,
          );
        else if (method === "POST" && path === "/api/conversations")
          result = await service.createConversation(input);
        else if (method === "PATCH" && match(/^\/api\/conversations\/([^/]+)$/))
          service.updateConversation(
            match(/^\/api\/conversations\/([^/]+)$/)[1],
            input,
          );
        else if (
          method === "POST" &&
          match(/^\/api\/conversations\/([^/]+)\/activate$/)
        )
          service.activate(
            match(/^\/api\/conversations\/([^/]+)\/activate$/)[1],
          );
        else if (
          method === "POST" &&
          match(/^\/api\/conversations\/([^/]+)\/next$/)
        )
          await service.generate(
            match(/^\/api\/conversations\/([^/]+)\/next$/)[1],
            input.requestId,
          );
        else if (
          method === "POST" &&
          match(/^\/api\/conversations\/([^/]+)\/diagnose$/)
        )
          await service.startDiagnostic(
            match(/^\/api\/conversations\/([^/]+)\/diagnose$/)[1],
          );
        else if (
          method === "POST" &&
          match(/^\/api\/conversations\/([^/]+)\/skip-diagnostic$/)
        )
          await service.skipDiagnostic(
            match(/^\/api\/conversations\/([^/]+)\/skip-diagnostic$/)[1],
            input.level,
          );
        else if (
          method === "PATCH" &&
          match(/^\/api\/questions\/([^/]+)\/draft$/)
        )
          service.draft(match(/^\/api\/questions\/([^/]+)\/draft$/)[1], input);
        else if (
          method === "POST" &&
          match(/^\/api\/questions\/([^/]+)\/submit$/)
        )
          result = {
            attemptId: await service.submit(
              match(/^\/api\/questions\/([^/]+)\/submit$/)[1],
              input,
            ),
          };
        else if (
          method === "POST" &&
          match(/^\/api\/questions\/([^/]+)\/attempts\/([^/]+)\/retry$/)
        ) {
          const m = match(
            /^\/api\/questions\/([^/]+)\/attempts\/([^/]+)\/retry$/,
          );
          await service.retryAttempt(m[1], m[2]);
        } else if (
          method === "POST" &&
          match(/^\/api\/questions\/([^/]+)\/followup$/)
        )
          await service.followup(
            match(/^\/api\/questions\/([^/]+)\/followup$/)[1],
            input,
          );
        else if (
          method === "POST" &&
          match(/^\/api\/questions\/([^/]+)\/followups\/([^/]+)\/retry$/)
        ) {
          const m = match(
            /^\/api\/questions\/([^/]+)\/followups\/([^/]+)\/retry$/,
          );
          await service.answerFollowup(m[1], m[2]);
        } else if (method === "POST" && path === "/api/favorites")
          service.favorite(input);
        else if (
          method === "POST" &&
          match(/^\/api\/diagnostics\/([^/]+)\/advance$/)
        )
          await service.advanceDiagnostic(
            match(/^\/api\/diagnostics\/([^/]+)\/advance$/)[1],
          );
        else if (
          method === "POST" &&
          match(/^\/api\/diagnostics\/([^/]+)\/apply$/)
        )
          await service.applyDiagnostic(
            match(/^\/api\/diagnostics\/([^/]+)\/apply$/)[1],
            input,
          );
        else throw new AppError("NOT_FOUND", 404);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(result));
        return;
      }
      ensure(req.method === "GET", "NOT_FOUND", 404);
      const relative =
        path === "/" ? "index.html" : decodeURIComponent(path).slice(1);
      const file = resolve(publicDir, relative);
      ensure(file.startsWith(publicDir + "/"), "NOT_FOUND", 404);
      ensure(TYPES[extname(file)], "NOT_FOUND", 404);
      const data = await readFile(file);
      res.setHeader("Content-Type", TYPES[extname(file)]);
      res.end(data);
    } catch (e) {
      res.statusCode = e.status || (e.code === "ENOENT" ? 404 : 500);
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error:
            e instanceof AppError
              ? e.code
              : e.code === "ENOENT"
                ? "NOT_FOUND"
                : "SAVE_FAILED",
        }),
      );
    }
  });
}
