import {
  UserError,
  ChatInputCommandDeniedPayload,
  Identifiers,
  Listener,
} from "@sapphire/framework";
import { userError } from "../formatting.js";

export class ChatInputDeniedListener extends Listener {
  public run(
    err: UserError,
    { interaction }: ChatInputCommandDeniedPayload
  ): void {
    switch (err.identifier) {
      case Identifiers.PreconditionUserPermissions: {
        interaction.reply({
          embeds: [userError(err.message)],
        });
        break;
      }

      case Identifiers.PreconditionClientPermissions: {
        interaction.reply({
          embeds: [userError(err.message)],
        });
        break;
      }

      case "OwnerOnly": {
        interaction.reply({ content: "no", ephemeral: true });
        break;
      }

      default:
      // this.container.logger.warn("Unhandled user error!", err.identifier);
    }
  }
}
