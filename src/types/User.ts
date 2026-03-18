export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'DISPATCHER' | 'RESPONDER' | 'VIEWER';
}
