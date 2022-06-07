import {
  SlashCommandAttachmentOption,
  SlashCommandBuilder,
  SlashCommandNumberOption,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
  SlashCommandUserOption,
} from "@discordjs/builders";
import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import { sentenceCase } from "change-case";
import {
  CommandInteraction,
  DataResolver,
  MessageAttachment,
} from "discord.js";
import { readdir } from "fs/promises";
import path from "path";
import phin from "phin";
import sharp from "sharp";

export class OverlayCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "overlay",
      aliases: ["overlay-image"],
      description: "Adds a semi-transparent overlay to an image.",
    });
  }

  public async chatInputRun(interaction: CommandInteraction): Promise<void> {
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
    const overlay = interaction.options.getString("overlay", true);
    const opacity = interaction.options.getNumber("opacity") ?? 40;
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
    const original = await sharp(buffer);
    const meta = await original.metadata();
    const img = await original
      .composite([
        {
          input: await sharp(`./dist/data/overlays/${overlay}.png`)
            .resize({
              fit: "cover",
              width: meta.width!,
              height: meta.height!,
            })
            .removeAlpha()
            .ensureAlpha(opacity / 100)
            .toBuffer(),
        },
      ])
      .jpeg({
        quality: 90,
      })
      .toBuffer();
    const timeTaken = Date.now() - start;
    await interaction.reply({
      content:
        "<:blobcatheadache:982294701954707566>  Here is your " +
        `image, enjoy. Generated in ${timeTaken} ms.`,
      files: [
        new MessageAttachment(
          img,
          `${path.parse(file.name).name}-${overlay}.jpg`
        ),
      ],
    });
  }

  public override async registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): Promise<void> {
    const overlays = (await readdir("./dist/data/overlays/")).map((o) =>
      path.basename(o, ".png")
    );

    const choices = overlays.map((o) => ({
      name: sentenceCase(o),
      value: o,
    }));

    function addGenericOptions(command: SlashCommandSubcommandBuilder) {
      return command
        .addStringOption(
          new SlashCommandStringOption()
            .setName("overlay")
            .setDescription("Overlay for the image")
            .setChoices(...choices)
            .setRequired(true)
        )
        .addNumberOption(
          new SlashCommandNumberOption()
            .setName("opacity")
            .setDescription("Overlay opacity (40% default)")
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
                  .setDescription("The file")
                  .setRequired(true)
              )
          )
        )
        .addSubcommand(
          addGenericOptions(
            new SlashCommandSubcommandBuilder()
              .setName("user")
              .setDescription("smh")
              .addUserOption(
                new SlashCommandUserOption()
                  .setName("user")
                  .setDescription("User")
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
