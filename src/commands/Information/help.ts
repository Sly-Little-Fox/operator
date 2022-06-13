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
import { sentenceCase } from "change-case";
import type { CommandInteraction } from "discord.js";
import _ from "lodash";
import { INFO } from "../../config/colors.js";
import { categoryFooters } from "../../config/helpCommand.js";
import { untilLength } from "../../utilities/utilities.js";

export class HelpCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "help",
      aliases: ["справка", "хелп", "хэлп"],
      description: "Stop messing with commands. Get some help.",
      detailedDescription:
        "Well this is a help command? Usage:\n" +
        "➲ /help — Sends a brief help message covering all commands.\n" +
        "➲ /help <command | category> — Sends a detailed message containing " +
        "aliases of a command, its description and detailed description.",
    });
  }

  public async chatInputRun(interaction: CommandInteraction): Promise<void> {
    const subject = interaction.options.getString("subject");
    if (subject) {
      if (subject.split("+")[0] === "command") {
        const cmd = this.container.stores
          .get("commands")
          .get(subject.split("+")[1])!;
        await interaction.reply({
          embeds: [
            {
              title: `\\ℹ️ ${_.capitalize(subject.split("+")[1])} (${
                subject.split("+")[0]
              })`,
              color: INFO,
              description:
                `**Aliases**: ${
                  cmd.aliases?.length
                    ? cmd.aliases.map((a) => `\`${a}\``).join(", ")
                    : "none"
                }\n` +
                `**Category**: ${
                  cmd.category ? cmd.fullCategory.join(" > ") : "none"
                }\n\n` +
                (cmd.detailedDescription.toString() ?? cmd.description),
              footer: {
                text: (
                  await this.container.configManager.getUserConfig(
                    interaction.user.id,
                    interaction.guildId
                  )
                )["core.footers"]
                  ? categoryFooters[
                      // eslint-disable-next-line no-prototype-builtins
                      categoryFooters.hasOwnProperty(cmd.category!)
                        ? cmd.category!
                        : "Other"
                    ][
                      Math.floor(
                        Math.random() *
                          (
                            categoryFooters[cmd.category ?? "Other"] ??
                            categoryFooters.Other
                          ).length
                      )
                    ]
                  : "",
              },
            },
          ],
        });
      }
    } else {
      await interaction.reply({
        embeds: [
          {
            title: "\\ℹ️ Commands list",
            color: INFO,
            fields: this.container.stores.get("commands").map((command) => ({
              name: `${command.name
                .slice(0, 1)
                .toUpperCase()}${command.name.slice(1)} ${
                command.aliases?.length
                  ? `(${untilLength(command.aliases, 23)})`
                  : ""
              }`,
              value: command.description,
            })),
            footer: {
              text: "Blame Lynx#1632",
            },
          },
        ],
      });
    }
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
            .setName("subject")
            .setDescription("Command to get help about")
            .setChoices(
              ..._.uniq(
                this.container.stores
                  .get("commands")
                  .filter((c) => !c.fullCategory.includes("Hidden"))
                  .map((c) => ({
                    name: `${sentenceCase(
                      c.name.replaceAll("-", "_")
                    )} (command)`,
                    value: `command+${c.name}`,
                  }))
              )
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
