import Discord, { Guild, GuildMember } from "discord.js";
import type * as Providers from "./data/links/handlers.js";

export type UniversalGuildChannel =
  | Discord.TextChannel
  | Discord.ThreadChannel
  | Discord.VoiceChannel
  | Discord.StageChannel
  | Discord.NewsChannel
  | Discord.CategoryChannel;

export type GuildMessage = Discord.Message & {
  guild: Discord.Guild;
  guildId: Discord.Snowflake;
  channel: Discord.GuildChannel & Discord.TextChannel;
  member: Discord.GuildMember;
};

export type ExtendedMessage = GuildMessage & {
  ocrResult: string;
};

export type GuildInteraction = Discord.CommandInteraction & {
  guild: Discord.Guild;
  guildId: Discord.Snowflake;
  channel: Discord.GuildChannel & Discord.TextChannel;
  member: Discord.GuildMember;
};

export interface E926Post {
  id: number;
  rating: string;
  created_at: string;
  updated_at: string;
  uploader_id: number;
  description: string;
  preview: { url: string };
  flags: { deleted: boolean };
  tags: Record<string, string[]>;
  file: { ext: string; url: string };
  sample: { has: boolean; url: string };
  score: { up: number; down: number; total: number };
}

export interface WitIntent {
  id: `${number}`;
  name: string;
  confidence: number;
}

export interface WitTrait {
  id: "string";
  value: string;
  confidence: number;
}

export interface WitResponse {
  text: string;
  intents: WitIntent[];
  traits: Record<string, WitTrait[]>;
}

export interface Plugin {
  name: string;
  FEATURES_USED?: string[];
  /** @deprecated Use messageCreate instead */
  run: (message: ExtendedMessage) => Promise<void>;
  messageCreate: (message: ExtendedMessage) => Promise<void>;
  messageDelete: (message: ExtendedMessage) => Promise<void>;
  messageUpdate: (
    oldMessage: ExtendedMessage,
    newMessage: ExtendedMessage
  ) => Promise<void>;
}

export interface ModerateContentResponse {
  url_classified: string;
  rating_index: 1 | 2 | 3;
  rating_letter: "e" | "t" | "a";
  predictions: {
    teen: number;
    everyone: number;
    adult: number;
  };
  rating_label: "everyone" | "teen" | "adult";
  error_code: number;
}

export interface PanelOptions {
  id: string;
  label?: string;
  data?: { label: string; icon?: string; id: string }[];
  placeholder?: string;
  default?: number | string | string[] | Record<string, boolean>;
}

export type Panel = PanelOptions[];

export interface ConfigurationField {
  id: string;
  // min?: number;
  // max?: number;
  value?: number | string | Record<string, boolean>;
  type: "number" | "one-choice" | "multi-choice" | "textarea" | "text";
  // choices?: Record<string, boolean>;
}

export type Configuration = ConfigurationField[];

export interface PluginMetadata {
  name: string;
  builtIn: boolean;
  description: string;
  panelTemplate: Panel;
  configuration: Configuration;
}

export type Config = Record<string, string | number | boolean | any[]>;
// export type SanitizedMessage = ReturnType<typeof sanitizeMessage>;

export interface MessageEventContext {
  message: GuildMessage;
  guild: Guild;
}

export interface GenericEventContext {
  member?: GuildMember;
  guild: Guild;
}

export interface MemberEventContext {
  member: GuildMember;
  guild: Guild;
}

export interface MemberEventContextWithReason {
  member: GuildMember;
  guild: Guild;
  reason?: string;
}

export interface GenericEventContextWithReason {
  member?: GuildMember;
  guild: Guild;
  reason?: string;
}

export interface WarningEventContext {
  member: GuildMember;
  moderator?: GuildMember;
  guild: Guild;
  reason?: string;
  warningId: number;
}

export type Events = {
  memberLeft: (ctx: MemberEventContext) => void;
  memberJoined: (ctx: MemberEventContext) => void;
  messageCreate: (ctx: MessageEventContext) => void;
  messageDelete: (ctx: MessageEventContext) => void;
  messageUpdate: (
    ctx: MessageEventContext & {
      oldMessage: GuildMessage;
    }
  ) => void;
  warningCreated: (ctx: WarningEventContext) => void;
  warningRemoved: (ctx: WarningEventContext) => void;
  warningsReset: (
    ctx: MemberEventContext & {
      reason?: string;
      warningIds: number[];
      moderator?: GuildMember;
    }
  ) => void;
  userKicked: (ctx: MemberEventContextWithReason) => void;
  userBanned: (
    ctx: MemberEventContextWithReason & {
      deleteMessagesDays?: number;
    }
  ) => void;
  userTimedOut: (
    ctx: MemberEventContextWithReason & {
      time: number | null;
    }
  ) => void;
  antiFloodTriggered: (
    ctx: MessageEventContext & {
      score: number;
    }
  ) => void;
  linkProtectionTriggered: (
    ctx: MessageEventContext & {
      matches: { url: string; provider: keyof typeof Providers }[];
    }
  ) => void;
  wordFilterTriggered: (
    ctx: MessageEventContext & {
      matchesWithConfidence: { match: string; confidence: string }[];
    }
  ) => void;
  punishmentFailed: (
    ctx: MemberEventContext & {
      message?: string;
      source: "antiFlood" | "linkProtection" | "handler" | "wordFilter";
    }
  ) => void;
};

export const allEvents = [
  "memberLeft",
  "userKicked",
  "userBanned",
  "memberJoined",
  "userTimedOut",
  "messageCreate",
  "messageUpdate",
  "messageDelete",
  "warningsReset",
  "warningCreated",
  "punishmentFailed",
  "antiFloodTriggered",
  "wordFilterTriggered",
  "linkProtectionTriggered",
];

export enum Features {
  OCR = "ocr",
}

export type AnyContext =
  | MessageEventContext
  | GenericEventContext
  | WarningEventContext;
