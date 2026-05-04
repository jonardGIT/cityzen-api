import type { UserRole } from './auth.js';

export interface User {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  email: string;
  passwordHash: string;
  role: UserRole;
}
