// lib/mfaEmail.ts
// Server-only. Lets the app compute the *current* TOTP code for a user who
// chose "email me a code" instead of scanning into an authenticator app.
//
// How this stays a real, Supabase-verified sign-in (not a parallel, weaker
// system): the factor created at enrollment is a genuine Supabase TOTP
// factor. Supabase only returns the shared secret once, at enrollment time,
// so if the user wants it delivered by email instead of into an app, we
// capture that same secret and store it (encrypted) ourselves. At sign-in
// time we compute the current 6-digit code from that secret -- the exact
// same value an authenticator app would show -- email it, and the user
// submits it through the same supabase.auth.mfa.challenge()/verify() call
// used for app-based TOTP. Because it's the real code for the real factor,
// Supabase's own verify() accepts it and issues a genuine aal2 session, so
// no changes are needed anywhere the app already checks for aal2.
//
// Never import this file from a Client Component -- it only makes sense
// alongside the service-role key, inside API routes.

import crypto from "crypto"

const ENC_ALGO = "aes-256-gcm"

function getEncryptionKey(): Buffer {
  const b64 = process.env.MFA_EMAIL_ENCRYPTION_KEY
  if (!b64) {
    throw new Error("MFA_EMAIL_ENCRYPTION_KEY is not set")
  }
  const key = Buffer.from(b64, "base64")
  if (key.length !== 32) {
    throw new Error("MFA_EMAIL_ENCRYPTION_KEY must decode to exactly 32 bytes")
  }
  return key
}

// Encrypts a TOTP secret for storage. Output format: base64(iv):base64(authTag):base64(ciphertext)
export function encryptSecret(plainSecret: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12) // GCM standard IV size
  const cipher = crypto.createCipheriv(ENC_ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plainSecret, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":")
}

export function decryptSecret(stored: string): string {
  const key = getEncryptionKey()
  const [ivB64, tagB64, dataB64] = stored.split(":")
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted secret")
  }
  const iv = Buffer.from(ivB64, "base64")
  const authTag = Buffer.from(tagB64, "base64")
  const ciphertext = Buffer.from(dataB64, "base64")
  const decipher = crypto.createDecipheriv(ENC_ALGO, key, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString("utf8")
}

// Standard RFC 4648 base32 alphabet used by TOTP secrets (what Supabase
// returns and what every authenticator app expects).
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, "").toUpperCase().replace(/\s+/g, "")
  let bits = ""
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx === -1) continue
    bits += idx.toString(2).padStart(5, "0")
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

// RFC 6238 TOTP: 6-digit code, 30-second step, SHA-1 -- matches Supabase's
// own TOTP factor defaults (and what every authenticator app assumes).
export function computeTotp(base32Secret: string, stepSeconds = 30, digits = 6): string {
  const key = base32Decode(base32Secret)
  const counter = Math.floor(Date.now() / 1000 / stepSeconds)

  const counterBuf = Buffer.alloc(8)
  // Write the 64-bit counter big-endian (split into two 32-bit halves since
  // Node's writeBigUInt64BE needs a BigInt; this avoids that dependency).
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  counterBuf.writeUInt32BE(counter % 0x100000000, 4)

  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const code = (binCode % 10 ** digits).toString().padStart(digits, "0")
  return code
}