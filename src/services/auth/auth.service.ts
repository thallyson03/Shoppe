/**
 * Autenticação JWT simples (HMAC) + hash scrypt — sem deps extras.
 */

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { prisma } from '../../database/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';

export type UserRole = 'admin' | 'manager' | 'operator' | 'influencer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, 'hex');
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromB64url(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString(
    'utf8',
  );
}

export function signToken(user: AuthUser): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = createHmac('sha256', env.JWT_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): TokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new AppError('Token inválido', 'UNAUTHORIZED', 401);

  const [header, body, sig] = parts as [string, string, string];
  const data = `${header}.${body}`;
  const expected = createHmac('sha256', env.JWT_SECRET).update(data).digest('base64url');

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError('Token inválido', 'UNAUTHORIZED', 401);
  }

  const payload = JSON.parse(fromB64url(body)) as TokenPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new AppError('Token expirado', 'UNAUTHORIZED', 401);
  }
  return payload;
}

export class AuthService {
  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const row = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!row || !row.isActive || !verifyPassword(password, row.passwordHash)) {
      throw new AppError('Credenciais inválidas', 'INVALID_CREDENTIALS', 401);
    }

    const user: AuthUser = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as UserRole,
    };

    return { token: signToken(user), user };
  }

  async createUser(input: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
  }): Promise<AuthUser> {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: hashPassword(input.password),
        role: input.role ?? 'operator',
      },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
    };
  }

  async listUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}
