import { AuthError, createClient } from '@supabase/supabase-js';

export class SupabaseAuthServiceError extends Error {
  code: string;
  status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'SupabaseAuthServiceError';
    this.code = code;
    this.status = status;
  }
}

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function getSupabaseUrl(): string {
  const value = process.env.SUPABASE_URL?.trim();
  if (!value) {
    throw new Error('SUPABASE_URL must be configured when SUPABASE_AUTH_ENABLED=true');
  }

  return value;
}

function getSupabaseAnonKey(): string {
  const value = process.env.SUPABASE_ANON_KEY?.trim();
  if (!value) {
    throw new Error('SUPABASE_ANON_KEY must be configured when SUPABASE_AUTH_ENABLED=true');
  }

  return value;
}

function getSupabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be configured when SUPABASE_AUTH_ENABLED=true');
  }

  return value;
}

function createSupabaseClient(apiKey: string) {
  return createClient(getSupabaseUrl(), apiKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function getPublicClient() {
  return createSupabaseClient(getSupabaseAnonKey());
}

function getAdminClient() {
  return createSupabaseClient(getSupabaseServiceRoleKey());
}

function getPasswordResetRedirectUrl(): string | undefined {
  const value = process.env.SUPABASE_PASSWORD_RESET_REDIRECT_URL?.trim();
  return value ? value : undefined;
}

function shouldAutoConfirmEmail(): boolean {
  const rawValue = process.env.SUPABASE_AUTH_AUTO_CONFIRM_EMAIL?.trim();
  if (!rawValue) {
    return true;
  }

  return isTrue(rawValue);
}

function mapAuthApiError(error: AuthError): SupabaseAuthServiceError {
  const message = error.message.toLowerCase();
  const status = error.status ?? 500;

  if (status === 422 && message.includes('already registered')) {
    return new SupabaseAuthServiceError('EMAIL_CONFLICT', 'Email already registered', 409);
  }

  if (status === 400 && message.includes('email not confirmed')) {
    return new SupabaseAuthServiceError(
      'EMAIL_NOT_CONFIRMED',
      'Email confirmation is required before signing in',
      401,
    );
  }

  if (status === 400 && message.includes('invalid login credentials')) {
    return new SupabaseAuthServiceError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  return new SupabaseAuthServiceError('SUPABASE_AUTH_ERROR', error.message, status);
}

export function isSupabaseAuthEnabled(): boolean {
  return isTrue(process.env.SUPABASE_AUTH_ENABLED);
}

export async function registerSupabaseAuthUser(input: {
  email: string;
  password: string;
  name: string;
  role: string;
}): Promise<{ id: string; email: string }> {
  const client = getAdminClient();
  const { data, error } = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: shouldAutoConfirmEmail(),
    user_metadata: {
      name: input.name,
      role: input.role,
    },
  });

  if (error) {
    throw mapAuthApiError(error);
  }

  if (!data.user?.id || !data.user.email) {
    throw new SupabaseAuthServiceError('SUPABASE_AUTH_ERROR', 'Supabase user creation failed');
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
}

export async function authenticateSupabaseUser(input: {
  email: string;
  password: string;
}): Promise<{ id: string; email: string }> {
  const client = getPublicClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw mapAuthApiError(error);
  }

  if (!data.user?.id || !data.user.email) {
    throw new SupabaseAuthServiceError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
}

export async function updateSupabaseAuthUser(
  authUserId: string,
  input: {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
  },
): Promise<void> {
  const client = getAdminClient();
  const userMetadata: Record<string, string> = {};

  if (input.name !== undefined) {
    userMetadata.name = input.name;
  }

  if (input.role !== undefined) {
    userMetadata.role = input.role;
  }

  const { error } = await client.auth.admin.updateUserById(authUserId, {
    email: input.email,
    password: input.password,
    user_metadata: Object.keys(userMetadata).length > 0 ? userMetadata : undefined,
  });

  if (error) {
    throw mapAuthApiError(error);
  }
}

export async function deleteSupabaseAuthUser(authUserId: string): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.auth.admin.deleteUser(authUserId);

  if (error) {
    throw mapAuthApiError(error);
  }
}

export async function sendSupabasePasswordResetEmail(email: string): Promise<void> {
  const client = getPublicClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectUrl(),
  });

  if (error) {
    throw mapAuthApiError(error);
  }
}
