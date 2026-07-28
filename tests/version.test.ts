import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VERSION } from "../src/version.js";

describe("release version", () => {
  it("matches package.json", () => {
    const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      version: string;
    };
    expect(VERSION).toBe(packageJson.version);
  });
});
