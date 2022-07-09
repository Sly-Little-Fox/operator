import {
  SlashCommandBuilder,
  SlashCommandNumberOption,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
} from "@discordjs/builders";
import { PaginatedMessage } from "@sapphire/discord.js-utilities";
import {
  Command,
  PieceContext,
  RegisterBehavior,
  ApplicationCommandRegistry,
} from "@sapphire/framework";
import { sentenceCase } from "change-case";
import {
  MessageEmbed,
  ChatInputApplicationCommandData,
  TextInputComponent,
  MessageActionRow,
  ModalActionRowComponent,
  Modal,
  CommandInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import prettier from "prettier";
import { minify } from "terser";
import { INFO } from "../../config/colors.js";
import { success } from "../../formatting.js";
import { GuildInteraction, allEvents } from "../../types.js";
import { awaitModalSubmit } from "../../utilities/utilities.js";

PaginatedMessage.pageIndexPrefix = "Viewing page";

export class HandlerCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "handler",
      aliases: ["handlers", "обработчики"],
      preconditions: ["GuildOnly"],
      description: "This command is used to manipulate handlers.",
      detailedDescription:
        "/handler is used to create, delete, and list handlers.\n" +
        "`ctx` is the main context of handler environment.\n" +
        "Read more about handlers here: https://github.com/Sly-" +
        "Little-Fox/operator/blob/main/docs/Handlers/reference.md",
      requiredUserPermissions: ["ADMINISTRATOR"],
    });
  }

  public async chatInputRun(interaction: GuildInteraction): Promise<void> {
    switch (interaction.options.getSubcommand(true)) {
      case "list": {
        const handlers = await this.container.prisma.handler.findMany({
          where: {
            guildId: interaction.guildId,
          },
        });

        const fields = handlers.map((h) => ({
          name: `${sentenceCase(h.event.replace(/e$/m, "ed"))} handler (#${
            h.id
          })`,
          value: `Action: \`\`\`js\n${h.action}\`\`\``,
        }));

        const pgMessage = new PaginatedMessage().setIdle(5 * 60 * 1000);

        const chunkedFields: typeof fields[] = [];

        let buffer = [];

        for (const field of fields) {
          buffer.push(field);
          if (buffer.reduce((prev, cur) => prev + cur.value.length, 0) >= 768) {
            chunkedFields.push(buffer);
            buffer = [];
          }
        }

        if (buffer.length) chunkedFields.push(buffer);
        buffer = [];

        chunkedFields.forEach((f) =>
          pgMessage.addPageEmbed(
            new MessageEmbed()
              .setColor(INFO)
              .setTitle("\\🛠️  Event handlers")
              .setFields(f)
              .setFooter({
                text: `Handlers for "${interaction.guild.name}"`,
              })
          )
        );

        if (!chunkedFields.length)
          pgMessage.addPageEmbed(
            new MessageEmbed()
              .setColor(INFO)
              .setTitle("\\🛠️  Event handlers")
              .setDescription(
                "This server has no handlers registered! (yet)\n" +
                  "Use **/handler add** to create a handler"
              )
              .setFooter({
                text: `"Handlers for ${interaction.guild.name}"`,
              })
          );

        pgMessage.run(interaction);
        break;
      }

      case "add": {
        let code = interaction.options.getString("code");
        const event = interaction.options.getString("event", true);
        let replyTo: CommandInteraction | ModalSubmitInteraction = interaction;
        if (!code) {
          await interaction.showModal(
            new Modal()
              .setTitle("Handler code modal")
              .setCustomId(`handlerCodeModal.${interaction.id}`)
              .addComponents(
                new MessageActionRow<ModalActionRowComponent>().addComponents(
                  new TextInputComponent()
                    .setCustomId("handlerCodeInput")
                    .setLabel("Code for your handler")
                    .setRequired(true)
                    .setPlaceholder(
                      "ctx.message.reply('А я сейчас вам покажу, откуда на Беларусь готовилось нападение');"
                    )
                    .setStyle("PARAGRAPH")
                )
              )
          );
          if (process.env.SHOW_NOTICES_FOR_OLD_CLIENTS === "1")
            await interaction.followUp({
              content:
                "Opened a modal. Didn't show up? Update your Discord client.",
              ephemeral: true,
            });
          try {
            const modal = await awaitModalSubmit({
              filter: (i) =>
                i.customId === `handlerCodeModal.${interaction.id}`,
              time: 7 * 60 * 1000,
            });
            code = modal.components[0].components[0].value;
            replyTo = modal;
          } catch (e) {
            if ((e as Error).message !== "Timed out") return;
            await interaction.followUp({
              content: "(Спец)операция отмененяется",
              ephemeral: true,
            });
            return;
          }
        }

        try {
          const oldCode = code;
          code = prettier.format(code, {
            parser: "acorn",
          });
          if (code.length > 700) code = (await minify(oldCode)).code || oldCode;
        } catch (e: any) {
          replyTo.reply(
            `> ⛔  Your code is not valid JavaScript! Errors (ANSI codeblock):\n` +
              "```ansi\n" +
              e.toString() +
              "\n```"
          );
          return;
        }

        if (code.length > 768) {
          replyTo.reply(
            `> ⛔  Your code is too long, please make it shorter! (${code.length}/768)`
          );
          return;
        }

        const maybeExists = await this.container.prisma.handler.findFirst({
          where: {
            event,
            action: code,
            guildId: interaction.guildId,
          },
        });

        const { id: createdId } = await this.container.prisma.handler.create({
          data: {
            event,
            action: code,
            guildId: interaction.guildId,
            whoAddedId: interaction.user.id,
          },
        });

        const handlerWarnings = [];

        if (maybeExists)
          handlerWarnings.push(
            `The same handler (#${maybeExists.id}) already exists!`
          );

        if (/require +\(/.test(code))
          handlerWarnings.push(
            "Your handler uses `require`, but it's not available."
          );

        if (/import +[*\w]/.test(code) ?? /import +\(/.test(code))
          handlerWarnings.push(
            "Your handler uses `import`, but it's not available."
          );

        await replyTo.reply({
          embeds: [
            success(
              `Successfully created a "${sentenceCase(
                event.replace(/e$/m, "ed")
              ).toLowerCase()}" handler #${createdId} with code:\n` +
                "```js\n" +
                code.trim() +
                "\n```" +
                handlerWarnings.map((w) => "⚠️ " + w).join("\n")
            ),
          ],
        });
        break;
      }

      case "delete": {
        const handlerId = interaction.options.getNumber("handler-id", true);
        const maybeExists = await this.container.prisma.handler.findFirst({
          where: {
            id: handlerId,
            guildId: interaction.guildId,
          },
        });
        if (!maybeExists) {
          interaction.reply(
            `> ⛔  Handler #${handlerId} doesn't exist or belongs to another server.`
          );
          return;
        }

        await this.container.prisma.handler.delete({
          where: {
            id: handlerId,
          },
        });

        await interaction.reply(
          `🔨 Successfully destroyed handler #${handlerId}\n` +
            `It was a "${sentenceCase(
              maybeExists.event.replace(/e$/m, "ed")
            ).toLowerCase()}" handler with this code:\n` +
            "```js\n" +
            maybeExists.action.trim() +
            "\n```"
        );
        break;
      }

      default: {
        await interaction.reply({
          content:
            ":warning: This subcommand is not yet implemented! " +
            `Report this to <@723971496107573328> if the problem lasts for a long time.`,
          ephemeral: true,
        });
      }
    }
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): void {
    const command = new SlashCommandBuilder()
      .setDescription(this.description)
      .setName(this.name)
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName("add")
          .setDescription("Registers a handler")
          .addStringOption(
            new SlashCommandStringOption()
              .setName("event")
              .setDescription("The event that triggers this handler")
              .setRequired(true)
              .setChoices(
                ...allEvents.map((e) => ({
                  name: sentenceCase(e.replace(/e$/m, "ed")),
                  value: e,
                }))
              )
          )
          .addStringOption(
            new SlashCommandStringOption()
              .setName("code")
              .setDescription("smh code for the handler")
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName("list")
          .setDescription("Lists all handlers")
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName("delete")
          .setDescription("Deletes a handler")
          .addNumberOption(
            new SlashCommandNumberOption()
              .setName("handler-id")
              .setDescription("ID of the handler to delete")
              .setRequired(true)
          )
      );

    registry.registerChatInputCommand(
      command.toJSON() as ChatInputApplicationCommandData,
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
