import _ from "lodash";
import { VM } from "vm2";
import { container as cntr } from "@sapphire/framework";
import { Guild, GuildMember, Message, User } from "discord.js";
import rfs from "rotating-file-stream";
import type { AnyContext, GuildMessage, Events } from "../types.js";
import {
  safePhin,
  sanitizeGuild,
  sanitizeGuildMember,
  sanitizeMessage,
  sanitizeTextChannel,
  sanitizeUser,
  sanitizeVoiceChannel,
} from "./sanitizers.js";

function logMessage(
  message: string,
  guildId: string,
  type: "log" | "fatal" | "error" | "warn" | "debug" | "info" = "log"
) {
  if (typeof message !== "string") return;
  const existingStream = cntr.rotatingStreamMap.get(guildId);
  const stream =
    existingStream ||
    rfs.createStream(`./logs/${guildId}.txt`, {
      size: "256K",
      maxSize: "4096K",
      compress: "gzip",
    });
  if (!existingStream) cntr.rotatingStreamMap.set(guildId, stream);
  stream.write(
    JSON.stringify({
      type,
      message,
    }) + "\n"
  );
}

export function runHandler(code: string, ctx: AnyContext) {
  const filteredContext: any = _.mapValues(ctx, (value: any) => {
    if (value instanceof Message) return sanitizeMessage(value as GuildMessage);
    if (value instanceof Guild) return sanitizeGuild(value);
    if (value instanceof User) return sanitizeUser(value);
    if (value instanceof GuildMember) return sanitizeGuildMember(value);
    return JSON.parse(JSON.stringify(value));
  });

  filteredContext.msg = filteredContext.message;
  filteredContext.m = filteredContext.message;

  let vm = new VM({
    wasm: false,
    eval: false,
    timeout: 10000,
    sandbox: {
      Buffer: undefined,
      setTimeout: undefined,
      setInterval: undefined,
      setImmediate: undefined,
    },
  });

  vm.run(`
  const __loopTimeMap = new Map();
  function __checkLoop(id) {
    if (__loopTimeMap.has(id)) {
      if (Date.now() - __loopTimeMap.get(id) > 1000) {
        __loopTimeMap.delete(id);
        throw new Error("Infinite loop detected!")
      }
    } else {
      __loopTimeMap.set(id, Date.now());
    }
  }`);

  vm.freeze(safePhin, "phin");
  vm.freeze(safePhin, "p");
  vm.freeze(filteredContext, "ctx");
  vm.freeze(_, "_");
  vm.freeze(
    {
      log: (m: string) => logMessage(m, ctx.guild.id, "log"),
      debug: (m: string) => logMessage(m, ctx.guild.id, "debug"),
      error: (m: string) => logMessage(m, ctx.guild.id, "error"),
      warn: (m: string) => logMessage(m, ctx.guild.id, "warn"),
      info: (m: string) => logMessage(m, ctx.guild.id, "info"),
    },
    "console"
  );
  vm.freeze(async (id: string) => {
    const channel = await cntr.client.channels.fetch(id);
    if (!channel) throw new Error("Channel doesn't exist!");
    if (channel.type === "GUILD_TEXT") return sanitizeTextChannel(channel);
    if (channel.type === "GUILD_VOICE") return sanitizeVoiceChannel(channel);
    throw new Error("This channel type is not supported yet, sorry");
  }, "fetchChannel");

  try {
    vm.run(`(async () => {\n${code}\n})()`);
  } catch (e: any) {
    if ("message" in e) logMessage(e.message, ctx.guild.id, "fatal");
  }
  // TODO: Implement guild logging

  vm = null as any; // GC
}

export async function handleGuildEvent(
  event: keyof Events,
  guildId: string,
  ctx: AnyContext
) {
  const handlers = await cntr.prisma.handler.findMany({
    where: {
      guildId,
      event,
    },
  });
  handlers.forEach((h) => setImmediate(() => runHandler(h.action, ctx)));
}

export function registerEventForHandlers(event: keyof Events) {
  cntr.events.on(event, (ctx: any) => {
    handleGuildEvent(event, ctx.guild.id, ctx);
  });
}
