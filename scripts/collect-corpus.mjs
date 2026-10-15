import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { collectionURL } from "./corpus-tools.mjs";
const root = fileURLToPath(new URL("../corpus/sources/", import.meta.url));
mkdirSync(root, { recursive: true });
const manifestPath = root + "manifest.json";
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : {
      schemaVersion: 1,
      provider: "Tatoeba official API v1",
      apiDocumentation: "https://api.tatoeba.org/openapi.json",
      requests: [],
    };
for (const [source, target] of [
  ["eng", "cmn"],
  ["fra", "cmn"],
  ["eng", "fra"],
]) {
  for (const range of ["3-7", "8-12", "13-18", "19-25", "26-45"]) {
    for (const recent of [false, true]) {
      const file = `${source}-${target}-${range}${recent ? "-recent" : ""}.json`;
      if (
        manifest.requests.some((r) => r.file === file) &&
        existsSync(root + file)
      ) {
        console.log("cached", file);
        continue;
      }
      const requestURL = new URL(collectionURL(source, target, range));
      if (recent) requestURL.searchParams.set("sort", "created");
      const url = requestURL.href;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(45000),
        headers: {
          "User-Agent":
            "DailySentencesCorpus/1.0 (educational open-data collection)",
        },
      });
      if (!response.ok) throw new Error(`Tatoeba ${response.status}: ${file}`);
      const raw = await response.text(),
        data = JSON.parse(raw);
      if (!Array.isArray(data.data))
        throw new Error("Invalid upstream response");
      writeFileSync(root + file, raw + "\n");
      manifest.requests.push({
        file,
        url,
        retrievedAt: new Date().toISOString(),
        sha256: createHash("sha256")
          .update(raw + "\n")
          .digest("hex"),
        sentences: data.data.length,
      });
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
      console.log(file, data.data.length);
      await new Promise((r) => setTimeout(r, 1100));
    }
  }
}
