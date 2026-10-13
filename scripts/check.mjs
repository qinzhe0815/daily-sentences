import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
let failed = false;
for (const dir of ["server", "public", "scripts", "tests"])
  for (const file of readdirSync(dir))
    if (/\.(mjs|js)$/.test(file)) {
      const r = spawnSync(process.execPath, ["--check", `${dir}/${file}`], {
        stdio: "inherit",
      });
      if (r.status) failed = true;
    }
process.exitCode = failed ? 1 : 0;
