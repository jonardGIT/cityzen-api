const PH_MOBILE_NSN_LENGTH = 10;
const INTERNAL_MOBILE_EMAIL_DOMAIN = 'cirs.mobile.invalid';

function stripMobileSeparators(value: string): string {
  return value.replace(/[\s()-]+/g, '');
}

export function normalizeMobileNumber(value: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const compactValue = stripMobileSeparators(trimmedValue);

  let nationalSignificantNumber: string | null = null;

  if (/^\+639\d{9}$/.test(compactValue)) {
    nationalSignificantNumber = compactValue.slice(3);
  } else if (/^639\d{9}$/.test(compactValue)) {
    nationalSignificantNumber = compactValue.slice(2);
  } else if (/^09\d{9}$/.test(compactValue)) {
    nationalSignificantNumber = compactValue.slice(1);
  } else if (/^9\d{9}$/.test(compactValue)) {
    nationalSignificantNumber = compactValue;
  }

  if (!nationalSignificantNumber || nationalSignificantNumber.length !== PH_MOBILE_NSN_LENGTH) {
    return null;
  }

  return `+63${nationalSignificantNumber}`;
}

export function buildCitizenMobileSurrogateEmail(normalizedMobileNumber: string): string {
  const mobileDigits = normalizedMobileNumber.replace(/\D/g, '');
  return `citizen.mobile.${mobileDigits}@${INTERNAL_MOBILE_EMAIL_DOMAIN}`;
}
