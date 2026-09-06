import { prisma } from '../db/prisma';

interface AuditLogInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export const recordAuditLog = async (input: AuditLogInput) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata as never,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch {
    // Audit logging must never break the primary request flow.
  }
};
