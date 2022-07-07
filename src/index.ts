/* eslint-disable @typescript-eslint/return-await */
// import "dotenv/config";
// import "@sapphire/plugin-hmr/register";
import "@sapphire/plugin-logger/register";
// import { fetch, FetchResultTypes } from "@sapphire/fetch";
import {
  CommandInteraction,
  InteractionReplyOptions,
  MessageEmbed,
  Util,
} from "discord.js";
import path from "path";
// import * as Sentry from "@sentry/node";
import { s } from "@sapphire/shapeshift";
// import { fileURLToPath } from "url";
// import { dirname } from "path";
import { container as cntr, container } from "@sapphire/framework";
import { readdir } from "fs/promises";
import _ from "lodash";
import owoify from "owoify-js";
import tryToCatch from "try-to-catch";
import phin from "phin";
// import { SocksProxyAgent } from "socks-proxy-agent"; // TODO: remove in production
import Fuse from "fuse.js";
import cron from "node-cron";
import * as intents from "./chat/intents.js";
import runIntent from "./chat/runIntent.js";
// import { SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE } from "./config/main.js";
// import { OperatorClient } from "./classes/OperatorClient.js";
import { WARNING } from "./config/colors.js";
import { OperatorClient } from "./classes/OperatorClient.js";
import { statuses } from "./config/other.js";
import {
  ExtendedMessage,
  Features,
  GuildMessage,
  Plugin as OperatorPlugin,
  WitResponse,
} from "./types.js";
import { emojify } from "./utilities/converters.js";
import { registerEventForHandlers } from "./utilities/handlingEvents.js";

process.on("uncaughtException", (err) => {
  if (err.message.endsWith("Received one or more errors")) {
    (err as unknown as { errors: [string, string][] }).errors.forEach((e) => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw e[1];
    });
  }
  if (
    err.message.includes("Cannot send messages") ||
    err.message.includes("Missing permission")
  )
    return;
  if (err.stack?.includes("vm.js")) return;
  throw err;
});

process.on("uncaughtRejection", (err) => {
  if (err.stack?.includes("vm.js")) return;
  throw err;
});

// Patch __filename

// eslint-disable-next-line
const __filename = new URL("", import.meta.url).pathname;
// eslint-disable-next-line
const __dirname = path.dirname(__filename);

process.chdir(path.join(__dirname, ".."));

// Check that all env vars are present to avoid runtime errors

s.object({
  GUILD_IDS: process.env.NODE_ENV === "development" ? s.string : s.any.optional,
  NODE_ENV: s.string,
}).parse(process.env);

const client = new OperatorClient();

const plugins: OperatorPlugin[] = [];

client.on("ready", () => {
  cntr.logger.info("Successfully logged in and ready to operate!");
  (async function changeStatus() {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    await client.user?.setActivity({
      ...status,
      name: status.name + " | " + client.guilds.cache.size + " servers",
    });
    setTimeout(changeStatus, 15 * 60 * 1000);
  })();
  client.stores.get("commands").forEach((v) => v.reload());
});

cron.schedule("*/8 * * * *", async () => {
  (await cntr.prisma.tapkiUser.findMany()).forEach(async (user) => {
    if (user.tapki < 10) await cntr.tapkiManager.incrTapki(user.id, 1);
    await cntr.tapkiManager.setHealth(
      user.id,
      user.hp >= 1000
        ? 1000
        : user.hp + Math.min(1000 - user.hp, Math.round(Math.random() * 35))
    );
  });
});

const shouldBeUwU = async (i: CommandInteraction) => {
  const config = await cntr.configManager.getUserConfig(i.user.id, i.guildId);
  // cntr.logger.debug(config);
  return config["core.uwu"];
};

const uwu = (text: string) =>
  ((owoify as any).default as typeof owoify)(emojify(text)) +
  (Math.random() < 0.1 ? " :3" : "");

function owoifyMessage(m: InteractionReplyOptions) {
  if (typeof m === "string") return uwu(m);
  m.content = m.content ? uwu(m.content) : m.content;
  for (const embedI of Object.keys(m.embeds || [])) {
    const em = m.embeds![Number(embedI)]!;
    m.embeds![Number(embedI)]!.description = em.description
      ? uwu(em.description)
      : em.description;
    m.embeds![Number(embedI)]!.title = em.title ? uwu(em.title) : em.title;
    m.embeds![Number(embedI)]!.fields = em.fields
      ? em.fields.map((f) => ({
          name: uwu(f.name),
          value: uwu(f.value),
          inline: f.inline,
        }))
      : em.fields;
    if (em.footer?.text) em.footer!.text = uwu(em.footer!.text);
  }
  return m;
}

const oldInteractionFunc = {
  reply: CommandInteraction.prototype.reply,
  followUp: CommandInteraction.prototype.followUp,
  editReply: CommandInteraction.prototype.editReply,
};

