import { container as cntr } from "@sapphire/framework";
import type {
  BanOptions,
  DateResolvable,
  Guild,
  GuildMember,
  TextChannel,
  User,
  VoiceChannel,
} from "discord.js";
import _ from "lodash";
import pThrottle from "p-throttle";
import phin from "phin";
import { isHostWhitelisted } from "../config/security.js";
import type { GuildMessage } from "../types.js";
import { resolveDate } from "./converters.js";
import { removeWarn, resetWarns, warnMember } from "./punishments.js";
import { noReturn } from "./utilities.js";

export function sanitizeGuild(guild: Guild) {
  return {
    name: guild.name,
    id: guild.id,
    available: guild.available,
    afkChannelId: guild.afkChannelId,
    approximateMemberCount: guild.approximateMemberCount,
    memberCount: guild.memberCount,
    premiumSubscriptionCount: guild.premiumSubscriptionCount,
    preferredLocale: guild.preferredLocale,
    large: guild.large,
    maximumMembers: guild.maximumMembers,
    ownerId: guild.ownerId,
    premiumTier: guild.premiumTier,
    widgetEnabled: guild.widgetEnabled,
    widgetChannelId: guild.widgetChannelId,
    partnered: guild.partnered,
    verified: guild.verified,
    verificationLevel: guild.verificationLevel,
    vanityURLCode: guild.vanityURLCode,
    features: guild.features,
    mfaLevel: guild.mfaLevel,
    maximumBitrate: guild.maximumBitrate,
    icon: guild.icon,
    setIcon: (icon: string | Buffer | null, reason: string | undefined) =>
      guild.setIcon(icon, reason),
    setName: (name: string, reason: string | undefined) => {
      guild.setName(name, reason);
    },
  };
}

