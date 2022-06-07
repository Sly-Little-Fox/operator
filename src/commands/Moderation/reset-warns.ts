import {
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
} from "@discordjs/builders";
import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import type { GuildInteraction } from "../../types.js";
import { resetWarns } from "../../utilities/punishments.js";
// import { INFO } from "../../config/colors.js";

export class ResetWarnsCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "reset-warnings",
      aliases: ["reset-warns", "сбросить-предупреждения"],
      generateDashLessAliases: true,
      preconditions: ["GuildOnly"],
      requiredUserPermissions: ["KICK_MEMBERS"],
      description: "Resets warning for a user.",
    });
  }

  public async chatInputRun(interaction: GuildInteraction): Promise<void> {
    const user = interaction.options.getUser("member", true);
    const reason = interaction.options.getString("reason") ?? undefined;

    const warning = await this.container.prisma.warning.findFirst({
      where: {
        guildId: interaction.guildId,
        userId: user.id,
      },
    });

    if (!warning) {
      await interaction.reply({
        content: `> ⛔  This member doesn't have any warnings. Did you select correctly?`,
        ephemeral: true,
      });
      return;
    }

    const ids = await resetWarns({
      moderatorId: interaction.user.id,
      guildId: interaction.guildId,
      userId: user.id,
      reason,
    });

    await interaction.reply(
      `🤔 Successfully removed warnings ${ids
        .map((id) => `**#${id}**`)
        .join(", ")}`
    );
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
            .setName("user")
            .setDescription("User to reset warnings for")
        )
        .addStringOption(
          new SlashCommandStringOption()
            .setName("reason")
            .setDescription("А я сейчас вам покажу")
            .setRequired(false)
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
