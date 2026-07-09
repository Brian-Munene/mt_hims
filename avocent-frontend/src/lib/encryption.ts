import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const NONCE_LENGTH = 12;

interface EncryptionEnvelope {
  alg: "AES-256-GCM";
  nonce: string;
  ciphertext: string;
}

function getKey(): Buffer | null {
  const rawKey = process.env.API_ENCRYPTION_KEY;

  if (!rawKey) {
    return null;
  }

  const key = Buffer.from(rawKey, "base64");
  if (key.length !== 32) {
    throw new Error("API_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }

  return key;
}

export function encryptJson(data: unknown, aad: string): EncryptionEnvelope | unknown {
  const key = getKey();
  if (!key) {
    return data;
  }

  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, nonce);
  cipher.setAAD(Buffer.from(aad, "utf8"));

  const payload = Buffer.from(JSON.stringify(data), "utf8");
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final(), cipher.getAuthTag()]);

  return {
    alg: "AES-256-GCM",
    nonce: nonce.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}

export function decryptJson<T>(data: unknown, aad: string): T {
  const key = getKey();
  if (!key) {
    return data as T;
  }

  const envelope = data as EncryptionEnvelope;
  const nonce = Buffer.from(envelope.nonce, "base64");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const message = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = createDecipheriv(ALGORITHM, key, nonce);

  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(message), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted) as T;
}

