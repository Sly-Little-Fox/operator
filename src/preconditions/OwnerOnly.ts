import { Precondition, PreconditionResult } from "@sapphire/framework";
import type { CommandInteraction } from "discord.js";

const OWNERS = (process.env.OWNERS || "").split(",");

export class UserPrecondition extends Precondition {
  public chatInputRun(interaction: CommandInteraction): PreconditionResult {
    return OWNERS.includes(interaction.user.id)
      ? this.ok()
      : this.error({ message: "Reported :white_check_mark:" });
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    OwnerOnly: never;
  }
}
