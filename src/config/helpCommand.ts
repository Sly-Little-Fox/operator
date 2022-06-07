import { INFO } from "./colors.js";

export const categoryColors = {
  Information: INFO,
  Other: 16735232,
  Configuration: 1493254,
};

export const categoryFooters: Record<string, (string | undefined)[]> = {
  Other: [
    "https://youtu.be/rSWzpYMKcPs",
    "Did you know? Operator's original avatar was a cookie",
    "🥚",
    "social_credit += 100_000",
    "social_credit /= 2",
    ...Array(4).fill(undefined),
  ],
  Information: [
    "Information about you: You are quite suspicious",
    ...Array(3).fill(undefined),
  ],
};