CommandInteraction.prototype.reply = async function reply(
  m: InteractionReplyOptions
): Promise<any> {
  return oldInteractionFunc.reply.call(
    this,
    (await shouldBeUwU(this)) ? owoifyMessage(m) : m
  );
};

CommandInteraction.prototype.editReply = async function reply(
  m: InteractionReplyOptions
): Promise<any> {
  return await oldInteractionFunc.editReply.call(
    this,
    (await shouldBeUwU(this)) ? owoifyMessage(m) : m
  );
};

CommandInteraction.prototype.followUp = async function reply(
  m: InteractionReplyOptions
): Promise<any> {
  return await oldInteractionFunc.followUp.call(
    this,
    (await shouldBeUwU(this)) ? owoifyMessage(m) : m
  );
};

registerEventForHandlers("memberLeft");
registerEventForHandlers("userBanned");
registerEventForHandlers("userKicked");
registerEventForHandlers("memberJoined");
registerEventForHandlers("userTimedOut");
registerEventForHandlers("warningsReset");
registerEventForHandlers("messageCreate");
registerEventForHandlers("messageDelete");
registerEventForHandlers("messageUpdate");
registerEventForHandlers("warningCreated");
registerEventForHandlers("warningRemoved");
registerEventForHandlers("punishmentFailed");
registerEventForHandlers("antiFloodTriggered");
registerEventForHandlers("wordFilterTriggered");
registerEventForHandlers("linkProtectionTriggered");

client.on("guildCreate", async (guild) => {
  if (!guild.features.includes("COMMUNITY")) {
    (await guild.fetchOwner()).send({
      embeds: [
        new MessageEmbed()
          .setColor(WARNING)
          .setTitle(
            `⚠️  Community features aren't enabled in **${guild.name}**`
          )
          .setDescription(
            "Operator heavily relies on Discord's community-only features (like timeouts). " +
              "While it can work in non-community servers, some features will be disabled. " +
              "I recommend you to toggle the community status for this server. " +
              "It's truly essential for community servers, and I believe you " +
              "only need Operator for community servers."
          ),
      ],
    });
  }
});

client.on("guildMemberAdd", (member) => {
  cntr.events.emit("memberJoined", {
    guild: member.guild,
    member,
  });
});

client.on("guildMemberRemove", (member) => {
  if (member.partial) {
    cntr.logger.warn("Member that left was not in cache. Not emitting event.");
    return;
  }
  cntr.events.emit("memberLeft", {
    guild: member.guild,
    member,
  });
});

client.on("messageDelete", async (m) => {
  if (!m.guild || !m.guildId) return;
  const message = m.partial ? (await tryToCatch(m.fetch.bind(m)))[1] ?? m : m;
  if (message.partial || !message.author) {
    container.logger.warn(
      `Message ${m.id} has been deleted before the bot cached it.`
    );
    return;
  }
  container.events.emit("messageDelete", {
    guild: m.guild,
    message: message as GuildMessage,
  });
});

client.on("messageUpdate", async (oldm, m) => {
  const message = (await m.fetch(false)) as GuildMessage;
  const oldMessage = (await oldm.fetch(false)) as GuildMessage;
  if (message.author.bot ?? message.author.id === client.user!.id) return;
  if (!message.inGuild()) return;
  if (
    message.partial ||
    oldMessage.partial ||
    !message.author ||
    !oldMessage.author
  ) {
    container.logger.error("Something weird happened!");
    return;
  }
  cntr.events.emit("messageUpdate", {
    message,
    oldMessage,
    guild: message.guild,
  });
  const config = await cntr.configManager.getConfig(message.guildId);
  const enabledPlugins = plugins.filter(
    (p) =>
      config[`${p.name}.enabled`] === true &&
      !(config[`${p.name}.exclude`] as string[]).some(
        (el) =>
          ({
            "@": message.author.id !== el.slice(1),
            "&": !message.member?.roles.cache.has(el.slice(1)),
            "#": message.channel.id !== el.slice(1),
          }[el[0] as "@" | "&" | "#"])
      )
  );
  const extendedMessage = message as ExtendedMessage;
  const ocrRequired = enabledPlugins.some((p) =>
    p.FEATURES_USED?.includes(Features.OCR)
  );
  extendedMessage.ocrResult = ocrRequired
    ? (
        await Promise.all(
          message.attachments
            .filter((a) => !!a.contentType?.startsWith("image/"))
            .map((a) =>
              phin<{
                error: null | string;
                errorCode: null | string;
                result: null | string;
              }>({
                url: `http://ocr:3001/ocr?url=${encodeURIComponent(
                  a.proxyURL
                )}`,
                parse: "json",
              })
            )
        )
      )
        .map((r) => r.body.result)
        .join("\n")
    : "";

  const oldExtendedMessage = message as ExtendedMessage;
  oldExtendedMessage.ocrResult =
    ocrRequired &&
    !_.isEqual(
      oldMessage.attachments.map((a) => a.proxyURL),
      message.attachments.map((a) => a.proxyURL)
    )
      ? (
          await Promise.all(
            message.attachments
              .filter((a) => !!a.contentType?.startsWith("image/"))
              .map((a) =>
                phin<{
                  error: null | string;
                  errorCode: null | string;
                  result: null | string;
                }>({
                  url: `http://ocr:3001/ocr?url=${encodeURIComponent(
                    a.proxyURL
                  )}`,
                  parse: "json",
                })
              )
          )
        )
          .map((r) => r.body.result)
          .join("\n")
      : extendedMessage.ocrResult;
  await Promise.all(
    plugins.map((p) => {
      try {
        if (p.messageUpdate)
          return p.messageUpdate(oldExtendedMessage, extendedMessage);
        return () => {};
      } catch (e) {
        cntr.captureException(e);
        throw e;
      }
    })
  );
});

