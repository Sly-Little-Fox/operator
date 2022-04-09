import "dotenv/config";
// import "@sapphire/plugin-hmr/register";
// import "@sapphire/plugin-logger/register";
import { SapphireClient } from "@sapphire/framework";
// import { fetch, FetchResultTypes } from "@sapphire/fetch";
import consola from "consola";
// import { createClient } from "redis";
import { MessageEmbed } from "discord.js";
// import { readdir } from "fs/promises";
// import path from "path";
// import * as Sentry from "@sentry/node";
// import { s } from "@sapphire/shapeshift";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";
// import type { WitResponse, Plugin, ExtendedMessage } from "./types";
// import * as intents from "./chat/intents.js";
// import runIntent from "./chat/runIntent.js";
// import { SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE } from "./config/main.js";
// import { OperatorClient } from "./classes/OperatorClient.js";
import { WARNING } from "./config/hexColors.js";

process.chdir(dirname(fileURLToPath(import.meta.url)));

console.log("?");

// Patch __filename
// eslint-disable-next-line
// const __filename = new URL("", import.meta.url).pathname;
// eslint-disable-next-line
// const __dirname = path.dirname(__filename);

// process.chdir(path.join(__dirname, ".."));

consola.wrapAll();

// const redis = createClient();

const client = new SapphireClient({
  intents: ["GUILDS", "GUILD_MESSAGES"],
  defaultPrefix: "op!",
});

// const plugins: Plugin[] = [];

client.on("ready", async () => {
  consola.success("Successfully logged in and ready to operate!");
  // (await client.application?.fetch())?.commands.set([]);-
  // consola.debug(ApplicationCommandRegistries.registries);
});

client.on("guildCreate", async (guild) => {
  if (!guild.features.includes("COMMUNITY")) {
    (await guild.fetchOwner()).send({
      embeds: [
        new MessageEmbed()
          .setColor(WARNING)
          .setTitle(`⚠️ Community features aren't enabled in **${guild.name}**`)
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

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  // if (message.inGuild()) {
  //   const extendedMessage = message as ExtendedMessage;
  //   extendedMessage.ocrResult =
  //     (
  //       await Promise.all(
  //         message.attachments
  //           .filter((a) => !!a.contentType?.startsWith("image/"))
  //           .map((a) =>
  //             fetch<{
  //               error: null | string;
  //               errorCode: null | string;
  //               result: null | string;
  //             }>(
  //               `http://ocr:3001/ocr?url=${encodeURIComponent(a.proxyURL)}`,
  //               {
  //                 method: "GET",
  //               },
  //               FetchResultTypes.JSON
  //             )
  //           )
  //       )
  //     )
  //       .map((r) => r.result)
  //       .join("\n");
    // Promise.all(
    //   plugins.map((p) => {
    //     try {
    //       return p.run(extendedMessage);
    //     } catch (e) {
    //       Sentry.captureException(e);
    //       throw e;
    //     }
    //   })
    // );
  // }
  // if (
  //   message.content.startsWith(client.user!.toString()) ||
  //   message.content.startsWith(`<@!${client.user!.id}>`)
  // ) {
  //   const text = Util.cleanContent(
  //     message.content.slice(client.user!.toString().length),
  //     message.channel
  //   ).trim();

  //   const response = await fetch<WitResponse>(
  //     `https://api.wit.ai/message?v=${s.string.parse(
  //       process.env.WIT_VERSION
  //     )}&q=${encodeURIComponent(text)}`,
  //     {
  //       headers: {
  //         Authorization: `Bearer ${process.env.WIT_API_TOKEN}`,
  //         "Content-Type": "application/json",
  //       },
  //     },
  //     FetchResultTypes.JSON
  //   );
  //   const recognizedIntent =
  //     intents[
  //       response.intents.sort((a, b) => a.confidence - b.confidence)[0]
  //         ?.name as keyof typeof intents
  //     ];

  //   if (recognizedIntent)
  //     runIntent(message, recognizedIntent, client, response);
  // }
});

async function main() {
  console.log("why");
  // (
  //   await Promise.all(
  //     (
  //       await readdir(path.join("dist", "plugins"))
  //     ).map(
  //       (pluginName) =>
  //         import(`${path.resolve(path.join("dist", "plugins", pluginName))}`)
  //     )
  //   )
  // ).forEach((plugin) => {
  //   console.log("Pushed plugin", plugin.default.PLUGIN_NAME);
  //   const P = plugin.default;
  //   if (P.PLUGIN_NAME === "core")
  //     throw new TypeError("Plugin name must not be 'core'!");
  //   if (P.CONFIG_SCHEMA && P.DEFAULT_CONFIG)
  //     s.object(P.CONFIG_SCHEMA).parse(P.DEFAULT_CONFIG);
  //   plugins.push(new P(container.prisma));
  // });
  console.log(process.env);
  await client.login(process.env.TOKEN);
  console.log(Array.from(client.stores.get("commands").keys()));
  console.log(execSync("ls commands").toString());
}

main();
