import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateRuleset, type RulesetConfig } from "./schema.js";

export * from "./schema.js";

const RULESETS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "rulesets");

/** Load and validate a ruleset JSON by id (e.g. "reg-m-b"). */
export async function loadRuleset(id: string): Promise<{
  config: RulesetConfig;
  validation: ReturnType<typeof validateRuleset>;
}> {
  const raw = await readFile(join(RULESETS_DIR, `${id}.json`), "utf8");
  const config = JSON.parse(raw) as RulesetConfig;
  return { config, validation: validateRuleset(config) };
}
