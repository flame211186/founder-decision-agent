import { access, readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const skipped = new Set([".git", "coverage", "dist", "node_modules"]);
const markdownFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && entry.name.endsWith(".md")) markdownFiles.push(path);
  }
}

await walk(root);

const failures = [];
const linkPattern = /\[[^\]]*]\(([^)]+)\)/g;
for (const file of markdownFiles) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(linkPattern)) {
    let target = match[1]?.trim() ?? "";
    if (
      !target ||
      target.startsWith("#") ||
      /^[a-z][a-z0-9+.-]*:/i.test(target)
    ) {
      continue;
    }
    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1);
    }
    target = target.split("#", 1)[0] ?? "";
    if (!target) continue;
    try {
      await access(resolve(dirname(file), decodeURIComponent(target)));
    } catch {
      failures.push(`${file.slice(root.length + 1)} -> ${target}`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`Broken local Markdown links:\n${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `${JSON.stringify({ markdownFiles: markdownFiles.length, status: "passed" })}\n`
  );
}
