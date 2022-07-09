import { MessageEmbed } from "discord.js";
import { ERROR, SUCCESS } from "./config/colors.js";

export function userError(message: string, title = ""): MessageEmbed {
  const embed = new MessageEmbed()
    .setColor(ERROR)
    .setTitle(title)
    // eslint-disable-next-line no-irregular-whitespace
    .setDescription(`:bread: ${message}`);
  return embed;
}

export function externalError(message: string, title = ""): MessageEmbed {
  const embed = new MessageEmbed()
    .setColor(ERROR)
    .setTitle(title)
    // eslint-disable-next-line no-irregular-whitespace
    .setDescription(`:no_entry: ${message}`);
  return embed;
}

export function internalError(message: string, title = ""): MessageEmbed {
  const embed = new MessageEmbed()
    .setColor(ERROR)
    .setTitle(title)
    // eslint-disable-next-line no-irregular-whitespace
    .setDescription(`:no_entry: ${message}`);
  return embed;
}

export function success(message: string, title = ""): MessageEmbed {
  const embed = new MessageEmbed()
    .setColor(SUCCESS)
    .setTitle(title)
    // eslint-disable-next-line no-irregular-whitespace
    .setDescription(`:ok_hand: ${message}`);
  return embed;
}
