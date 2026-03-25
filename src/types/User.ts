export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'DISPATCHER' | 'RESPONDER' | 'VIEWER';
}
