import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve from the service module, never the launcher’s working directory.
 * Supports source modules and the bundled dist/index.mjs without copying data.
 */
export function resolveDataDirectory(moduleUrl = import.meta.url): string {
  let directory = path.dirname(fileURLToPath(moduleUrl));
  while (true) {
    const candidate = path.join(directory, "data");
    if (existsSync(candidate) && existsSync(path.join(directory, "package.json"))) return candidate;
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error("FutureNow source data directory is unavailable.");
    directory = parent;
  }
}
