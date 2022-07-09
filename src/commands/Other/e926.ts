import {
  SlashCommandBuilder,
  SlashCommandNumberOption,
  SlashCommandStringOption,
} from "@discordjs/builders";
import { PaginatedMessage } from "@sapphire/discord.js-utilities";
import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import { MessageEmbed } from "discord.js";
import phin from "phin";
import { SocksProxyAgent } from "socks-proxy-agent";
import { ERROR } from "../../config/colors.js";
import { externalError, userError } from "../../formatting.js";
import { E926Post, GuildInteraction } from "../../types.js";

PaginatedMessage.pageIndexPrefix = "Viewing post";

export class E926Command extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "e926",
      description: "ok this really searches e926",
      detailedDescription: "bruh what are you looking for here",
    });
  }

  public async chatInputRun(i: GuildInteraction): Promise<void> {
    i.deferReply();
    const query = i.options.getString("query", true);
    const sixTwoOne = ["rating:e", "rating:q", "-rating:s"].some(
      query.includes.bind(query)
    );
    if (sixTwoOne && !i.channel.nsfw) {
      await i.editReply({
        embeds: [userError("The 621 mode only works in NSFW channels.")],
      });
      return;
    }
    const response = await phin({
      // parse: "json",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64; rv:102.0) Gecko/20100101 Firefox/102.0",
        Cookie: process.env.E926_CF_CLEARANCE
          ? `cf_clearance=${encodeURIComponent(
              process.env.E926_CF_CLEARANCE
            )}; path=/; Secure`
          : "",
      },
      url: `https://${
        sixTwoOne ? "e621" : "e926"
      }.net/posts.json?tags=${encodeURIComponent(
        query + " -type:swf"
      )}&limit=25&page=${i.options.getNumber("page") || 0}`,
      core: {
        // 🅱️
        agent: process.env.PROXY_HOST
          ? new SocksProxyAgent({
              hostname: process.env.PROXY_HOST,
              port: Number(process.env.PROXY_PORT),
              username: process.env.PROXY_USERNAME,
              password: process.env.PROXY_PASSWORD,
            })
          : undefined,
      },
    });
    switch (response.statusCode) {
      case 200:
        break;

      case 403: {
        if (response.body.toString().includes("Cloudflare Ray ID")) {
          await i.editReply({
            embeds: [externalError("Cloudflare prevented access, bruh moment")],
          });
          return;
        }
        // falls through
      }

      default: {
        await i.editReply({
          embeds: [
            externalError(`e926.net returned ${response.statusCode} (bruh)`),
          ],
        });
        return;
      }
    }
    const result: { posts: E926Post[] } = JSON.parse(response.body.toString());
    const posts = result.posts.filter(
      (p) => !p.flags.deleted && (sixTwoOne || p.rating === "s")
    );
    if (!posts.length) {
      i.editReply("No posts for you today lol");
      return;
    }
    const pgMessage = new PaginatedMessage().setIdle(5 * 60 * 1000);
    for (const p of posts) {
      pgMessage.addPageEmbed(
        new MessageEmbed()
          .setTitle(`Post ${p.id} by @${p.uploader_id}`)
          .setColor(ERROR)
          .setDescription(
            `**Artists**: ${p.tags.artist?.join(", ") || "none stated"}\n` +
              `**Characters**: ${
                p.tags.character?.join(", ") || "none stated"
              }\n` +
              // `**Tags**: ||${Object.values(p.tags)
              //   .flatMap((t) => Object.values(t))
              //   .join(", ")}||\n` +
              `**Score**: ${p.score.total}`
          )
          .setImage(
            ["jpg", "png", "gif"].includes(p.file.ext)
              ? p.file.url
              : p.sample.url || p.preview.url
          )
      );
    }
    pgMessage.run(i);
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): void {
    registry.registerChatInputCommand(
      new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
          new SlashCommandStringOption()
            .setName("query")
            .setDescription("What are you going to search")
            .setRequired(true)
        )
        .addNumberOption(
          new SlashCommandNumberOption()
            .setName("page")
            .setDescription("Page (ok i'm too lazy to implement it properly)")
        ),
      {
        guildIds:
          process.env.NODE_ENV === "development"
            ? process.env.GUILD_IDS!.split(",")
            : [],
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
      }
    );
  }
}
