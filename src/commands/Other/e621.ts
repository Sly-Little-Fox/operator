import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import { CommandInteraction } from "discord.js";
import { WARNING } from "../../config/colors.js";

export class E621Command extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "e621",
      description: "Posts a random image from e621... Really? 👀",
      detailedDescription:
        "This command shows a random image from e621.. Or does it really do that?\n" +
        "||Just kidding, it doesn't. This is a joke command made for trolling people.||\n" +
        "||:gun: Go to horny jail||",
    });
  }

  private readonly replies = [
    {
      embeds: [
        {
          title: "Identity verification required",
          description:
            "You need to verify that you are at least 18 years old by providing your passport!",
          color: WARNING,
          footer: { text: "get trolled" },
        },
      ],
    },
    `You can use this command <t:${Math.round(
      Date.now() / 1000 + 567_648_000
    )}:R>`,
    "E621 API returned an error: 666 Hvatit drochit'",
    "<https://e926.net> anyone?",
    "Can you do that yourself please",
  ];

  public async chatInputRun(i: CommandInteraction): Promise<void> {
    i.reply(this.replies[Math.floor(Math.random() * this.replies.length)]);
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): void {
    registry.registerChatInputCommand(
      {
        name: this.name,
        description: this.description,
      },
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
