import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import { CommandInteraction } from "discord.js";
// import type { GuildMemberRoleManager } from "discord.js";
// import { GuildInteraction } from "../types.js";
// import { getWarningType } from "../utilities/utilities.js";
// import replies from "../data/mix/warn.no-perms.json" assert { type: "json" };
// import { INFO } from "../config/colors.js";

export class TestingCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "test",
      description: "bruh moment",
    });
  }

  public async chatInputRun(i: CommandInteraction): Promise<void> {
    i.reply("hi");
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): void {
    registry.registerChatInputCommand(
      {
        name: this.name,
        description: this.description,
      },
      {
        guildIds: ["925371399013564457"],
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
      }
    );
  }
}
