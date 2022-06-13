import { PrismaClient } from "@prisma/client";
import { MappedObjectValidator, s } from "@sapphire/shapeshift";
import _ from "lodash";
// import mem from "mem";
import { container } from "@sapphire/framework";
import type { ExtendedMessage } from "../types.js";
// import { getPluginOption } from "../utilities/configUtilities.js";
// import { getPluginOption } from "../utilities/configUtilities.js";
import * as handlers from "../data/links/handlers.js";
import OperatorPlugin from "../classes/OperatorPlugin.js";
import type * as Providers from "../data/links/handlers.js";
// import { getConfig } from "../utilities/utilities.js";

export default class LinksFilteringPlugin extends OperatorPlugin {
  public static readonly PLUGIN_NAME = "links";

  private readonly PLUGIN_NAME = "links";

  public static readonly DEFAULT_CONFIG = {
    cloudflare: undefined,
    fuzzy: undefined,
    safeBrowsing: undefined,
    quad9: undefined,
    yandex: undefined,
    spam404: undefined,
  };

  public static readonly CONFIG_SCHEMA: MappedObjectValidator<any> = {
    cloudflare: s.boolean.optional,
    fuzzy: s.boolean.optional,
    safeBrowsing: s.boolean.optional,
    quad9: s.boolean.optional,
    yandex: s.boolean.optional,
    spam404: s.boolean.optional,
  };

  private urlRegex =
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,24}\b([-a-zA-Z0-9()!@:%_+.~#?&//=]*)/g;

  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  // mgetOption = mem(this.getOption.bind(this), {
  //   maxAge: 3000,
  //   cacheKey: (arguments_) => arguments_.slice(1).join(","),
  // });

  async messageCreate(message: ExtendedMessage): Promise<void> {
    const urls = (message.content + message.ocrResult).match(this.urlRegex);
    if (!urls) return; // No URLs detected, nothing to do

    const config = await container.configManager.getConfig(message.guildId);

    const gopt = (opt: string) => config[`${this.PLUGIN_NAME}.${opt}`];

    const enabledProviders = [
      "quad9",
      "fuzzy",
      "yandex",
      "spam404",
      "cloudflare",
      "safeBrowsing",
    ].filter(gopt);

    const results = await Promise.all(
      urls.map((url) =>
        Promise.all(
          Object.values(handlers)
            .filter((h) => enabledProviders.includes(h.name))
            .map(async (v) => ({
              provider: v.name as keyof typeof Providers,
              result: await v(new URL(url)),
              url,
            }))
        )
      )
    );
    // const results = [{ result: true, provider: "cloudflare" }];
    if (results.flat(2).some((r) => !r.result)) {
      container.events.emit("linkProtectionTriggered", {
        guild: message.guild,
        matches: results
          .flat(2)
          .filter((r) => !r.result)
          .map((r) => ({ url: r.url, provider: r.provider })),
        message,
      });
      //if (message.member.moderatable) {
      //  message.delete();
      //  message.member.timeout(
      //    2 * 3600 * 1000,
      //    `URL(s) in the message has/have been flagged as unsafe by these vendors: ${_.uniq(
      //      results.flat(2).map((r) => r.provider)
      //    ).join(", ")}`
      //  );
      //}
    }
  }

  messageUpdate(
    _oldMessage: ExtendedMessage,
    message: ExtendedMessage
  ): Promise<void> {
    return this.messageCreate(message);
  }
}
