import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import {
  getAdminAuthSessionById,
  getAdminSupabaseSessionById,
  listAdminAuthSessions,
  listAdminSupabaseSessions,
  revokeAdminAuthSession,
  revokeAdminSupabaseSession,
} from '../services/adminSessionInventoryService.js';
import { revokeSupabaseAccessToken } from '../services/supabaseAuthService.js';

export async function listAdminSessionInventory(req: Request, res: Response): Promise<void> {
  const currentActorSessionId = (req as AuthenticatedRequest).authSessionId ?? null;
  const authProvider = (req as AuthenticatedRequest).authProvider;

  const sessions =
    authProvider === 'supabase'
      ? await listAdminSupabaseSessions(currentActorSessionId)
      : await listAdminAuthSessions(currentActorSessionId);

  res.json(sessions);
}

export async function revokeAdminSessionInventoryEntry(req: Request, res: Response): Promise<void> {
  const sessionId = req.params.id;
  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ message: 'Invalid session id' });
    return;
  }

  const currentActorSessionId = (req as AuthenticatedRequest).authSessionId ?? null;
  const authProvider = (req as AuthenticatedRequest).authProvider;
  const authAccessToken = (req as AuthenticatedRequest).authAccessToken;

  const targetSession =
    authProvider === 'supabase'
      ? await getAdminSupabaseSessionById(sessionId, currentActorSessionId)
      : await getAdminAuthSessionById(sessionId, currentActorSessionId);

  if (!targetSession) {
    res.status(404).json({ message: 'Session not found' });
    return;
  }

  let revoked = false;
  if (authProvider === 'supabase') {
    if (sessionId === currentActorSessionId) {
      if (!authAccessToken) {
        res.status(401).json({ message: 'Unauthorized: missing authentication session' });
        return;
      }

      await revokeSupabaseAccessToken(authAccessToken, 'local');
      revoked = true;
    } else {
      revoked = await revokeAdminSupabaseSession(sessionId);
    }
  } else {
    revoked = await revokeAdminAuthSession(sessionId);
  }

  if (!revoked) {
    res.status(404).json({ message: 'Session not found' });
    return;
  }

  res.locals.auditMetadata = {
    adminScope: 'session-inventory',
    targetSessionId: targetSession.id,
    targetUserId: targetSession.userId,
    targetUserEmail: targetSession.userEmail,
    targetUserRole: targetSession.userRole,
    targetDeviceLabel: targetSession.deviceLabel,
    targetIpAddressMasked: targetSession.ipAddressMasked,
    authProvider: targetSession.authProvider,
  };

  res.status(204).send();
}
