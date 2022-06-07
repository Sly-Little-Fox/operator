/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import type { Prisma, PrismaClient, Server } from "@prisma/client";
import { container } from "@sapphire/framework";
import { ObjectValidator } from "@sapphire/shapeshift";
import { ModalSubmitInteraction } from "discord.js";
import { inspect } from "util";

export function roughSizeOfObject(object: Record<string, any>): number {
  const objectList = [];
  const stack = [object];
  let bytes = 0;

  while (stack.length) {
    const value = stack.pop() as any;
    switch (typeof value) {
      case "boolean": {
        bytes += 4;
        break;
      }
      case "string": {
        bytes += value.length * 2;
        break;
      }
      case "number": {
        bytes += 8;
        break;
      }
      case "object": {
        if (objectList.indexOf(value) === -1) {
          objectList.push(value);
          // eslint-disable-next-line no-restricted-syntax, guard-for-in
          for (const i in value) {
            stack.push(value[i]);
          }
        }
        break;
      }
      default: // nothing
    }
  }

  return bytes;
}

async function initServer(
  id: string,
  prisma: PrismaClient
): Promise<Prisma.Prisma__ServerClient<Server>> {
  const result = await prisma.server.upsert({
    update: {},
    create: { id },
    where: { id },
  });
  return result;
}

export function flattenObject(object: Record<string, unknown>) {
  const newObject = object;
  Object.keys(object).forEach((key) => {
    const value = object[key];
    if (typeof value === "object" && !Array.isArray(value) && value) {
      Object.keys(value).forEach((k) => {
        newObject[`${key}.${k}`] = (value as Record<string, unknown>)[k];
      });
    } else if (
      (value as ObjectValidator<any>)?.constructor.name === "ObjectValidator"
    ) {
      Object.keys((value as ObjectValidator<any>).shape).forEach((k) => {
        newObject[`${key}.${k}`] = (value as ObjectValidator<any>).shape[k];
      });
    }
  });
  return newObject;
}

export function getWarningType(weight: number): string {
  if (weight >= 1.9) return "<:the_end:944241329272143913>";
  if (weight >= 0.9) return "<:strict:944241329192435742>";
  return "<:nonstrict:944241329200828516>";
}

export async function getConfig(
  guildId: string,
  prisma: PrismaClient
): Promise<Prisma.Prisma__ServerClient<Server>> {
  const config =
    (await prisma.server.findUnique({ where: { id: guildId } })) ||
    (await initServer(guildId, prisma));
  return config;
}

export async function updateConfig(
  guildId: string,
  data: Record<string, unknown>,
  prisma: PrismaClient
): Promise<Prisma.Prisma__ServerClient<Server>> {
  const config = await prisma.server.upsert({
    create: { id: guildId, ...data },
    update: { ...data },
    where: { id: guildId },
  });
  return config;
}

export function mergeObjectWithoutOverwriting(
  mainObject: Record<string, any>,
  objectToMerge: Record<string, any>
): any {
  Object.keys(objectToMerge).forEach((key) => {
    // eslint-disable-next-line no-param-reassign
    if (!mainObject[key]) mainObject[key] = objectToMerge[key];
  });
  return mainObject;
}

export const resolve = (pathToResolve: string, meta = import.meta): string =>
  decodeURIComponent(new URL(`./${pathToResolve}`, meta.url).pathname);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function safelySerialize(obj: any): string {
  return ["string", "number", "boolean", "bigint"].includes(typeof obj)
    ? String(obj)
    : inspect(obj);
}

export function capitalz(str: string): string {
  return str[0].toUpperCase() + str.slice(1);
}

export function untilLength(
  arr: readonly string[],
  maxLength = 17,
  separator = ", "
): string {
  const returnArr: string[] = [];
  for (let i = 0; returnArr.join(separator).length <= maxLength; i += 1) {
    if (!arr[i]) break;
    returnArr.push(arr[i]);
  }
  if (returnArr.join(separator).length < arr.join(separator).length)
    return `${returnArr.join(separator)}, ...`;
  return returnArr.join(separator);
}

export const noReturn =
  (func: (...args: any[]) => any, thisArg: any = undefined) =>
  (...args: any[]) => {
    func.apply(thisArg, args);
  };

export function awaitModalSubmit(options: {
  filter: (i: ModalSubmitInteraction) => boolean;
  time: number;
}) {
  return new Promise<ModalSubmitInteraction>((resolv, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timed out")),
      options.time
    );
    container.internalEmitter.addListener(
      "modal",
      async function listener(i: ModalSubmitInteraction) {
        if (options.filter(i)) {
          resolv(i);
          clearTimeout(timeout);
          container.internalEmitter.removeListener("modal", listener);
        }
      }
    );
  });
}
