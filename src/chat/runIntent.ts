import type { CommandInteraction, Message } from "discord.js";
import { SapphireClient } from "@sapphire/framework";
// import * as Intents from "./intents.js";
import type { WitResponse } from "../types.js";

export default async function runIntent(
  message: Message,
  intent: string | ((witResponse: WitResponse) => void),
  client: SapphireClient,
  witResponse: WitResponse
): Promise<void> {
  // const intent = (
  //   Intents as Record<string, string | ((witResponse: WitResponse) => void)>
  // )[intentKey];
  if (typeof intent === "function") {
    intent(witResponse);
    return;
  }
  if (intent.startsWith("command:")) {
    const commandName = intent.slice("command:".length);
    const command = client.stores.get("commands").get(commandName);
    if (!command?.supportsChatInputCommands())
      throw new Error(
        `Command '${commandName}' does not support chat input commands. Refusing.`
      );
    command.chatInputRun(
      {
        channel: message.channel,
        channelId: message.channelId,
        commandName: "fake-intent-command",
        commandId: "-42",
        ephemeral: false,
        guild: message.guild,
        guildId: message.guildId,
        reply: message.reply.bind(message),
        deferReply: () => {},
        editReply: () => {},
        options: {
          getString: () => null,
          get: () => null,
          getBoolean: () => null,
          getNumber: () => null,
        },
        inGuild: () => true,
        inCachedGuild: () => true,
        inRawGuild: () => false,
        createdTimestamp: message.createdTimestamp,
        createdAt: message.createdAt,
        client: message.client,
        id: "fake-interaction-123",
      } as unknown as CommandInteraction,
      {
        commandName: "fake-intent-command",
        commandId: "-42",
      }
    );
  } else if (intent) message.channel.send(intent);
}
