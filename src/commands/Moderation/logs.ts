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
import { readFile } from "fs/promises";

export class JpegCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "logs",
      aliases: ["log", "guild-logs"],
      description:
        "Shows logs for this guild (handler errors, invocations of console.*, etc.)",
      detailedDescription:
        "This command is used for viewing guild logs. They have the following information:\n" +
        "- Flood attempts blocked by anti-flood plugin\n" +
        "- Links blocked by links filtering plugin\n" +
        "- Invocations of console.* by plugins\n" +
        "- Fatal errors from plugins\n",
      preconditions: ["GuildOnly"],
    });
  }

  public async chatInputRun(interaction: CommandInteraction): Promise<void> {
    const level = interaction.options.getString("filter-by-level");
    let logs: {
      type: "log" | "info" | "warn" | "error" | "fatal";
      message: string;
    }[] = (await readFile(`./logs/${interaction.guildId}.txt`, "utf-8"))
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    if (level) logs = logs.filter((el) => el.type === level);
    const newLogs: string[] = [];
    let totalCharLength = 0;
    for (const line of logs) {
      if (totalCharLength > 1951) break;
      const colorCode = `\x1b[${
        {
          log: 0,
          info: 34,
          debug: 178,
          warn: 33,
          error: 31,
          fatal: 31,
        }[line.type as string] || 0
      }m`;
      const newLine = `${colorCode}[${line.type.toUpperCase()}] ${
        line.message
      }\x1b[0m`;
      newLogs.push(newLine);
      totalCharLength += newLine.length + colorCode.length + 4;
    }
    interaction.reply({
      content:
        "Here are your logs:\n```ansi\n" + newLogs.join("\n").trim() + "\n```",
      ephemeral: true,
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
            .setName("filter-by-level")
            .setDescription("Only include certain log level in the output")
            .setChoices(
              {
                name: "Normal",
                name_localizations: { ru: "Обычный" },
                value: "log",
              },
              {
                name: "Info",
                name_localizations: { ru: "Информация" },
                value: "info",
              },
              {
                name: "Warnings",
                name_localizations: { ru: "Предупреждения" },
                value: "warn",
              },
              {
                name: "Errors",
                name_localizations: { ru: "Ошибки" },
                value: "error",
              },
              {
                name: "Fatal",
                name_localizations: { ru: "Фатальные ошибки" },
                value: "fatal",
              }
            )
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
