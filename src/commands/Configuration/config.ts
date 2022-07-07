import {
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
} from "@discordjs/builders";
import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import {
  ChatInputApplicationCommandData,
  CommandInteraction,
  MessageActionRow,
  MessageEmbed,
  Modal,
  ModalActionRowComponent,
  ModalSubmitInteraction,
  TextInputComponent,
  Util,
} from "discord.js";
import { BaseValidator, s } from "@sapphire/shapeshift";
import Fuse from "fuse.js";
import _ from "lodash";
import { sentenceCase } from "change-case";
import { inspect } from "node:util";
import { getConfiguration } from "../../utilities/configUtilities.js";
import { INFO } from "../../config/colors.js";
import { awaitModalSubmit } from "../../utilities/utilities.js";
import { capitalizations } from "../../config/other.js";
// import { INFO } from "../config/colors.js";
// const DB_TARGET = "server";

function formatSetting(value: any[] | string | number | boolean): string {
  switch (typeof value) {
    case "object": {
      if (Array.isArray(value))
        return Util.escapeMarkdown(
          value.some((el) => el.includes(",") ?? el.includes('"'))
            ? JSON.stringify(value)
            : `[${value.join(", ")}]`
        );
      break;
    }

    case "boolean":
      return value ? "Yes" : "No";

    default:
      return Util.escapeMarkdown(String(value));
  }
  return "Looks like Lynx broke something again lol"; // ESLint stop complaining
}

function fromString(str: string): string | number | boolean {
  return (
    {
      true: true,
      yes: true,
      false: false,
      no: false,
      disabled: false,
      enabled: true,
      disable: false,
      enable: true,
    }[str.toLowerCase()] ?? str
  );
}

