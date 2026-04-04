import type { FeatureSelection } from '../featureSelection.js';

type DataClassification = {
  domain: string;
  classification: string;
  handling: string;
};

type RetentionPolicy = {
  domain: string;
  retentionDays: number;
  purgeAuthority: string;
  legalHoldSupported: boolean;
};

type DataGovernanceReport = {
  summary: {
    legalHoldEnabled: boolean;
    mediaStorageMode: 'disabled' | 'public' | 'signed';
    tlsRequired: boolean;
    retentionPolicyCount: number;
  };
  classifications: DataClassification[];
  retentionPolicies: RetentionPolicy[];
  encryption: {
    transport: string;
    databaseAtRest: string;
    mediaStorage: string;
  };
  legalHold: {
    enabled: boolean;
    contact: string | null;
    procedure: string;
  };
};

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function getPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getMediaStorageMode(selection: FeatureSelection, env: NodeJS.ProcessEnv) {
  if (selection.mediaStorage !== 'supabase-storage') {
    return 'disabled' as const;
  }

  return env.SUPABASE_STORAGE_ACCESS_MODE?.trim().toLowerCase() === 'signed'
    ? ('signed' as const)
    : ('public' as const);
}

export function getDataGovernanceReport(
  env: NodeJS.ProcessEnv,
  selection: FeatureSelection,
): DataGovernanceReport {
  const mediaStorageMode = getMediaStorageMode(selection, env);
  const legalHoldEnabled = isTrue(env.DATA_LEGAL_HOLD_ENABLED);
  const legalHoldContact = env.DATA_LEGAL_HOLD_CONTACT?.trim() || null;

  const retentionPolicies: RetentionPolicy[] = [
    {
      domain: 'auth-sessions',
      retentionDays: getPositiveInteger(env.DATA_RETENTION_AUTH_SESSIONS_DAYS, 30),
      purgeAuthority: 'SYSTEM_ADMIN',
      legalHoldSupported: true,
    },
    {
      domain: 'password-reset-tokens',
      retentionDays: getPositiveInteger(env.DATA_RETENTION_PASSWORD_RESET_DAYS, 7),
      purgeAuthority: 'SYSTEM_ADMIN',
      legalHoldSupported: true,
    },
    {
      domain: 'audit-logs',
      retentionDays: getPositiveInteger(env.DATA_RETENTION_AUDIT_LOG_DAYS, 365),
      purgeAuthority: 'SYSTEM_ADMIN',
      legalHoldSupported: true,
    },
    {
      domain: 'incident-media',
      retentionDays: getPositiveInteger(env.DATA_RETENTION_INCIDENT_MEDIA_DAYS, 365),
      purgeAuthority: 'SYSTEM_ADMIN',
      legalHoldSupported: true,
    },
    {
      domain: 'incident-records',
      retentionDays: getPositiveInteger(env.DATA_RETENTION_INCIDENT_RECORDS_DAYS, 1825),
      purgeAuthority: 'SYSTEM_ADMIN',
      legalHoldSupported: true,
    },
    {
      domain: 'citizen-records',
      retentionDays: getPositiveInteger(env.DATA_RETENTION_CITIZEN_RECORDS_DAYS, 1825),
      purgeAuthority: 'SYSTEM_ADMIN',
      legalHoldSupported: true,
    },
  ];

  const classifications: DataClassification[] = [
    {
      domain: 'citizen-records',
      classification: 'restricted-pii',
      handling: 'Contains citizen identity and contact information. Access should remain role-scoped and disclosure logged.',
    },
    {
      domain: 'incident-records',
      classification: 'restricted-operational',
      handling: 'Contains incident narratives, location details, and response context. Access should be limited to operational roles and auditors.',
    },
    {
      domain: 'incident-media',
      classification: 'restricted-evidence',
      handling: 'Evidence files may contain PII or sensitive imagery. Private or signed access is preferred for sensitive deployments.',
    },
    {
      domain: 'audit-logs',
      classification: 'confidential-security',
      handling: 'Security telemetry should be retained for incident response and exported only through privileged workflows.',
    },
  ];

  return {
    summary: {
      legalHoldEnabled,
      mediaStorageMode,
      tlsRequired: true,
      retentionPolicyCount: retentionPolicies.length,
    },
    classifications,
    retentionPolicies,
    encryption: {
      transport: 'TLS is required for all external traffic and reverse-proxy hops that terminate client requests.',
      databaseAtRest:
        'Managed database encryption at rest is required for production deployments, including backups and snapshots.',
      mediaStorage:
        mediaStorageMode === 'signed'
          ? 'Supabase media objects are expected to use private storage with short-lived signed access URLs.'
          : mediaStorageMode === 'public'
            ? 'Supabase media objects are currently public-access capable; sensitive deployments should migrate to signed access mode.'
            : 'Incident media storage is disabled in the current feature profile.',
    },
    legalHold: {
      enabled: legalHoldEnabled,
      contact: legalHoldContact,
      procedure:
        'When legal hold is active, automated purge work must be suspended and release must require documented administrative approval.',
    },
  };
}