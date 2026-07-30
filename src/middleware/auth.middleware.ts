/**
 * Middleware de autenticação / autorização (Fase 2).
 * Se AUTH_ENABLED=false, libera tudo (compatível com deploy atual).
 */

import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { verifyToken, type AuthUser, type UserRole } from '../services/auth/auth.service.js';
import { AppError } from '../utils/errors.js';

export type AuthedRequest = Request & { user?: AuthUser };

const WRITE_ROLES: UserRole[] = ['admin', 'manager', 'operator'];
const ADMIN_ROLES: UserRole[] = ['admin'];

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(header.slice(7));
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.email,
      };
    } catch {
      // ignora token inválido em rotas públicas
    }
  }
  next();
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  if (!env.AUTH_ENABLED) {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError('Autenticação obrigatória', 'UNAUTHORIZED', 401));
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.email,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireWriteAccess(req: AuthedRequest, _res: Response, next: NextFunction): void {
  if (!env.AUTH_ENABLED) {
    next();
    return;
  }
  if (!req.user || !WRITE_ROLES.includes(req.user.role)) {
    next(new AppError('Sem permissão', 'FORBIDDEN', 403));
    return;
  }
  next();
}

export function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction): void {
  if (!env.AUTH_ENABLED) {
    next();
    return;
  }
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    next(new AppError('Apenas admin', 'FORBIDDEN', 403));
    return;
  }
  next();
}
