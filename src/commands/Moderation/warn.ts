import {
  SlashCommandBuilder,
  SlashCommandNumberOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
} from "@discordjs/builders";
import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import { Util } from "discord.js";
import type { GuildInteraction } from "../../types.js";
import { warnMember } from "../../utilities/punishments.js";
// import { INFO } from "../../config/colors.js";

export class WarnCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "warn",
      aliases: ["warn-user", "пред", "варн"],
      preconditions: ["GuildOnly"],
      requiredUserPermissions: ["KICK_MEMBERS"],
      description: "Warns a user and triggers warn handlers, if any",
    });
  }

  public async chatInputRun(interaction: GuildInteraction): Promise<void> {
    const reason = interaction.options.getString("reason") || undefined;
    const weight = (interaction.options.getNumber("weight") ?? 1) as 1 | 2 | 3;
    const user = interaction.options.getUser("member", true);
    const config = await this.container.configManager.getConfig(
      interaction.guildId
    );

    const { id: globalWarningId } = await warnMember({
      guildId: interaction.guildId,
      moderatorId: interaction.user.id,
      userId: user.id,
      weight,
      reason,
    });

    const warningId = (
      await this.container.prisma.warning.findMany({
        where: {
          userId: user.id,
          guildId: interaction.guildId,
        },
      })
    ).length;

    const emojiMappings = {
      "1": "<:normal_warning:978034450384420896>",
      "2": "<:strict_warning:978034450438979635>",
      "3": "<:very_strict_warning:978034450598338560>",
    };

    const nameMappings = {
      "1": "normal",
      "2": "strict",
      "3": "very strict",
    };

    let sentSuccessfully = false;

    if (
      !user.bot &&
      user.id !== this.container.client.user!.id &&
      config["core.warnings.sendDM"]
    ) {
      try {
        await user.send(
          `${
            emojiMappings[weight.toString() as "1" | "2" | "3"]
          } You have been warned in **${Util.escapeMarkdown(
            interaction.guild!.name
          )}** ${
            config["core.warnings.showModerator"]
              ? `by ${interaction.user} and `
              : ""
          }with reason "${Util.escapeCodeBlock(
            Util.escapeInlineCode(reason || "N/A")
          )}".`
        );
        sentSuccessfully = true;
      } catch {}
    }

    if (!config["core.warnings.sendDM"]) sentSuccessfully = true;

    await interaction.reply({
      content: `${
        emojiMappings[weight.toString() as "1" | "2" | "3"]
      } Issued a ${
        nameMappings[weight.toString() as "1" | "2" | "3"]
      } warning #${warningId} (#${globalWarningId} globally) to ${user} with reason "${Util.escapeCodeBlock(
        Util.escapeInlineCode(reason || "N/A")
      )}"${sentSuccessfully ? "" : " (DM could not be sent)"}`,
      allowedMentions: {
        parse: sentSuccessfully ? [] : ["users"],
      },
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): void {
    registry.registerChatInputCommand(
      new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(
          new SlashCommandUserOption()
            .setName("member")
            .setDescription("You want to warn someone, right?")
            .setRequired(true)
        )
        .addStringOption(
          new SlashCommandStringOption()
            .setName("reason")
            .setDescription("Пруфы или слит")
        )
        .addNumberOption(
          new SlashCommandNumberOption()
            .setName("weight")
            .setDescription("Weight of the warning")
            .setChoices(
              { name: "Normal", value: 1 },
              { name: "Strict", value: 2 },
              { name: "Very strict", value: 3 }
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
