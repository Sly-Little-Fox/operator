import { Listener, ChatInputCommandErrorPayload } from "@sapphire/framework";
import { internalError } from "../formatting.js";

export class ChatInputCommandError extends Listener {
  public async run(
    err: Error,
    { interaction, command }: ChatInputCommandErrorPayload
  ): Promise<void> {
    interaction[interaction.replied ? "followUp" : "reply"]({
      embeds: [
        internalError(
          `The command ${command.name} has thrown a fatal exception.`
        ).setFooter({
          text: `Exception ID: ${await this.container.captureException(err)}`,
        }),
      ],
    });
  }
}
