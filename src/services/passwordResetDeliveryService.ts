import type { UserRole } from '../types/auth.js';

export type PasswordResetDeliveryMode = 'api-response' | 'console' | 'webhook';

export interface PasswordResetDeliveryInput {
  userId: string;
  email: string;
  role: UserRole;
  resetToken: string;
  resetExpiresAt: string;
}

export interface PasswordResetDeliveryResult {
  mode: PasswordResetDeliveryMode;
  accepted: boolean;
}

function getDeliveryMode(): PasswordResetDeliveryMode {
  const rawValue = process.env.PASSWORD_RESET_DELIVERY_MODE?.trim().toLowerCase();

  if (rawValue === 'api-response' || rawValue === 'console' || rawValue === 'webhook') {
    return rawValue;
  }

  return process.env.NODE_ENV === 'production' ? 'webhook' : 'api-response';
}

function getWebhookUrl(): string | null {
  const value = process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL?.trim();
  return value ? value : null;
}

function isApiResponseDeliveryEnabled(): boolean {
  return getDeliveryMode() === 'api-response';
}

function isConsoleDeliveryEnabled(): boolean {
  return getDeliveryMode() === 'console';
}

function isWebhookDeliveryEnabled(): boolean {
  return getDeliveryMode() === 'webhook';
}

export function isPasswordResetDeliveryConfigured(): boolean {
  if (isApiResponseDeliveryEnabled() || isConsoleDeliveryEnabled()) {
    return true;
  }

  return isWebhookDeliveryEnabled() && Boolean(getWebhookUrl());
}

async function sendWebhookDelivery(
  input: PasswordResetDeliveryInput,
): Promise<PasswordResetDeliveryResult> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    throw new Error(
      'PASSWORD_RESET_DELIVERY_WEBHOOK_URL must be configured when webhook delivery mode is enabled',
    );
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      type: 'password-reset',
      userId: input.userId,
      email: input.email,
      role: input.role,
      resetToken: input.resetToken,
      resetExpiresAt: input.resetExpiresAt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Password reset delivery webhook returned HTTP ${response.status}`);
  }

  return {
    mode: 'webhook',
    accepted: true,
  };
}

async function sendConsoleDelivery(
  input: PasswordResetDeliveryInput,
): Promise<PasswordResetDeliveryResult> {
  console.info(
    JSON.stringify({
      type: 'password-reset-delivery',
      email: input.email,
      role: input.role,
      resetToken: input.resetToken,
      resetExpiresAt: input.resetExpiresAt,
    }),
  );

  return {
    mode: 'console',
    accepted: true,
  };
}

export async function sendPasswordResetMessage(
  input: PasswordResetDeliveryInput,
): Promise<PasswordResetDeliveryResult> {
  if (isApiResponseDeliveryEnabled()) {
    return {
      mode: 'api-response',
      accepted: true,
    };
  }

  if (isConsoleDeliveryEnabled()) {
    return sendConsoleDelivery(input);
  }

  if (isWebhookDeliveryEnabled() && getWebhookUrl()) {
    return sendWebhookDelivery(input);
  }

  throw new Error(
    'PASSWORD_RESET_DELIVERY_WEBHOOK_URL must be configured when PASSWORD_RESET_DELIVERY_MODE=webhook',
  );
}

export function shouldIncludePasswordResetTokenInResponse(
  deliveryMode: PasswordResetDeliveryMode,
): boolean {
  return deliveryMode === 'api-response';
}
