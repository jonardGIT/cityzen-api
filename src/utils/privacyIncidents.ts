export const PRIVACY_INCIDENT_STATUSES = [
  'REPORTED',
  'ASSESSING',
  'CONTAINED',
  'NPC_NOTIFIED',
  'DATA_SUBJECTS_NOTIFIED',
  'CLOSED',
] as const;

export const PRIVACY_INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type PrivacyIncidentStatus = (typeof PRIVACY_INCIDENT_STATUSES)[number];
export type PrivacyIncidentSeverity = (typeof PRIVACY_INCIDENT_SEVERITIES)[number];

export function isPrivacyIncidentStatus(value: string): value is PrivacyIncidentStatus {
  return PRIVACY_INCIDENT_STATUSES.includes(value as PrivacyIncidentStatus);
}

export function isPrivacyIncidentSeverity(value: string): value is PrivacyIncidentSeverity {
  return PRIVACY_INCIDENT_SEVERITIES.includes(value as PrivacyIncidentSeverity);
}

export function getPrivacyBreachNotificationWindowHours(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const rawValue = env.PRIVACY_BREACH_NOTIFICATION_WINDOW_HOURS?.trim();
  if (!rawValue) {
    return 72;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 72;
}

export function buildPrivacyIncidentNotificationDueAt(
  detectedAt: Date,
  env: NodeJS.ProcessEnv = process.env,
): Date {
  return new Date(
    detectedAt.getTime() + getPrivacyBreachNotificationWindowHours(env) * 60 * 60 * 1000,
  );
}

export function getPrivacyDpoContactEmail(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.PRIVACY_DPO_CONTACT_EMAIL?.trim() || null;
}

export function getPrivacyBreachPlaybookVersion(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return env.PRIVACY_BREACH_PLAYBOOK_VERSION?.trim() || null;
}

export function getPrivacyIncidentEscalationWebhookUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return env.PRIVACY_INCIDENT_ESCALATION_WEBHOOK_URL?.trim() || null;
}

export function buildPrivacyIncidentReferenceCode(now: Date = new Date()): string {
  const isoDate = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PIR-${isoDate}-${randomSuffix}`;
}
