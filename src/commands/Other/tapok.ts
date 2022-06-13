import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandUserOption,
} from "@discordjs/builders";
import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import { CommandInteraction, Util } from "discord.js";

export class TapokCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "тапок",
      description: "RPG про тапки",
      // preconditions:["O"]
    });
  }

  public async chatInputRun(interaction: CommandInteraction): Promise<void> {
    const names: Record<string, string> = {
      Houl: "Хоул",
      Lynx: "Линкс",
      ovinu: "Овину",
    };

    function formatUsername(username: string, checkMap = true) {
      return Util.escapeMarkdown(
        checkMap ? names[username] ?? username : username
      ).replaceAll("@", "@\u200b");
    }

    switch (interaction.options.getSubcommand(true)) {
      case "кинуть": {
        const lastTapok =
          this.container.tapkiTimestamps.get(
            `${interaction.user.id}.lastTapok`
          ) || 0;
        if (Date.now() - lastTapok < 1 * 60 * 1000) {
          await interaction.reply(
            `> 🕒  Подожди ${Math.round(
              60 - (Date.now() - lastTapok) / 1000
            )} секунд(у) перед тем, как кинуть ещё один тапок`
          );
          return;
        }
        this.container.tapkiTimestamps.set(
          `${interaction.user.id}.lastTapok`,
          Date.now()
        );
        const user = interaction.options.getUser("пользователь", true);
        const hpDealt =
          Math.random() > 0.3 ? Math.round((Math.random() + 0.4) * 60) : 0;
        const agressor = await this.container.tapkiManager.getUser(
          interaction.user.id
        );
        const target = await this.container.tapkiManager.getUser(user.id);
        if (Date.now() - (agressor?.inHospitalFrom ?? 0) < 2 * 60 * 60 * 1000) {
          await interaction.reply(
            `> 🚑  Вы сейчас в больнице, оттуда тапок не долетит!`
          );
          return;
        }
        if ((agressor?.tapki || 1) < 1) {
          await interaction.reply(
            `> 💀  У тебя не осталось тапков, чтобы кидать`
          );
          return;
        }
        if (Date.now() - (target?.inHospitalFrom ?? 0) < 2 * 60 * 60 * 1000) {
          await interaction.reply(
            `> 🚑  ${formatUsername(user.username)} сейчас в больнице (игровой)`
          );
          return;
        }
        if (target) {
          await this.container.tapkiManager.setHealth(
            user.id,
            target.hp - hpDealt < 0 ? 0 : target.hp - hpDealt
          );
        }
        if (target && target.hp <= 0) {
          await this.container.tapkiManager.toHospital(user.id);
          await this.container.tapkiManager.setHealth(user.id, 1000);
        }
        if (target)
          await this.container.tapkiManager.decrTapki(interaction.user.id, 1);
        this.container.logger.debug(
          target,
          (target?.hp || 1000) <= 0,
          target?.hp
        );
        await interaction.reply(
          hpDealt
            ? `> 💥  **${formatUsername(
                interaction.user.username
              )}** попал тапком в ${user}${
                target
                  ? ` и снёс ${hpDealt} HP. У **${formatUsername(
                      user.username,
                      false
                    )}** осталось ${target.hp - hpDealt}/1000 HP`
                  : ""
              }${target && target.hp <= 0 ? ", и он попадает в больницу" : ""}.`
            : `> 🚩  **${formatUsername(
                interaction.user.username
              )}** кинул тапком в **${formatUsername(
                user.username,
                false
              )}**, но не попал.`
        );
        break;
      }

      case "профиль": {
        const user =
          interaction.options.getUser("пользователь") || interaction.user;
        const gameUser = await this.container.tapkiManager.getUser(user.id);
        if (!gameUser) {
          await interaction.reply(
            `> ⛔  У ${formatUsername(
              user.username,
              false
            )} нет аккаунта в Tapki RPG`
          );
          return;
        }
        await interaction.reply(
          `> 👁️  **${formatUsername(user.username, false)}** — ${
            gameUser.hp
          } HP, ${gameUser.tapki} ${
            gameUser.tapki % 10 === 1 ? "тапок" : "тапков"
          } в инвентаре${
            Date.now() - (gameUser?.inHospitalFrom ?? 0) < 2 * 60 * 60 * 1000
              ? ", в больнице"
              : ""
          }`
        );
        break;
      }

      case "выйти": {
        this.container.tapkiTimestamps.set(
          `${interaction.user.id}.deletedAccount`,
          Date.now()
        );
        const { count } = await this.container.tapkiManager.deleteUser(
          interaction.user.id
        );
        await interaction.reply(
          `> 💥  Аккаунт успешно удалён${count ? "" : " (ну его и не было)"}`
        );
        break;
      }

      case "принять-участие": {
        if (
          Date.now() -
            (this.container.tapkiTimestamps.get(
              `${interaction.user.id}.deletedAccount`
            ) || 0) <
          60 * 60 * 1000
        ) {
          await interaction.reply("> ⛔  Подожди хоть час-то");
          return;
        }
        await this.container.tapkiManager.touch(interaction.user.id);
        await interaction.reply("> :a:  Аккаунт успешно создан");
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
    registry.registerChatInputCommand(
      new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName("профиль")
            .setDescription("Показывает профиль пользователя")
            .addUserOption(
              new SlashCommandUserOption()
                .setName("пользователь")
                .setDescription("Пользователь, профиль которого надо показать")
            )
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName("кинуть")
            .setDescription("Кинуть тапком в пользователя")
            .addUserOption(
              new SlashCommandUserOption()
                .setName("пользователь")
                .setDescription("А кого ухлопать тапком?")
                .setRequired(true)
            )
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName("принять-участие")
            .setDescription("Принять участие в Tapki RPG")
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName("выйти")
            .setDescription("Удалить аккаунт Tapki RPG 😢")
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
