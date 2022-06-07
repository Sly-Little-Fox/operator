import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import { CommandInteraction } from "discord.js";

export class RestartCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "restart",
      description: "A simple command that restarts the bot. Bot owner only.",
      preconditions: ["OwnerOnly"],
      flags: ["hidden"],
    });
  }

  public async chatInputRun(interaction: CommandInteraction): Promise<void> {
    await interaction.reply("Restarting the bot...");
    await this.container.stores.get("commands").forEach((p) => p.unload());
    await this.container.stores.get("listeners").forEach((p) => p.unload());
    await this.container.stores.get("preconditions").forEach((p) => p.unload());
    await this.container.stores
      .get("interaction-handlers")
      .forEach((p) => p.unload());
    await this.container.stores.get("arguments").forEach((p) => p.unload());
    await interaction.editReply(
      (await interaction.fetchReply())!.content + "\nUnloaded pieces"
    );
    await this.container.client.destroy();
    await interaction.editReply(
      (await interaction.fetchReply())!.content + "\nDestroyed client"
    );
    setTimeout(async () => {
      await interaction.editReply(
        (await interaction.fetchReply())!.content + "\nRestarting the process"
      );
      process.exit(255);
    }, 1500);
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): void {
    registry.registerChatInputCommand(
      new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description),
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
