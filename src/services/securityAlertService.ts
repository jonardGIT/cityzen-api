import type { Prisma } from '@prisma/client';
import type { CreateAuditLogInput } from './auditLogService.js';
import { MFA_REQUIRED_ROLES, type UserRole } from '../types/auth.js';

type SecurityAlertSeverity = 'medium' | 'high' | 'critical';

type SecurityAlertRule = {
  ruleId: string;
  severity: SecurityAlertSeverity;
  summary: string;
  aggregate?: {
    identity: string;
    count: number;
    windowMs: number;
  };
};

type AlertWindow = {
  count: number;
  windowStart: number;
  lastAlertedCount: number;
};

const alertWindows = new Map<string, AlertWindow>();

function isPrivilegedRoleValue(value: unknown): value is UserRole {
  return typeof value === 'string' && MFA_REQUIRED_ROLES.includes(value as UserRole);
}

function getSecurityAlertWebhookUrl(): string | null {
  const value = process.env.SECURITY_ALERT_WEBHOOK_URL?.trim();
  return value ? value : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getLoginFailureAlertThreshold(): number {
  return toPositiveInteger(process.env.SECURITY_ALERT_LOGIN_FAILURE_THRESHOLD, 5);
}

function getLoginFailureAlertWindowMs(): number {
  return toPositiveInteger(process.env.SECURITY_ALERT_LOGIN_FAILURE_WINDOW_MS, 15 * 60_000);
}

function getPasswordResetAlertThreshold(): number {
  return toPositiveInteger(process.env.SECURITY_ALERT_PASSWORD_RESET_THRESHOLD, 3);
}

function getPasswordResetAlertWindowMs(): number {
  return toPositiveInteger(process.env.SECURITY_ALERT_PASSWORD_RESET_WINDOW_MS, 60 * 60_000);
}

function getPasswordResetConfirmFailureAlertThreshold(): number {
  return toPositiveInteger(process.env.SECURITY_ALERT_PASSWORD_RESET_CONFIRM_FAILURE_THRESHOLD, 5);
}

function getPasswordResetConfirmFailureAlertWindowMs(): number {
  return toPositiveInteger(
    process.env.SECURITY_ALERT_PASSWORD_RESET_CONFIRM_FAILURE_WINDOW_MS,
    60 * 60_000,
  );
}

function getRefreshFailureAlertThreshold(): number {
  return toPositiveInteger(process.env.SECURITY_ALERT_REFRESH_FAILURE_THRESHOLD, 5);
}

function getRefreshFailureAlertWindowMs(): number {
  return toPositiveInteger(process.env.SECURITY_ALERT_REFRESH_FAILURE_WINDOW_MS, 15 * 60_000);
}

function getSessionChurnAlertThreshold(): number {
  return toPositiveInteger(process.env.SECURITY_ALERT_SESSION_CHURN_THRESHOLD, 3);
}

function getSessionChurnAlertWindowMs(): number {
  return toPositiveInteger(process.env.SECURITY_ALERT_SESSION_CHURN_WINDOW_MS, 15 * 60_000);
}

function getMediaUploadAlertThreshold(): number {
  return toPositiveInteger(process.env.SECURITY_ALERT_MEDIA_UPLOAD_THRESHOLD, 5);
}

function getMediaUploadAlertWindowMs(): number {
  return toPositiveInteger(process.env.SECURITY_ALERT_MEDIA_UPLOAD_WINDOW_MS, 15 * 60_000);
}

function getAggregateIdentity(input: CreateAuditLogInput): string {
  return input.actorEmail ?? input.ipAddress ?? 'unknown';
}

function recordThresholdCrossing(key: string, threshold: number, windowMs: number): number | null {
  const now = Date.now();
  const existing = alertWindows.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    const nextWindow: AlertWindow = {
      count: 1,
      windowStart: now,
      lastAlertedCount: 0,
    };
    alertWindows.set(key, nextWindow);
    return threshold === 1 ? nextWindow.count : null;
  }

  existing.count += 1;

  if (existing.count >= threshold && existing.lastAlertedCount < threshold) {
    existing.lastAlertedCount = existing.count;
    alertWindows.set(key, existing);
    return existing.count;
  }

  alertWindows.set(key, existing);
  return null;
}

