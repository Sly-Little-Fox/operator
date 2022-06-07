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
  };

  public static readonly CONFIG_SCHEMA: MappedObjectValidator<any> = {
    resetAfter: s.number,
    maxScore: s.number,
  };

  private calculateScore(message: GuildMessage, canSendEmbeds: boolean) {
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
              .split("\n").length / 1.5
          )
        : 0) + // Lines in message
      Math.round(message.content.length / 150) + // Characters in message
      Number(
        (message.content.match(
          /(?<!<)\bhttps?:\/\/(\w+\.)+(\w+)\b(?![\w\s]*[<])/g
        )?.length ||
          0) &&
          canSendEmbeds
      ) *
        7 + // Links with embeds
      message.embeds.length * 15 + // Embeds
      message.attachments.filter(
        (a) => a.contentType?.startsWith("image/") ?? false
      ).size *
        30 + // Images
      message.attachments.filter((a) => !a.contentType?.startsWith("image/"))
        .size *
        20 + // Non-images
      (message.content.match(/<:[0-9a-zA-Z_]+:[0-9]{18}>/g)?.length || 0) * 2 + // Non-animated custom emojis
      (message.content.match(/<a:[0-9a-zA-Z_]+:[0-9]{18}>/g)?.length || 0) * 5 + // Animated custom emojis,
      Number(/%CC%/g.test(encodeURIComponent(message.content))) * 20 + // Zalgo
      (message.mentions.members?.size || 0) * 10 + // Mentions of members
      message.mentions.roles.size * 40 + // Mentions of roles
      Number(message.mentions.everyone) * 150 + // Everyone/here mentions
      Number(
        crashText.some((t) =>
          message.cleanContent.includes(decodeURIComponent(t))
        )
      ) *
        100
    );
  }

  async messageCreate(message: GuildMessage): Promise<void> {
    const maxAllowedScore = 1000;
    const memberKey = `member.${message.guild.id}.${message.author.id}`;
    const timestampKey = `timestamp.${message.guild.id}.${message.author.id}`;
    const guildKey = `guild.${message.guild.id}`;
    const memberPermissions = await message.member.permissionsIn(
      message.channel
    );
    const memberCanSendEmbeds = memberPermissions.has("EMBED_LINKS");
    const oldScore = Number(await this.mGet(memberKey)) || 0;
    // const oldGuildScore = Number(await this.mGet(guildKey));
    const incrementScoreBy =
      (Date.now() - Number(await this.mGet(timestampKey)) < 2000 ? 25 : 5) +
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
              .split("\n").length / 1.5
          )
        : 0) + // Lines in message
      Math.round(message.content.length / 150) + // Characters in message
      Number(
        (message.content.match(
          /(?<!<)\bhttps?:\/\/(\w+\.)+(\w+)\b(?![\w\s]*[<])/g
        )?.length ||
          0) &&
          memberCanSendEmbeds
      ) *
        7 + // Links with embeds
      message.embeds.length * 15 + // Embeds
      message.attachments.filter(
        (a) => a.contentType?.startsWith("image/") ?? false
      ).size *
        30 + // Images
      message.attachments.filter((a) => !a.contentType?.startsWith("image/"))
        .size *
        20 + // Non-images
      (message.content.match(/<:[0-9a-zA-Z_]+:[0-9]{18}>/g)?.length || 0) * 2 + // Non-animated custom emojis
      (message.content.match(/<a:[0-9a-zA-Z_]+:[0-9]{18}>/g)?.length || 0) * 5 + // Animated custom emojis,
      Number(/%CC%/g.test(encodeURIComponent(message.content))) * 20 + // Zalgo
      (message.mentions.members?.size || 0) * 10 + // Mentions of members
      message.mentions.roles.size * 40 + // Mentions of roles
      Number(message.mentions.everyone) * 150 + // Everyone/here mentions
      Number(
        crashText.some((t) =>
          message.cleanContent.includes(decodeURIComponent(t))
        )
      ) *
        100; // Text that can crash iOS.

    const newScore = oldScore + incrementScoreBy;
    // const newGuildScore = oldGuildScore + incrementScoreBy;

    if (await this.mGet(memberKey)) {
      await this.mIncr(memberKey, incrementScoreBy);
    } else {
      await this.mSet(
        memberKey,
        incrementScoreBy,
        Number(FloodPlugin.DEFAULT_CONFIG.resetAfter)
      );
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
      await message.author.send("Не спамь!");
      if (message.guild.features.includes("COMMUNITY")) {
        if (message.member.moderatable) {
          await message.member.timeout(30 * 60 * 1000, "Spam");
        } else {
          container.logger.warn(
            `Anti-flood — Couldn't timeout ${message.author.tag}! (Not moderatable)`
          );
        }
      } else {
        container.logger.warn(
          `Anti-flood — Couldn't timeout ${message.author.tag}! (Guild '${message.guild.name}' is not community)`
        );
      }
      await message.delete();
      await this.mDecr(guildKey, Number(this.mGet(memberKey)) || 0);
      this.memcached.del(memberKey, () => {});
    }
  }
}
