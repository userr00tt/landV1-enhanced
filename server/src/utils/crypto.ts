import crypto from 'crypto';

const ALG = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = process.env.CHAT_ENCRYPTION_KEY || '';
  if (!raw) {
    if (process.env.NODE_ENV !== 'production') {
      const tmp = crypto.randomBytes(32);
      return tmp;
    }
    throw new Error('CHAT_ENCRYPTION_KEY missing');
  }
  try {
    if (/^[A-Fa-f0-9]+$/.test(raw) && (raw.length === 64)) {
      return Buffer.from(raw, 'hex');
    }
    const b64 = Buffer.from(raw, 'base64');
    if (b64.length === 32) return b64;
  } catch {}
  throw new Error('CHAT_ENCRYPTION_KEY must be 32 bytes (base64 or hex)');
}

export function encrypt(text: string): { ciphertext: Buffer; iv: Buffer; authTag: Buffer } {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: enc, iv, authTag: tag };
}

export function decrypt(ciphertext: Buffer, iv: Buffer, authTag: Buffer): string {
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(authTag);
  const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return dec.toString('utf8');
}