function buildThresholdAlert(
  input: CreateAuditLogInput,
  keyPrefix: string,
  threshold: number,
  windowMs: number,
  ruleId: string,
  severity: SecurityAlertSeverity,
  summary: string,
): SecurityAlertRule | null {
  const identity = getAggregateIdentity(input);
  const count = recordThresholdCrossing(`${keyPrefix}:${identity}`, threshold, windowMs);

  if (count === null) {
    return null;
  }

  return {
    ruleId,
    severity,
    summary,
    aggregate: {
      identity,
      count,
      windowMs,
    },
  };
}

function buildImmediateRules(input: CreateAuditLogInput): SecurityAlertRule[] {
  const metadata = isObject(input.metadata) ? (input.metadata as Prisma.InputJsonObject) : null;
  const rules: SecurityAlertRule[] = [];
  const managedUserRole = metadata?.managedUserRole;
  const previousRole = metadata?.previousRole;

  if (input.action === 'mfa_disable' && input.outcome === 'success') {
    rules.push({
      ruleId: 'mfa-disabled',
      severity: 'high',
      summary: 'A privileged MFA configuration was disabled',
    });
  }

  if (
    input.action === 'password_reset_request' &&
    input.outcome === 'success' &&
    metadata?.privilegedRecoveryBlocked === true
  ) {
    rules.push({
      ruleId: 'privileged-password-reset-blocked',
      severity: 'high',
      summary: 'A privileged self-service password reset attempt was blocked',
    });
  }

  if (
    input.action === 'password_reset_request' &&
    input.outcome === 'failure' &&
    metadata?.deliveryFailure === true
  ) {
    rules.push({
      ruleId: 'password-reset-delivery-unavailable',
      severity: 'high',
      summary: 'Password reset delivery was unavailable during a public recovery request',
    });
  }

  if (input.action === 'password_reset_confirm' && input.outcome === 'success') {
    rules.push({
      ruleId: 'password-reset-confirmed',
      severity: 'medium',
      summary: 'A password reset completed successfully',
    });
  }

  if (
    input.resource === 'users' &&
    input.action === 'create' &&
    input.outcome === 'success' &&
    isPrivilegedRoleValue(managedUserRole)
  ) {
    rules.push({
      ruleId: 'privileged-user-created',
      severity: 'high',
      summary: 'A privileged user account was created',
    });
  }

  if (
    input.resource === 'users' &&
    input.action === 'update' &&
    input.outcome === 'success' &&
    metadata?.roleChanged === true
  ) {
    rules.push({
      ruleId: 'user-role-changed',
      severity:
        isPrivilegedRoleValue(managedUserRole) || isPrivilegedRoleValue(previousRole)
          ? 'critical'
          : 'high',
      summary: 'A user role assignment changed',
    });
  }

  if (
    input.resource === 'users' &&
    input.action === 'update' &&
    input.outcome === 'success' &&
    metadata?.passwordChanged === true &&
    metadata?.selfUpdate !== true
  ) {
    rules.push({
      ruleId: 'admin-password-reset',
      severity: 'high',
      summary: 'An administrator changed another user password',
    });
  }

  if (input.resource === 'users' && input.action === 'delete' && input.outcome === 'success') {
    rules.push({
      ruleId: metadata?.archiveModeDelete === true ? 'user-archived' : 'user-deleted',
      severity: isPrivilegedRoleValue(managedUserRole) ? 'critical' : 'high',
      summary:
        metadata?.archiveModeDelete === true
          ? 'A user account was archived'
          : 'A user account was deleted',
    });
  }

  return rules;
}

