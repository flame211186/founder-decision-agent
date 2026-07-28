import { createHash, randomUUID } from "node:crypto";

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function stableSafetyIdentifier(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