export class ConfigCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "config",
      aliases: [
        "configuration",
        "конфиг",
        "конфигурация",
        "settings",
        "настройки",
        "cfg",
      ],
      preconditions: ["GuildOnly"],
      description: "This command is used to change configuration of the bot.",
      requiredUserPermissions: ["ADMINISTRATOR"],
    });
  }

  private rawSchema: Record<string, BaseValidator<any>> = {};

  private schema = s.object({});

  private index: Fuse<any> = new Fuse([]);

  private async prepare() {
    if (!_.isEqual(this.rawSchema, {})) return;
    const { rawSchema } = await getConfiguration();
    this.rawSchema = rawSchema;
    this.schema = s.object(this.rawSchema);
    this.index = new Fuse(
      Object.keys(this.rawSchema).map((k) => ({
        id: k,
        value: this.rawSchema[k],
      })),
      {
        threshold: 0.75,
        keys: ["id"],
      }
    );
  }

  public async chatInputRun(interaction: CommandInteraction): Promise<void> {
    await this.prepare();
    if (interaction.guildId === null) return;
    switch (interaction.options.getSubcommand(true)) {
      case "list": {
        const config = await this.container.configManager.getConfig(
          interaction.guildId
        );
        await interaction.reply({
          embeds: [
            new MessageEmbed()
              .setColor(INFO)
              .setTitle("\\⚙️  Configuration entries")
              .setDescription(
                Object.keys(config)
                  .filter((k) =>
                    interaction.options.getBoolean("show_unset")
                      ? true
                      : config[k] !== undefined && config[k] !== null
                  )
                  .map(
                    (setting) =>
                      `${setting}${
                        this.rawSchema[setting]
                          ? ` (${this.rawSchema[setting]?.constructor.name
                              .toLowerCase()
                              .replace("validator", "")})`
                          : ""
                      }: **${
                        config[setting] !== null &&
                        config[setting] !== undefined
                          ? formatSetting(config[setting])
                          : "<unset>"
                      }**`
                  )
                  .join("\n")
              ),
          ],
          // ephemeral: true,
        });
        break;
      }

      case "get": {
        const config = await this.container.configManager.getConfig(
          interaction.guildId
        );
        const key = interaction.options.getString("key", true);
        if (key in config) {
          await interaction.reply(
            `**${key}**: \`${
              config[key] !== null && config[key] !== undefined
                ? formatSetting(config[key])
                : "<unset>"
            }\``
          );
        } else {
          const results = this.index.search(key);
          if (results.length === 0) {
            await interaction.reply(
              "No exact match was found and fuzzy search didn't give any results."
            );
          }
          await interaction.reply(
            ":sparkles: No exact match was found, so fuzzy search was used\n" +
              results
                .map(
                  (r) =>
                    `**${r.item.id}**: ${
                      config[r.item.id] !== null &&
                      config[r.item.id] !== undefined
                        ? formatSetting(config[r.item.id])
                        : "<unset>"
                    }`
                )
                .join("\n")
          );
        }
        break;
      }

      case "set": {
        const key = interaction.options.getString("key", true);
        const append = interaction.options.getBoolean("append") ?? false;
        let value = interaction.options.getString("value");
        let replyTo: CommandInteraction | ModalSubmitInteraction = interaction;
        if (!value) {
          await interaction.showModal(
            new Modal()
              .setTitle("Value input modal")
              .setCustomId(`valueInputModal.${interaction.id}`)
              .addComponents(
                new MessageActionRow<ModalActionRowComponent>().addComponents(
                  new TextInputComponent()
                    .setCustomId("configValueInput")
                    .setLabel(`Value for '${key.slice(0, 33)}'`)
                    .setRequired(true)
                    .setPlaceholder(
                      "А я сейчас вам покажу, откуда на Беларусь готовилось нападение"
                    )
                    .setStyle("PARAGRAPH")
                )
              )
          );
          await interaction.followUp({
            content:
              "Opened a modal. Didn't show up? Update your Discord client.",
            ephemeral: true,
          });
          try {
            const modal = await awaitModalSubmit({
              filter: (i) => i.customId === `valueInputModal.${interaction.id}`,
              time: 5 * 60 * 1000,
            });
            value = modal.components[0].components[0].value;
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
        const config = await this.container.configManager.getConfig(
          interaction.guildId
        );
        const settingAcceptsArrays =
          this.container.configManager.rawSchema[key].constructor.name ===
          "ArrayValidator";
        if (!settingAcceptsArrays && append) {
          replyTo.reply(
            "> ⛔  You are trying to append, but this setting doesn't support arrays!"
          );
          return;
        }
        try {
          const opts = {
            // eslint-disable-next-line no-nested-ternary
            [key]: settingAcceptsArrays
              ? append
                ? ((config[key] as any[]) || []).concat(
                    value
                      .split(/, */)
                      .map((v) => v.trim())
                      .filter((v) => v !== "[UNSET]")
                  )
                : value
                    .split(/, */)
                    .map((v) => v.trim())
                    .filter((v) => v !== "[UNSET]")
              : fromString(value),
          };
          this.schema.parse({
            ...config,
            ...opts,
          });
          this.container.configManager.setOptions(interaction.guildId, opts);
          await replyTo.reply(
            `Successfully set **${key}** to \`${formatSetting(opts[key])}\``
          );
        } catch (e: any) {
          if ("errors" in e) {
            await replyTo.reply(
              "```js\n" +
                (e.errors as [string, string][])
                  .map((el) =>
                    inspect(el[1])
                      .replace(/^ *at.*/gm, "")
                      .trim()
                  )
                  .join("\n\n")
                  .trim() +
                "\n```"
            );
          } else {
            await replyTo.reply("🛑 Error!\n```js\n" + String(e) + "```");
          }
        }
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

  public override async registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): Promise<void> {
    await this.prepare();
    const preparedCommandPayload = Object.keys(this.rawSchema).map((c) => ({
      name: `${
        capitalizations[c.split(".")[1]] ||
        sentenceCase(c.split(".").slice(1).join(" > "), {
          stripRegexp: /a^/m,
        })
          .replace(/dm/gi, "DM")
          .replace(/ai/gi, "AI")
      } (${
        c.split(".")[0] === "core"
          ? "core"
          : `${
              capitalizations[c.split(".")[0]] ?? sentenceCase(c.split(".")[0])
            } plugin`
      })`,
      value: c,
    }));

    this.container.commandData.config.options = preparedCommandPayload;

    let keyOption = new SlashCommandStringOption()
      .setName("key")
      .setDescription("The key smh")
      .setRequired(true);

    if (preparedCommandPayload.length > 25) {
      this.container.logger.warn(
        "Config — Too many options! Using autocomplete (slower)"
      );
      keyOption = keyOption.setAutocomplete(true);
    } else {
      this.container.logger.info(
        "Config — Less than 25 options, using choices (faster)"
      );
      keyOption = keyOption.setChoices(...preparedCommandPayload);
    }

    const command = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName("set")
          .setDescription("Sets a key to a value")
          .addStringOption(keyOption)
          .addStringOption(
            new SlashCommandStringOption()
              .setName("value")
              .setDescription("Maybe provide a value?")
          )
          .addBooleanOption(
            new SlashCommandBooleanOption()
              .setName("append")
              .setDescription("Whether to append the value to the array")
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName("get")
          .setDescription(
            "Gets the value of a key... Is it so hard to understand? 🤨"
          )
          .addStringOption(keyOption)
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName("list")
          .setDescription(
            "Lists all available configuration options. Well that's it?"
          )
          .addBooleanOption(
            new SlashCommandBooleanOption()
              .setName("show_unset")
              .setDescription("Whether to show unset options from the list")
          )
      );
    await registry.registerChatInputCommand(
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
