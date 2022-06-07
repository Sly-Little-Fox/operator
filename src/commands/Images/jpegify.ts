import {
  SlashCommandAttachmentOption,
  SlashCommandBuilder,
  SlashCommandNumberOption,
  SlashCommandSubcommandBuilder,
  SlashCommandUserOption,
} from "@discordjs/builders";
import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import {
  CommandInteraction,
  DataResolver,
  MessageAttachment,
} from "discord.js";
import path from "path";
import phin from "phin";
import sharp from "sharp";

export class JpegCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "jpegify",
      aliases: ["jpeg", "jpg", "шакалы"],
      description: "Turns a masterpiece into trash and vice versa",
    });
  }

  public async chatInputRun(interaction: CommandInteraction): Promise<void> {
    const q = interaction.options.getNumber("quality", true);
    if (q < 0 || q > 100) {
      await interaction.reply({
        content: "> ***⛔  Quality must be in the 1-100 range***",
        ephemeral: true,
      });
      return;
    }
    const file =
      interaction.options.getSubcommand(true) === "file"
        ? interaction.options.getAttachment("image", true)
        : {
            name: "user",
            attachment: (
              await phin(
                interaction.options.getUser("user", true).displayAvatarURL({
                  format: "jpg",
                  size: 1024,
                })
              )
            ).body,
            width: 1024,
            height: 1024,
            contentType: "image/jpeg",
          };
    if (
      !file.contentType?.startsWith("image/") ||
      !(file.width && file.height) ||
      !(file.width <= 2048 && file.height <= 2048) ||
      !file.name // Shut up TypeScript
    ) {
      await interaction.reply({
        content:
          "> ⛔  The file you provided is not allowed " +
          "(not an image or exceeds 2048x2048)",
        ephemeral: true,
      });
      return;
    }
    const buffer = await DataResolver.resolveFileAsBuffer(file.attachment);
    const start = Date.now();
    const img = await sharp(buffer)
      .jpeg({
        quality: q,
      })
      .toBuffer();
    const timeTaken = Date.now() - start;
    await interaction.reply({
      content:
        "<:blobcatheadache:982294701954707566>  Here is your " +
        `JPEG, enjoy. Generated in ${timeTaken} ms.`,
      files: [
        new MessageAttachment(
          img,
          path.parse(file.name).name + "-icanhasjpeg.jpg"
        ),
      ],
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): void {
    function addGenericOptions(command: SlashCommandSubcommandBuilder) {
      return command.addNumberOption(
        new SlashCommandNumberOption()
          .setName("quality")
          .setDescription("Quality your trash should be (1-100)")
          .setRequired(true)
      );
    }

    registry.registerChatInputCommand(
      new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
          addGenericOptions(
            new SlashCommandSubcommandBuilder()
              .setName("file")
              .setDescription("Trash a file")
              .addAttachmentOption(
                new SlashCommandAttachmentOption()
                  .setName("image")
                  .setDescription("The file to trash")
                  .setRequired(true)
              )
          )
        )
        .addSubcommand(
          addGenericOptions(
            new SlashCommandSubcommandBuilder()
              .setName("user")
              .setDescription("Trash a user's pfp")
              .addUserOption(
                new SlashCommandUserOption()
                  .setName("user")
                  .setDescription("User whose pfp needs to be trashed")
                  .setRequired(true)
              )
          )
        )
        .toJSON() as any,
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
