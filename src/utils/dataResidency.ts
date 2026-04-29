import type { FeatureSelection } from '../featureSelection.js';

export type DataResidencyMode = 'strict-ph' | 'hybrid-ph-primary' | 'cross-border-documented';

export type ResidencyProcessor = {
  name: string;
  category: 'database' | 'auth' | 'media-storage' | 'monitoring' | 'webhook';
  configured: boolean;
  host: string | null;
  approvedHost: boolean | null;
  likelyCrossBorder: boolean;
  dataCategories: string[];
};

const DATA_RESIDENCY_MODE_OPTIONS: DataResidencyMode[] = [
  'strict-ph',
  'hybrid-ph-primary',
  'cross-border-documented',
];

function parseHostFromUrl(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function parseHostFromConnectionString(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeHostRule(value: string): string {
  return value.trim().toLowerCase();
}

export function getApprovedResidencyHosts(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.DATA_RESIDENCY_APPROVED_HOSTS ?? '')
    .split(',')
    .map((value) => normalizeHostRule(value))
    .filter((value) => value.length > 0);
}

export function isApprovedResidencyHost(
  host: string | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean | null {
  if (!host) {
    return null;
  }

  const normalizedHost = host.trim().toLowerCase();
  const approvedHosts = getApprovedResidencyHosts(env);

  if (approvedHosts.length === 0) {
    return false;
  }

  return approvedHosts.some(
    (rule) => normalizedHost === rule || normalizedHost.endsWith(`.${rule}`),
  );
}

export function getDataResidencyMode(env: NodeJS.ProcessEnv = process.env): DataResidencyMode {
  const configuredMode = env.DATA_RESIDENCY_MODE?.trim().toLowerCase();
  if (configuredMode && DATA_RESIDENCY_MODE_OPTIONS.includes(configuredMode as DataResidencyMode)) {
    return configuredMode as DataResidencyMode;
  }

  return 'cross-border-documented';
}

export function getProcessorInventoryVersion(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.DATA_PROCESSOR_INVENTORY_VERSION?.trim() || null;
}

export function getCrossBorderTransferAssessmentReference(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return env.CROSS_BORDER_TRANSFER_ASSESSMENT_REFERENCE?.trim() || null;
}

export function getCrossBorderTransferMccReference(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return env.CROSS_BORDER_TRANSFER_MCC_REFERENCE?.trim() || null;
}

export function getResidencyProcessors(
  env: NodeJS.ProcessEnv,
  selection: FeatureSelection,
): ResidencyProcessor[] {
  const databaseHost = parseHostFromConnectionString(env.DATABASE_URL);
  const supabaseHost = parseHostFromUrl(env.SUPABASE_URL);
  const sentryHost = parseHostFromUrl(env.SENTRY_DSN);
  const passwordResetWebhookHost = parseHostFromUrl(env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL);
  const securityAlertWebhookHost = parseHostFromUrl(env.SECURITY_ALERT_WEBHOOK_URL);
  const storageScanWebhookHost = parseHostFromUrl(env.SUPABASE_STORAGE_SCAN_WEBHOOK_URL);

  const processors: ResidencyProcessor[] = [
    {
      name: 'primary-database',
      category: 'database',
      configured: Boolean(databaseHost),
      host: databaseHost,
      approvedHost: isApprovedResidencyHost(databaseHost, env),
      likelyCrossBorder: isApprovedResidencyHost(databaseHost, env) === false,
      dataCategories: ['citizen-records', 'incident-records', 'audit-logs'],
    },
    {
      name: 'supabase-auth',
      category: 'auth',
      configured: selection.authProvider === 'supabase' || selection.tokenMode === 'supabase-jwt',
      host: supabaseHost,
      approvedHost: isApprovedResidencyHost(supabaseHost, env),
      likelyCrossBorder:
        (selection.authProvider === 'supabase' || selection.tokenMode === 'supabase-jwt') &&
        isApprovedResidencyHost(supabaseHost, env) === false,
      dataCategories: ['account-identifiers', 'auth-events'],
    },
    {
      name: 'supabase-media-storage',
      category: 'media-storage',
      configured: selection.mediaStorage === 'supabase-storage',
      host: supabaseHost,
      approvedHost: isApprovedResidencyHost(supabaseHost, env),
      likelyCrossBorder:
        selection.mediaStorage === 'supabase-storage' &&
        isApprovedResidencyHost(supabaseHost, env) === false,
      dataCategories: ['incident-media'],
    },
    {
      name: 'sentry-monitoring',
      category: 'monitoring',
      configured: Boolean(sentryHost),
      host: sentryHost,
      approvedHost: isApprovedResidencyHost(sentryHost, env),
      likelyCrossBorder: Boolean(sentryHost) && isApprovedResidencyHost(sentryHost, env) === false,
      dataCategories: ['error-telemetry'],
    },
    {
      name: 'password-reset-delivery',
      category: 'webhook',
      configured: Boolean(passwordResetWebhookHost),
      host: passwordResetWebhookHost,
      approvedHost: isApprovedResidencyHost(passwordResetWebhookHost, env),
      likelyCrossBorder:
        Boolean(passwordResetWebhookHost) &&
        isApprovedResidencyHost(passwordResetWebhookHost, env) === false,
      dataCategories: ['account-identifiers', 'recovery-events'],
    },
    {
      name: 'security-alert-delivery',
      category: 'webhook',
      configured: Boolean(securityAlertWebhookHost),
      host: securityAlertWebhookHost,
      approvedHost: isApprovedResidencyHost(securityAlertWebhookHost, env),
      likelyCrossBorder:
        Boolean(securityAlertWebhookHost) &&
        isApprovedResidencyHost(securityAlertWebhookHost, env) === false,
      dataCategories: ['security-alerts'],
    },
    {
      name: 'media-scan-webhook',
      category: 'webhook',
      configured: Boolean(storageScanWebhookHost),
      host: storageScanWebhookHost,
      approvedHost: isApprovedResidencyHost(storageScanWebhookHost, env),
      likelyCrossBorder:
        Boolean(storageScanWebhookHost) &&
        isApprovedResidencyHost(storageScanWebhookHost, env) === false,
      dataCategories: ['incident-media-metadata'],
    },
  ];

  return processors;
}

export function hasLikelyCrossBorderProcessor(
  env: NodeJS.ProcessEnv,
  selection: FeatureSelection,
): boolean {
  return getResidencyProcessors(env, selection).some(
    (processor) => processor.configured && processor.likelyCrossBorder,
  );
}
