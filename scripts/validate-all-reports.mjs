#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const root = resolve(import.meta.dirname, "..");
const schema = JSON.parse(
  readFileSync(resolve(root, "schemas/evaluation-report.v1.schema.json"), "utf8")
);
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const caseRoot = resolve(root, "evals/cases");
const failures = [];
let count = 0;

for (const directory of readdirSync(caseRoot, { withFileTypes: true })) {
  if (!directory.isDirectory()) continue;
  const path = resolve(caseRoot, directory.name, "report.json");
  let report;
  try {
    report = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    continue;
  }
  count += 1;
  if (!validate(report)) {
    failures.push(`${directory.name}: ${ajv.errorsText(validate.errors)}`);
    continue;
  }
  const semantic = spawnSync(
    process.execPath,
    [resolve(root, "scripts/validate-report-semantics.mjs"), path],
    { encoding: "utf8" }
  );
  if (semantic.status !== 0) failures.push(`${directory.name}: ${semantic.stderr}`);
}

if (failures.length) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`${JSON.stringify({ reports: count, status: "passed" })}\n`);
