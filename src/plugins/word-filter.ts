import { PrismaClient } from "@prisma/client";
import { MappedObjectValidator, s } from "@sapphire/shapeshift";
import { readdirSync, readFileSync } from "fs";
import { container } from "@sapphire/framework";
import Fuse from "fuse.js";
import { sentenceCase } from "change-case";
import { ExtendedMessage, Features } from "../types.js";
import OperatorPlugin from "../classes/OperatorPlugin.js";
import { resolve } from "../utilities/utilities.js";

const filters = readdirSync(resolve("../data/wordlists/", import.meta));

export default class LinksFilteringPlugin extends OperatorPlugin {
  public static readonly PLUGIN_NAME = "word-filter";

  private readonly PLUGIN_NAME = "word-filter";

  public FEATURES_USED = [Features.OCR];

  public static readonly DEFAULT_CONFIG = {
    obsceneFilters: [],
    sensitiveFilters: [],
    customFilteredWords: [],
  };

  public static readonly CONFIG_SCHEMA: MappedObjectValidator<any> = {
    obsceneFilters: s.enum(
      ...filters
        .filter((n) => n.startsWith("obscene-"))
        .map((n) => n.slice(8).slice(0, -4))
    ).array,
    sensitiveFilters: s.enum(
      ...filters
        .filter((n) => n.startsWith("sensitive-"))
        .map((n) => n.slice(8).slice(0, -4))
    ).array,
    customFilteredWords: s.string.lengthLessThanOrEqual(256).array,
  };

  private readonly filterData = (() => {
    const data: Record<string, string> = {};
    filters.forEach((f) => {
      data[f] = readFileSync(
        resolve(`../data/wordlists/${f}`, import.meta),
        "utf-8"
      );
    });
    return data;
  })();

  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  async messageCreate(message: ExtendedMessage): Promise<void> {
    const config = await container.configManager.getConfig(message.guildId);
    const filteredWords = (
      config[this.PLUGIN_NAME + ".obsceneFilters"] as string[]
    )
      .map((filter) => this.filterData[filter])
      .concat(
        (config[this.PLUGIN_NAME + ".sensitiveFilters"] as string[]).map(
          (filter) => this.filterData[filter]
        )
      )
      .flat()
      .concat(config[this.PLUGIN_NAME + ".customFilteredWords"] as string[]);
    const fuse = new Fuse(
      [(sentenceCase(message.content) || message.content).toLowerCase()],
      {
        useExtendedSearch: true,
        threshold: 0.25,
      }
    );
    if (fuse.search(filteredWords.join("|").toLowerCase()).length)
      await message.delete();
  }

  messageUpdate(
    _oldMessage: ExtendedMessage,
    message: ExtendedMessage
  ): Promise<void> {
    return this.messageCreate(message);
  }
}
