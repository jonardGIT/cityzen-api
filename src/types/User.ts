export interface User {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'DISPATCHER' | 'RESPONDER' | 'VIEWER';
}
