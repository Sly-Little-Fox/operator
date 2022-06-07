import * as em from "discord-emoji";
import type { DateResolvable } from "discord.js";

const flatEmoji = {
  ...em.activity,
  ...em.flags,
  ...em.food,
  ...em.nature,
  ...em.objects,
  ...em.people,
  ...em.symbols,
  ...em.travel,
};

export function emojify(text: string): string {
  const matches = text.match(/:[+\w-]+:/g) || [];
  let newText = text;
  matches.forEach((match) => {
    const emoji =
      flatEmoji[match.slice(1).slice(0, -1) as keyof typeof flatEmoji];
    if (!emoji) return;
    newText = newText.replace(match, emoji);
  });
  return newText;
}

export function resolveDate(date: DateResolvable): number {
  if (date instanceof Date) return date.getTime();
  if (typeof date === "string") return Date.parse(date);
  return date;
}
