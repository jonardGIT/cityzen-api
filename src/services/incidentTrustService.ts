import { createHash, randomBytes } from 'crypto';

const DEFAULT_CASE_TOKEN_TTL_DAYS = 30;
const DEFAULT_PUBLIC_REFERENCE_PREFIX = 'TUG';

function getCaseTokenTtlDays(): number {
  const rawValue = process.env.INCIDENT_CASE_TOKEN_TTL_DAYS?.trim();
  if (!rawValue) {
    return DEFAULT_CASE_TOKEN_TTL_DAYS;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CASE_TOKEN_TTL_DAYS;
}

function getPublicReferencePrefix(): string {
  const configuredPrefix = process.env.CITY_TRUST_PUBLIC_REFERENCE_PREFIX?.trim().toUpperCase();
  const sanitizedPrefix = configuredPrefix?.replace(/[^A-Z0-9]/g, '');
  return sanitizedPrefix && sanitizedPrefix.length > 0
    ? sanitizedPrefix
    : DEFAULT_PUBLIC_REFERENCE_PREFIX;
}

function formatReferenceDate(date: Date): string {
  const year = date.getUTCFullYear().toString();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function buildCaseTokenExpiry(now = new Date()): Date {
  return new Date(now.getTime() + getCaseTokenTtlDays() * 24 * 60 * 60 * 1000);
}

export function generateCaseToken(): string {
  return randomBytes(24).toString('base64url');
}

export function hashCaseToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generatePublicReference(now = new Date()): string {
  const randomSuffix = randomBytes(4).toString('hex').toUpperCase();
  return `${getPublicReferencePrefix()}-${formatReferenceDate(now)}-${randomSuffix}`;
}

export function buildCaseLookupPath(caseToken: string): string {
  const apiBasePath = process.env.API_BASE_PATH?.trim() || '/api/v1';
  return `${apiBasePath}/cases/${encodeURIComponent(caseToken)}`;
}

export function buildPublicStatusMessage(statusName: string): string {
  const normalizedStatus = statusName.trim().toLowerCase();

  if (normalizedStatus === 'reported') {
    return 'Your report has been received by the Tuguegarao incident desk.';
  }

  if (normalizedStatus === 'acknowledged') {
    return 'Your report has been acknowledged and is being reviewed.';
  }

  if (normalizedStatus === 'dispatched') {
    return 'City responders have been dispatched for this case.';
  }

  if (normalizedStatus === 'on scene') {
    return 'Responders are already on site for this case.';
  }

  if (normalizedStatus === 'resolved') {
    return 'The incident has been marked as resolved.';
  }

  if (normalizedStatus === 'closed') {
    return 'This case has been closed by the city response team.';
  }

  return `Current case status: ${statusName}.`;
}

export function issueIncidentTrustArtifacts(statusName: string, now = new Date()) {
  const caseToken = generateCaseToken();
  const expiresAt = buildCaseTokenExpiry(now);

  return {
    publicReference: generatePublicReference(now),
    caseToken,
    tokenHash: hashCaseToken(caseToken),
    expiresAt,
    caseLookupPath: buildCaseLookupPath(caseToken),
    publicStatusMessage: buildPublicStatusMessage(statusName),
  };
}
