import { ExcludeEnum } from "discord.js";
import { ActivityTypes } from "discord.js/typings/enums";

export const capitalizations: { [key: string]: string } = {
  uwu: "UwU",
  enableAI: "Enable AI",
};

export const statuses = [
  {
    name: "uwu",
    type: "WATCHING",
  },
  {
    name: "https://youtu.be/boMaTNuYTyg",
    type: "WATCHING",
  },
  {
    name: "разгон E5",
    type: "WATCHING",
  },
  {
    name: "Genshin Impact",
    type: "PLAYING",
  },
  {
    name: "Rick Astley - Never Gonna Give You Up (Official Music Video) - YouTube",
    type: "WATCHING",
  },
  {
    name: "e926",
    type: "STREAMING",
  },
  {
    name: "Minecraft",
    type: "STREAMING",
  },
  {
    name: "❤️ Reila",
    type: "PLAYING",
  },
] as { name: string; type: ExcludeEnum<typeof ActivityTypes, "CUSTOM"> }[];
