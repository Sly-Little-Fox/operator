import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { INFO } from "../../config/colors.js";

export class PingCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "ping",
      aliases: ["пинг"],
      description: "Get pinged",
    });
  }

  public async chatInputRun(interaction: CommandInteraction): Promise<void> {
    const before = Date.now();
    await interaction.reply({
      embeds: [
        new MessageEmbed()
          .setColor(INFO)
          .setDescription(":clock2: Measuring ping..."),
      ],
    });
    await interaction.editReply({
      content: "Successfully pinged you",
      embeds: [
        new MessageEmbed()
          .setColor(INFO)
          .setDescription(
            `:ping_pong: Latency is ${new Intl.NumberFormat().format(
              Date.now() - before
            )}ms\n` +
              `:bullettrain_front: WS latency is ${new Intl.NumberFormat().format(
                this.container.client.ws.ping
              )}ms`
          ),
      ],
    });
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
