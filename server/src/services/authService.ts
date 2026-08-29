import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import type { LoginInput, RegisterInput } from '../schemas/index.js';

const BCRYPT_ROUNDS = 10;

export async function registerUser(input: RegisterInput): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('EMAIL_TAKEN', 'Пользователь с таким email уже зарегистрирован', 409);
  }
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return prisma.user.create({
    data: { email, passwordHash },
  });
}

export async function loginUser(input: LoginInput): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Неверный email или пароль', 401);
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new AppError('INVALID_CREDENTIALS', 'Неверный email или пароль', 401);
  }
  return user;
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    premiumCredits: user.premiumCredits,
    isAdmin: !!user.isAdmin,
    createdAt: user.createdAt.toISOString(),
  };
}
