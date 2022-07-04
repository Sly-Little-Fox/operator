import chunkString from "@shelf/fast-chunk-string";
import Memcached from "memcached";
import { promisify } from "node:util";
import { s, MappedObjectValidator } from "@sapphire/shapeshift";
import { container } from "@sapphire/framework";
import type { GuildMessage } from "../types.js";
import crashText from "../data/flood/crashText.json" assert { type: "json" };

const MAX_CHARACTERS_ON_LINE = 140;

export default class FloodPlugin {
  public static readonly PLUGIN_NAME = "flood";

  public readonly name = "flood";

  // private client: Client;

  private memcached = new Memcached("memcached:11211");

  private mGet = promisify(this.memcached.get).bind(this.memcached);

  private mSet = promisify(this.memcached.set).bind(this.memcached);

  private mIncr = promisify(this.memcached.incr).bind(this.memcached);

  private mDecr = promisify(this.memcached.decr).bind(this.memcached);

  public static readonly DEFAULT_CONFIG = {
    resetAfter: 300,
    maxScore: 1100,
    messageLengthDivider: 150,
    lineCount: 0.67,
    embeds: 0,
    linkEmbeds: 5,
    attachments: 15,
    images: 30,
    customEmoji: 4,
    animatedCustomEmoji: 7,
    zalgo: 30,
    memberMentions: 70,
    roleMentions: 140,
    everyoneMentions: 240,
    textThatCanCrashApple: 100,
  };

  public static readonly CONFIG_SCHEMA: MappedObjectValidator<any> = {
    resetAfter: s.number,
    maxScore: s.number,
    messageLengthDivider: s.number,
    lineCount: s.number,
    embeds: s.number,
    linkEmbeds: s.number,
    attachments: s.number,
    images: s.number,
    customEmoji: s.number,
    animatedCustomEmoji: s.number,
    zalgo: s.number,
    memberMentions: s.number,
    roleMentions: s.number,
    everyoneMentions: s.number,
    textThatCanCrashApple: s.number,
  };

  private calculateScore(
    message: GuildMessage,
    canSendEmbeds: boolean,
    config: Record<string, number>
  ) {
    const n = (opt: string) => Number(config[`${this.name}.${opt}`]);
    return (
      (message.content.split("\n").length >= 5
        ? Math.round(
            message.content
              .split("\n")
              .map((st) =>
                st.length > MAX_CHARACTERS_ON_LINE
                  ? chunkString(message.content, {
                      size: MAX_CHARACTERS_ON_LINE,
                      unicodeAware: true,
                    }).join("\n")
                  : message.content
              )
              .join("\n")
              .split("\n").length * n("lineCount")
          )
        : 0) + // Lines in message
      Math.round(message.content.length / n("messageLengthDivider")) + // Characters in message
      Number(
        (message.content.match(
          /(?<!<)\bhttps?:\/\/(\w+\.)+(\w+)\b(?![\w\s]*[<])/g
        )?.length ||
          0) &&
          canSendEmbeds
      ) *
        n("linkEmbeds") + // Links with embeds
      message.embeds.length * n("embeds") + // Embeds
      message.attachments.filter(
        (a) => a.contentType?.startsWith("image/") ?? false
      ).size *
        n("images") + // Images
      message.attachments.filter((a) => !a.contentType?.startsWith("image/"))
        .size *
        n("attachments") + // Non-images
      (message.content.match(/<:[0-9a-zA-Z_]+:[0-9]{18}>/g)?.length ?? 0) *
        n("customEmoji") + // Non-animated custom emojis
      (message.content.match(/<a:[0-9a-zA-Z_]+:[0-9]{18}>/g)?.length ?? 0) *
        n("animatedCustomEmoji") + // Animated custom emojis,
      Number(encodeURIComponent(message.content).includes("%CC%")) *
        n("zalgo") + // Zalgo      + // Zalgo
      (message.mentions.members?.size ?? 0) * n("memberMentions") + // Mentions of members
      message.mentions.roles.size * n("roleMentions") + // Mentions of roles
      Number(message.mentions.everyone) * n("everyoneMentions") + // Everyone/here mentions
      Number(
        crashText.some((t) =>
          message.cleanContent.includes(decodeURIComponent(t))
        )
      ) *
        n("textThatCanCrashApple")
    );
  }

  async messageCreate(message: GuildMessage): Promise<void> {
    const memberKey = `member.${message.guild.id}.${message.author.id}`;
    const timestampKey = `timestamp.${message.guild.id}.${message.author.id}`;
    const guildKey = `guild.${message.guild.id}`;
    const memberPermissions = await message.member.permissionsIn(
      message.channel
    );
    const config = await container.configManager.getConfig(message.guildId);
    const nopt = (opt: string) => Number(config[`${this.name}.${opt}`]);
    const memberCanSendEmbeds = memberPermissions.has("EMBED_LINKS");
    const oldScore = Number(await this.mGet(memberKey)) || 0;
    // const oldGuildScore = Number(await this.mGet(guildKey));
    const maxAllowedScore = nopt("maxScore");
    const incrementScoreBy =
      (Date.now() - Number(await this.mGet(timestampKey)) < 2000 ? 25 : 5) +
      this.calculateScore(message, memberCanSendEmbeds, config as any); // Text that can crash iOS.

    const newScore = oldScore + incrementScoreBy;
    if (await this.mGet(memberKey)) {
      await this.mIncr(memberKey, incrementScoreBy);
    } else {
      await this.mSet(memberKey, incrementScoreBy, nopt("resetAfter"));
    }
    await this.mIncr(guildKey, incrementScoreBy);
    await this.mSet(
      timestampKey,
      message.editedTimestamp || message.createdTimestamp,
      2400
    );

    if (newScore >= maxAllowedScore) {
      container.logger.debug(
        `Anti-flood — ${message.author.tag} оказался(ась) спамером (${newScore}/${maxAllowedScore})`
      );
      await this.mDecr(guildKey, Number(this.mGet(memberKey)) || 0);
      this.memcached.del(memberKey, () => {});
    }
  }

  messageUpdate(_oldMessage: GuildMessage, newMessage: GuildMessage) {
    return this.messageCreate(newMessage);
  }
}
