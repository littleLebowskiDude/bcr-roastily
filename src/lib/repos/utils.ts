import crypto from "node:crypto";

export const nowIso = () => new Date().toISOString();
export const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
export const toIsoString = (value: any) =>
  value instanceof Date ? value.toISOString() : typeof value === "string" ? value : String(value);
