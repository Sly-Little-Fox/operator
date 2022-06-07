import {
  SlashCommandBuilder,
  SlashCommandStringOption,
} from "@discordjs/builders";
import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import { CommandInteraction } from "discord.js";
import { inspect } from "node:util";

export class EvalCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "eval",
      description: "A simple eval command. Bot owner only.",
      preconditions: ["OwnerOnly"],
      flags: ["hidden"],
    });
  }

  public chatInputRun(interaction: CommandInteraction): void {
    setImmediate(() => {
      try {
        const start = Date.now();
        const evalResult = inspect(
          // eslint-disable-next-line no-eval
          eval(interaction.options.getString("code", true)),
          false,
          0
        ).trim();
        interaction.reply(
          // eslint-disable-next-line no-useless-concat
          `> 🕒  Executed in ${Date.now() - start}ms. Result:\n` +
            "```js\n" +
            evalResult.slice(0, 1900) +
            "\n```"
        );
      } catch (e) {
        interaction.reply(
          // eslint-disable-next-line no-useless-concat
          `> ⛔  Encountered an error!\n` +
            "```js\n" +
            inspect(e, false, 1).trim() +
            "\n```"
        );
      }
    });
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
            .setName("code")
            .setDescription("Code to evaluate")
            .setRequired(true)
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
