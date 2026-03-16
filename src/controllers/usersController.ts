import type { Request, Response } from 'express';
import type { User } from '../types/User.js';

const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

export function getUsers(_req: Request, res: Response): void {
  res.json(users);
}

export function getUserById(req: Request, res: Response): void {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(user);
}

export function createUser(req: Request, res: Response): void {
  const { name, email } = req.body as Partial<User>;
  if (!name || !email) {
    res.status(422).json({ message: 'name and email are required' });
    return;
  }
  const newUser: User = { id: users.length + 1, name, email };
  users.push(newUser);
  res.status(201).json(newUser);
}