function buildAggregateRules(input: CreateAuditLogInput): SecurityAlertRule[] {
  const rules: Array<SecurityAlertRule | null> = [];

  if (input.action === 'login' && input.outcome === 'failure') {
    rules.push(
      buildThresholdAlert(
        input,
        'login-failure',
        getLoginFailureAlertThreshold(),
        getLoginFailureAlertWindowMs(),
        'repeated-login-failures',
        'high',
        'Repeated login failures crossed the configured threshold',
      ),
    );
  }

  if (input.action === 'password_reset_request' && input.outcome === 'success') {
    rules.push(
      buildThresholdAlert(
        input,
        'password-reset-request',
        getPasswordResetAlertThreshold(),
        getPasswordResetAlertWindowMs(),
        'repeated-password-reset-requests',
        'medium',
        'Repeated password reset requests crossed the configured threshold',
      ),
    );
  }

  if (input.action === 'refresh' && input.outcome === 'failure') {
    rules.push(
      buildThresholdAlert(
        input,
        'refresh-failure',
        getRefreshFailureAlertThreshold(),
        getRefreshFailureAlertWindowMs(),
        'repeated-refresh-failures',
        'high',
        'Repeated refresh token failures crossed the configured threshold',
      ),
    );
  }

  if (input.action === 'password_reset_confirm' && input.outcome === 'failure') {
    rules.push(
      buildThresholdAlert(
        input,
        'password-reset-confirm-failure',
        getPasswordResetConfirmFailureAlertThreshold(),
        getPasswordResetConfirmFailureAlertWindowMs(),
        'repeated-password-reset-confirm-failures',
        'high',
        'Repeated password reset confirmation failures crossed the configured threshold',
      ),
    );
  }

  if (input.action === 'session_revoke' && input.outcome === 'success') {
    rules.push(
      buildThresholdAlert(
        input,
        'session-churn',
        getSessionChurnAlertThreshold(),
        getSessionChurnAlertWindowMs(),
        'session-churn-anomaly',
        'medium',
        'Repeated session revocations crossed the configured threshold',
      ),
    );
  }

  if (input.action === 'media_upload') {
    rules.push(
      buildThresholdAlert(
        input,
        'media-upload',
        getMediaUploadAlertThreshold(),
        getMediaUploadAlertWindowMs(),
        'repeated-media-upload-attempts',
        'medium',
        'Repeated incident media upload attempts crossed the configured threshold',
      ),
    );
  }

  return rules.filter((rule): rule is SecurityAlertRule => rule !== null);
}

function buildEventPayload(input: CreateAuditLogInput) {
  return {
    timestamp: (input.timestamp ?? new Date()).toISOString(),
    action: input.action,
    resource: input.resource,
    outcome: input.outcome,
    actorUserId: input.actorUserId ?? null,
    actorEmail: input.actorEmail ?? null,
    actorRole: input.actorRole ?? null,
    method: input.method,
    path: input.path,
    statusCode: input.statusCode ?? null,
    targetId: input.targetId ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    metadata: isObject(input.metadata) ? input.metadata : null,
  };
}

async function sendSecurityAlert(
  input: CreateAuditLogInput,
  rule: SecurityAlertRule,
): Promise<void> {
  const webhookUrl = getSecurityAlertWebhookUrl();
  if (!webhookUrl) {
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      type: 'security-alert',
      ruleId: rule.ruleId,
      severity: rule.severity,
      summary: rule.summary,
      aggregate: rule.aggregate,
      event: buildEventPayload(input),
    }),
  });

  if (!response.ok) {
    throw new Error(`Security alert webhook returned HTTP ${response.status}`);
  }
}

export async function publishSecurityAlerts(input: CreateAuditLogInput): Promise<void> {
  if (!getSecurityAlertWebhookUrl()) {
    return;
  }

  const rules = [...buildImmediateRules(input), ...buildAggregateRules(input)];

  for (const rule of rules) {
    await sendSecurityAlert(input, rule);
  }
}
