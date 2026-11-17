import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Same parameters and "<hex salt>:<hex key>" format Better Auth used, so
// passwords of accounts created before the switch still verify.
const N = 16384;
const r = 16;
const p = 1;
const KEY_LENGTH = 64;

function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_LENGTH,
      { N, r, p, maxmem: 128 * N * r * 2 },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(hash, password) {
  const [salt, keyHex] = hash.split(":");
  const expected = Buffer.from(keyHex ?? "", "hex");
  const actual = await deriveKey(password, salt ?? "");
  // Constant-time compare, so timing doesn't leak how many bytes matched.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
