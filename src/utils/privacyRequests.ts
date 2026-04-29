export const DATA_SUBJECT_REQUEST_TYPES = [
  'ACCESS',
  'CORRECTION',
  'ERASURE',
  'OBJECTION',
  'RESTRICTION',
  'PORTABILITY',
] as const;

export const DATA_SUBJECT_REQUEST_STATUSES = [
  'SUBMITTED',
  'IN_REVIEW',
  'FULFILLED',
  'REJECTED',
  'CANCELLED',
] as const;

export type DataSubjectRequestType = (typeof DATA_SUBJECT_REQUEST_TYPES)[number];
export type DataSubjectRequestStatus = (typeof DATA_SUBJECT_REQUEST_STATUSES)[number];

export function isDataSubjectRequestType(value: unknown): value is DataSubjectRequestType {
  return (
    typeof value === 'string' &&
    DATA_SUBJECT_REQUEST_TYPES.includes(value as DataSubjectRequestType)
  );
}

export function isDataSubjectRequestStatus(value: unknown): value is DataSubjectRequestStatus {
  return (
    typeof value === 'string' &&
    DATA_SUBJECT_REQUEST_STATUSES.includes(value as DataSubjectRequestStatus)
  );
}

export function getDataSubjectRequestResponseDays(env: NodeJS.ProcessEnv = process.env): number {
  const rawValue = env.DATA_SUBJECT_REQUEST_RESPONSE_DAYS?.trim();
  if (!rawValue) {
    return 15;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 15;
}

export function buildDataSubjectRequestDueAt(
  requestedAt: Date,
  env: NodeJS.ProcessEnv = process.env,
): Date {
  const responseDays = getDataSubjectRequestResponseDays(env);
  return new Date(requestedAt.getTime() + responseDays * 24 * 60 * 60 * 1000);
}
