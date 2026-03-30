import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';
import { DISPATCH_ROLES, type UserRole } from '../types/auth.js';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

function getMfaIssuer(): string {
  return process.env.MFA_ISSUER?.trim() || 'Xypes CIRS';
}

function getMfaEncryptionKey(): Buffer {
  const secret = process.env.MFA_ENCRYPTION_KEY?.trim();
  if (!secret) {
    throw new Error('MFA_ENCRYPTION_KEY must be configured to use MFA');
  }

  return createHash('sha256').update(secret).digest();
}

function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const key = getMfaEncryptionKey();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

function decryptSecret(payload: string): string {
  const [ivHex, tagHex, ciphertextHex] = payload.split(':');
  if (!ivHex || !tagHex || !ciphertextHex) {
    throw new Error('Invalid MFA secret payload');
  }

  const key = getMfaEncryptionKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

export function requiresMfaForRole(role: UserRole): boolean {
  return DISPATCH_ROLES.includes(role);
}

function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(input: string): Buffer {
  const normalized = input.replace(/=+$/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      throw new Error('Invalid base32 MFA secret');
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function createTotpToken(secret: string, timestampMs: number): string {
  const counter = Math.floor(timestampMs / 1000 / TOTP_PERIOD_SECONDS);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

function createOtpAuthUrl(accountName: string, secret: string): string {
  const issuerName = getMfaIssuer();
  const label = `${encodeURIComponent(issuerName)}:${encodeURIComponent(accountName)}`;
  const issuer = encodeURIComponent(issuerName);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
}

export function createMfaSetup(accountName: string): {
  secret: string;
  encryptedSecret: string;
  otpauthUrl: string;
  issuer: string;
} {
  const secret = encodeBase32(randomBytes(20));
  const issuer = getMfaIssuer();
  return {
    secret,
    encryptedSecret: encryptSecret(secret),
    otpauthUrl: createOtpAuthUrl(accountName, secret),
    issuer,
  };
}

export function verifyMfaCode(encryptedSecret: string, code: string): boolean {
  const secret = decryptSecret(encryptedSecret);
  const now = Date.now();
  return [-1, 0, 1].some((windowOffset) => {
    const timestamp = now + windowOffset * TOTP_PERIOD_SECONDS * 1000;
    return createTotpToken(secret, timestamp) === code;
  });
}

export function generateMfaCodeFromSecret(secret: string, timestampMs = Date.now()): string {
  return createTotpToken(secret, timestampMs);
}
