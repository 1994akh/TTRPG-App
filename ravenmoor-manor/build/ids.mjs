import { createHash } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Encode bytes as base62.
 * @param {Buffer} bytes
 * @returns {string}
 */
function base62(bytes) {
  let n = BigInt(`0x${bytes.toString("hex")}`);
  let out = "";
  while ( n > 0n ) {
    out = ALPHABET[Number(n % 62n)] + out;
    n /= 62n;
  }
  return out;
}

const seen = new Map();

/**
 * Deterministic 16-character document id derived from a stable key, e.g. "actor:quill".
 * id = base62(sha256("ravenmoor:" + key)).slice(0, 16)
 * @param {string} key
 * @returns {string}
 */
export function id(key) {
  const out = base62(createHash("sha256").update(`ravenmoor:${key}`).digest()).slice(0, 16);
  const prior = seen.get(out);
  if ( prior && (prior !== key) ) throw new Error(`Id collision between "${prior}" and "${key}"`);
  seen.set(out, key);
  return out;
}