client.on("messageCreate", async (message) => {
  if (message.author.bot ?? message.author.id === client.user!.id) return;
  if (!message.inGuild()) return;
  cntr.events.emit("messageCreate", {
    guild: message.guild,
    message: message as GuildMessage,
  });
  const config = await cntr.configManager.getConfig(message.guildId);
  const enabledPlugins = plugins.filter(
    (p) => config[`${p.name}.enabled`] === true
  );
  const extendedMessage = message as ExtendedMessage;
  extendedMessage.ocrResult = enabledPlugins.some((p) =>
    p.FEATURES_USED?.includes(Features.OCR)
  )
    ? (
        await Promise.all(
          message.attachments
            .filter((a) => !!a.contentType?.startsWith("image/"))
            .map((a) =>
              phin<{
                error: null | string;
                errorCode: null | string;
                result: null | string;
              }>({
                url: `http://ocr:3001/ocr?url=${encodeURIComponent(
                  a.proxyURL
                )}`,
                parse: "json",
              })
            )
        )
      )
        .map((r) => r.body.result)
        .join("\n")
    : "";
  await Promise.all(
    plugins.map((p) => {
      try {
        if (p.messageCreate) return p.messageCreate(extendedMessage);
        if (p.run) return p.run(extendedMessage);
        throw new TypeError("Plugin doesn't have messageCreate or run method");
      } catch (e) {
        cntr.captureException(e);
        throw e;
      }
    })
  );
  if (
    message.content.startsWith(client.user!.toString()) ||
    message.content.startsWith(`<@!${client.user!.id}>`)
  ) {
    const text = Util.escapeMarkdown(
      Util.cleanContent(
        message.content
          .slice(client.user!.toString().length)
          .replace(/^>/m, ""),
        message.channel
      )
    ).trim();
    if (
      !text ||
      (await cntr.configManager.getConfig(message.guildId ?? ""))[
        "core.enableAI"
      ] === false ||
      (await cntr.configManager.getConfig(message.author.id, "member"))[
        "core.enableAI"
      ] === false
    )
      return;
    const response = await phin<WitResponse>({
      url: `https://api.wit.ai/message?v=${s.string.parse(
        process.env.WIT_VERSION
      )}&q=${encodeURIComponent(text)}`,
      headers: {
        Authorization: `Bearer ${process.env.WIT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      parse: "json",
    });
    const recognizedIntent =
      intents[
        response.body.intents.sort((a, b) => a.confidence - b.confidence)[0]
          ?.name as keyof typeof intents
      ];
    if (recognizedIntent)
      runIntent(message, recognizedIntent, client, response.body);
  }
});

client.on("interactionCreate", (interaction) => {
  if (interaction.isModalSubmit())
    cntr.internalEmitter.emit("modal", interaction);
  if (interaction.isAutocomplete()) {
    switch (interaction.commandName) {
      case "config": {
        interaction.respond(
          interaction.options.getString("key", true)
            ? new Fuse<{ name: string; value: string }>(
                cntr.commandData.config.options,
                { keys: ["name"] }
              )
                .search(interaction.options.getString("key", true))
                .map((m) => m.item)
                .slice(0, 25)
            : (
                cntr.commandData.config.options as {
                  name: string;
                  value: string;
                }[]
              )
                .sort((a, b) => a.name.localeCompare(b.name))
                .slice(0, 25)
        );
        break;
      }

      default:
        cntr.logger.warn(
          "Unhandled autocomplete for command",
          interaction.commandName
        );
    }
  }
});

async function main() {
  (
    await Promise.all(
      (
        await readdir(path.join("dist", "plugins"))
      ).map(
        (pluginName) =>
          import(`${path.resolve(path.join("dist", "plugins", pluginName))}`)
      )
    )
  ).forEach((plugin) => {
    const P = plugin.default;
    if (P.PLUGIN_NAME === "core")
      throw new TypeError("Plugin name must not be 'core'!");
    if (P.CONFIG_SCHEMA && P.DEFAULT_CONFIG)
      s.object(P.CONFIG_SCHEMA).parse(P.DEFAULT_CONFIG);
    plugins.push(new P(cntr.prisma));
  });
  await client.login(process.env.TOKEN);
}

main();
