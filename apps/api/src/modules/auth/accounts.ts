import { v7 as uuidv7 } from 'uuid';
import type { Prisma, User } from '../../generated/prisma/client.js';

/** Makes sure the user owns a personal garage (FR-VEH-01). Call inside a transaction. */
export async function ensurePersonalGarage(tx: Prisma.TransactionClient, user: User): Promise<void> {
  const hasGarage = await tx.garageMember.findFirst({ where: { userId: user.id, role: 'owner' } });
  if (hasGarage) return;
  await tx.garage.create({
    data: {
      id: uuidv7(),
      ownerId: user.id,
      name: `Garasi ${user.name.split(' ')[0] ?? user.name}`.slice(0, 100),
      members: { create: { userId: user.id, role: 'owner' } },
    },
  });
}
