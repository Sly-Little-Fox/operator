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
import { ERROR } from "../../config/colors.js";
import { GuildInteraction } from "../../types.js";

PaginatedMessage.pageIndexPrefix = "Viewing post";

export class ReddirCommand extends Command {
  private snoots: snoots.Client;

  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "reddit",
      description: "/reddit yi... oh",
    });
    if (!process.env.REDDIT_CLIENT_ID) this.unload();
    if (!process.env.REDDIT_CLIENT_SECRET) this.unload();
    this.snoots = new snoots.Client({
      userAgent: "epic operator reddit command (Lynx#1632)",
      creds: {
        clientId: process.env.REDDIT_CLIENT_ID!,
        clientSecret: process.env.REDDIT_CLIENT_SECRET!,
      },
    });
  }

  public async chatInputRun(i: GuildInteraction): Promise<void> {
    i.deferReply();
    const subreddit = i.options.getString("subreddit", true);
    const sub = await this.snoots.subreddits.fetch(subreddit);
    const posts = await sub.getNewPosts();
    const pgMessage = new PaginatedMessage().setIdle(5 * 60 * 1000);
    posts.forEach((p) => {
      const embed = new MessageEmbed()
        .setTitle(`${p.title} — @${p.author}`)
        .setColor(ERROR)
        .setDescription(
          p.body + `\n**Score**: ${p.score} (${p.upvoteRatio * 100}% upvotes)`
        );
      pgMessage.addPageEmbed(!(p.over18 && !i.channel.nsfw));
      if (p.over18) embed.description += "\n🔞  This post is tagged as NSFW";
    });
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
            .setName("subreddit")
            .setDescription("What subreddit to view xd")
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
