import Prisma from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { container, LogLevel, SapphireClient } from "@sapphire/framework";
import * as Sentry from "@sentry/node";
import EventEmitter from "@foxify/events";
import { ModalSubmitInteraction } from "discord.js";
import rfs from "rotating-file-stream";
import {
  PREFIX,
  SENTRY_DSN,
  SENTRY_TRACES_SAMPLE_RATE,
} from "../config/main.js";
import { ConfigManager } from "./ConfigManager.js";
import type { Events } from "../types.js";
import { TapkiManager } from "./TapkiManager.js";

const { default: Emitter } = EventEmitter as unknown as {
  default: typeof EventEmitter;
};
const { PrismaClient: PrismaClient2 } = Prisma;

export class OperatorClient extends SapphireClient {
  public constructor() {
    super({
      caseInsensitiveCommands: true,
      caseInsensitivePrefixes: true,
      defaultPrefix: PREFIX,
      loadMessageCommandListeners: false,
      disableMentionPrefix: true,
      intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"],
      logger: { level: LogLevel.Debug },
      allowedMentions: {
        parse: ["users"],
      },
    });
    container.prisma = new PrismaClient2();
    container.configManager = new ConfigManager(container.prisma);
    container.tapkiManager = new TapkiManager(container.prisma);
    container.tapkiTimestamps = new Map<string, number>();
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    });
    container.captureException = Sentry.captureException.bind(Sentry);
    container.events = new Emitter<Events>();
    container.internalEmitter = new Emitter<{
      modal: (modal: ModalSubmitInteraction) => void;
    }>();
    container.rotatingStreamMap = new Map();
    container.commandData = { config: {} };
  }

  public async login(token?: string): Promise<string> {
    await container.prisma.$connect();
    return super.login(token);
  }

  public async destroy(): Promise<void> {
    await container.prisma.$disconnect();
    return super.destroy();
  }

  // TODO: Customisable prefixes
  public fetchPrefix = async (): Promise<readonly string[]> => [
    PREFIX,
    "operator ",
    "op.",
    "op::",
    "operator::",
  ];
}

declare module "@sapphire/pieces" {
  interface Container {
    prisma: PrismaClient;
    configManager: ConfigManager;
    tapkiManager: TapkiManager;
    tapkiTimestamps: Map<string, number>;
    events: EventEmitter<Events>;
    internalEmitter: EventEmitter<{
      modal: (modal: ModalSubmitInteraction) => void;
    }>;
    captureException: (exception: any) => string;
    rotatingStreamMap: Map<string, rfs.RotatingFileStream>;
    commandData: Record<string, Record<string, any>>;
  }
}
