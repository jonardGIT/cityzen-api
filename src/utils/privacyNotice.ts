const DEFAULT_PRIVACY_NOTICE_VERSION = 'ph-dpa-2012-v1';

export class PrivacyNoticeAcceptanceError extends Error {}

export type PrivacyNoticeAcceptance = {
  acceptedAt: Date;
  version: string;
};

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return null;
}

export function getCurrentPrivacyNoticeVersion(env: NodeJS.ProcessEnv = process.env): string {
  const configuredVersion = env.PRIVACY_NOTICE_VERSION?.trim();
  return configuredVersion || DEFAULT_PRIVACY_NOTICE_VERSION;
}

export function isPrivacyNoticeEnforced(env: NodeJS.ProcessEnv = process.env): boolean {
  const explicitValue = parseBoolean(env.PRIVACY_NOTICE_ENFORCED);
  if (explicitValue !== null) {
    return explicitValue;
  }

  return !Boolean(env.JEST_WORKER_ID);
}

export function resolvePrivacyNoticeAcceptance(
  body: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
): PrivacyNoticeAcceptance | null {
  const accepted = parseBoolean(body.privacyNoticeAccepted);
  const currentVersion = getCurrentPrivacyNoticeVersion(env);
  const rawVersion =
    typeof body.privacyNoticeVersion === 'string' ? body.privacyNoticeVersion.trim() : '';

  if (accepted === true) {
    if (rawVersion && rawVersion !== currentVersion) {
      throw new PrivacyNoticeAcceptanceError(
        `privacyNoticeVersion must match the current notice version ${currentVersion}`,
      );
    }

    return {
      acceptedAt: new Date(),
      version: currentVersion,
    };
  }

  if (isPrivacyNoticeEnforced(env)) {
    throw new PrivacyNoticeAcceptanceError(
      'privacyNoticeAccepted must be true before personal data can be collected',
    );
  }

  return null;
}
