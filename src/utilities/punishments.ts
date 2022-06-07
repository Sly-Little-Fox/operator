import { container } from "@sapphire/framework";

interface WarnOptions {
  guildId: string;
  userId: string;
  moderatorId?: string;
  reason?: string;
  weight: 1 | 2 | 3;
}

interface RemoveWarnOptions {
  moderatorId?: string;
  warningId: number;
  reason?: string;
}

interface ResetWarnsOptions {
  moderatorId?: string;
  guildId: string;
  userId: string;
  reason?: string;
}

export async function warnMember(opts: WarnOptions) {
  const guild = await container.client.guilds.fetch(opts.guildId);
  const warning = await container.prisma.warning.create({
    data: opts,
  });
  container.events.emit("warningCreated", {
    warningId: warning.id,
    reason: opts.reason,
    member:
      (await guild.members.fetch(opts.userId)) ||
      (await container.client.users.fetch(opts.userId)),
    moderator: opts.moderatorId
      ? await guild.members.fetch(opts.moderatorId)
      : undefined,
    guild,
  });
  return warning;
}

export async function removeWarn(opts: RemoveWarnOptions) {
  const warning = await container.prisma.warning.delete({
    where: { id: opts.warningId },
  });
  const guild = await container.client.guilds.fetch(warning.guildId);
  container.events.emit("warningRemoved", {
    guild,
    reason: opts.reason,
    warningId: opts.warningId,
    moderator: opts.moderatorId
      ? await guild.members.fetch(opts.moderatorId)
      : undefined,
    member:
      (await guild.members.fetch(warning.userId)) ||
      (await container.client.users.fetch(warning.userId)),
  });
  return warning;
}

export async function resetWarns(opts: ResetWarnsOptions) {
  const guild = await container.client.guilds.fetch(opts.guildId);
  const target =
    (await guild.members.fetch(opts.userId)) ||
    (await container.client.users.fetch(opts.userId));
  const ids = (
    await container.prisma.warning.findMany({
      where: { userId: opts.userId, guildId: opts.guildId },
    })
  ).map((el) => el.id);

  container.events.emit("warningsReset", {
    guild,
    reason: opts.reason,
    moderator: opts.moderatorId
      ? await guild.members.fetch(opts.moderatorId)
      : undefined,
    member: target,
    warningIds: ids,
  });

  await container.prisma.warning.deleteMany({
    where: { userId: opts.userId, guildId: opts.guildId },
  });
  return ids;
}
