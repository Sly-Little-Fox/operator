import {
  SlashCommandBuilder,
  SlashCommandNumberOption,
  SlashCommandStringOption,
} from "@discordjs/builders";
import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import type { GuildInteraction } from "../../types.js";
import { removeWarn } from "../../utilities/punishments.js";
// import { INFO } from "../../config/colors.js";

export class RemoveWarnCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "remove-warn",
      aliases: ["remwarn", "убрать-пред"],
      generateDashLessAliases: true,
      preconditions: ["GuildOnly"],
      requiredUserPermissions: ["KICK_MEMBERS"],
      description: "Removes a warning",
    });
  }

  public async chatInputRun(interaction: GuildInteraction): Promise<void> {
    const warningId = interaction.options.getNumber("warning-id", true);
    const reason = interaction.options.getString("reason") ?? undefined;

    const warning = await this.container.prisma.warning.findFirst({
      where: {
        id: warningId,
        guildId: interaction.guildId,
      },
    });

    if (!warning) {
      await interaction.reply({
        content: `> ⛔  Warning #${warningId} doesn't exist or belongs to another server.`,
        ephemeral: true,
      });
      return;
    }

    await removeWarn({
      moderatorId: interaction.user.id,
      warningId,
      reason,
    });

    await interaction.reply(`🤔 Successfully removed warning #${warningId}`);
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): void {
    registry.registerChatInputCommand(
      new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addNumberOption(
          new SlashCommandNumberOption()
            .setName("warning-id")
            .setDescription("Global ID of the warning to remove")
            .setRequired(true)
        )
        .addStringOption(
          new SlashCommandStringOption()
            .setName("reason")
            .setDescription("А я сейчас вам покажу")
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