export function sanitizeUser(user: User) {
  return {
    id: user.id,
    tag: user.tag,
    bot: user.bot,
    flags: user.flags,
    system: user.system,
    banner: user.banner,
    avatar: user.avatar,
    username: user.username,
    send: noReturn(user.send, user),
    createdAt: user.createdAt,
    accentColor: user.accentColor,
    discriminator: user.discriminator,
    hexAccentColor: user.hexAccentColor,
    bannerURL: user.bannerURL.bind(user),
    avatarURL: user.avatarURL.bind(user),
    defaultAvatarURL: user.defaultAvatarURL,
    createdTimestamp: user.createdTimestamp,
    displayAvatarURL: user.displayAvatarURL.bind(user),
    toString: () => `<@${user.id}>`,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function sanitizeGuildMember(member: GuildMember) {
  const sanitized = {
    id: member.id,
    avatar: member.avatar,
    pending: member.pending,
    kickable: member.kickable,
    bannable: member.bannable,
    nickname: member.nickname,
    kick(reason: string | undefined) {
      if (!member.kickable)
        throw new Error("This member cannot be kicked by the bot");
      cntr.events.emit("userKicked", {
        guild: member.guild,
        member,
        reason,
      });
      member.kick(reason);
    },
    ban(options: BanOptions) {
      if (!member?.bannable)
        throw new Error("This member cannot be banned by the bot");
      cntr.events.emit("userBanned", {
        member,
        guild: member.guild,
        deleteMessagesDays: options.days,
      });
      member.ban(options);
    },
    manageable: member.manageable,
    moderatable: member.moderatable,
    displayName: member.displayName,
    permissions: member.permissions,
    user: sanitizeUser(member.user),
    displayColor: member.displayColor,
    premiumSince: member.premiumSince,
    guild: sanitizeGuild(member.guild),
    displayHexColor: member.displayHexColor,
    avatarURL: member.avatarURL.bind(member),
    premiumSinceTimestamp: member.premiumSinceTimestamp,
    displayAvatarURL: member.displayAvatarURL.bind(member),
    timeout(time: number, reason: string | undefined) {
      if (!member.moderatable)
        throw new Error("This member cannot be timed out by the bot");
      cntr.events.emit("userTimedOut", {
        guild: member.guild,
        time: time * 1000,
        reason,
        member,
      });
      member.timeout(time * 1000, reason);
    },
    communicationDisabledUntil: member.communicationDisabledUntil,
    communicationDisabledUntilTimestamp:
      member.communicationDisabledUntilTimestamp,
    disableCommunicationUntil(
      timeout: DateResolvable | null,
      reason: string | undefined
    ) {
      if (!member.moderatable)
        throw new Error("This member cannot be timed out by the bot");
      cntr.events.emit("userTimedOut", {
        guild: member.guild,
        time: timeout ? resolveDate(timeout) - Date.now() : null,
        reason,
        member,
      });
      member.disableCommunicationUntil(timeout, reason);
    },
    setNickname: noReturn(member.setNickname, member),
    warn(weight: 1 | 2 | 3, reason?: string) {
      return warnMember({
        weight,
        reason,
        guildId: member.guild.id,
        userId: member.id,
      });
    },
    removeWarning(warningId: number, reason?: string) {
      return removeWarn({
        warningId,
        reason,
      });
    },
    resetWarnings(reason: string) {
      return resetWarns({
        reason,
        guildId: member.guild.id,
        userId: member.id,
      });
    },
    toString: () => `<@${member.id}>`,
  };

  return sanitized;
}

export function sanitizeTextChannel(channel: TextChannel) {
  return {
    id: channel.id,
    nsfw: channel.nsfw,
    name: channel.name,
    sendTyping: channel.sendTyping.bind(channel),
    position: channel.position,
    rawPosition: channel.rawPosition,
    send: noReturn(channel.send, channel),
    bulkDelete: noReturn(channel.bulkDelete, channel),
    clone: async (opts: any) => sanitizeTextChannel(await channel.clone(opts)),
    toString: () => `<#${channel.id}>`,
  };
}

export function sanitizeVoiceChannel(channel: VoiceChannel) {
  return {
    id: channel.id,
    name: channel.name,
    sendTyping: channel.sendTyping.bind(channel),
    position: channel.position,
    rawPosition: channel.rawPosition,
    send: noReturn(channel.send, channel),
    bitware: channel.bitrate,
    setBitware: noReturn(channel.setBitrate, channel),
    bulkDelete: noReturn(channel.bulkDelete, channel),
    clone: async (opts: any) => sanitizeVoiceChannel(await channel.clone(opts)),
    toString: () => `<#${channel.id}>`,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function sanitizeMessage(message: GuildMessage) {
  const guild = message.guild ? sanitizeGuild(message.guild) : null;
  const sanitized = {
    guild,
    delete: async () =>
      sanitizeMessage((await message.delete()) as GuildMessage),
    content: message.content.replace(/<@([0-9]+)>/g, "<@!$1>"),
    components: message.components,
    cleanContent: message.cleanContent,
    reply: async (options: any) =>
      sanitizeMessage((await message.reply(options)) as GuildMessage),
    channel: {
      ...sanitizeTextChannel(message.channel),
      send: async (options: any) =>
        sanitizeMessage((await message.channel.send(options)) as GuildMessage),
    },
    attachments: message.attachments,
    member: sanitizeGuildMember(message.member),
    author: sanitizeUser(message.author),
    mentions: message.mentions.toJSON(),
  };
  return sanitized;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const safePhin = pThrottle({
  interval: 10 * 1000,
  limit: 30,
})(async (fetchOptions: Parameters<typeof phin>[0]) => {
  const url =
    typeof fetchOptions === "string" ? fetchOptions : fetchOptions.url;
  if (typeof url !== "string")
    throw new Error("Provided url is not a string (get rekt)");
  if (isHostWhitelisted(new URL(url).host)) {
    const result = await phin(fetchOptions);
    result.body = (
      _.isBuffer(result.body) ? result.body.toString() : result.body
    ) as any;
    result.toString = () =>
      _.isBuffer(result.body)
        ? result.body.toString()
        : JSON.stringify(result.body);
    return result;
  }
  throw new Error(`URL is not allowed`);
});
