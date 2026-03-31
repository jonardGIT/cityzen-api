export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role:
    | 'SYSTEM_ADMIN'
    | 'DEPARTMENT_MANAGER'
    | 'SUPERVISOR'
    | 'DISPATCHER'
    | 'RESPONDER'
    | 'CITIZEN_REPORTER'
    | 'AUDITOR';
}
