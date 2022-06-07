import Fuse from "fuse.js";
import { BaseValidator, s } from "@sapphire/shapeshift";
import type { Prisma, PrismaClient } from "@prisma/client";
import _ from "lodash";
import { getConfiguration } from "../utilities/configUtilities.js";
import { roughSizeOfObject } from "../utilities/utilities.js";

export class ConfigManager {
  private prisma: PrismaClient;

  public rawSchema: Record<string, BaseValidator<any>> = {};

  public schema = s.object({});

  public index: Fuse<any> = new Fuse([]);

  public defaultValues: Record<string, any> = {};

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.prepare();
  }

  private async prepare() {
    if (!_.isEqual(this.rawSchema, {})) return;
    const { rawSchema, defaultValues } = await getConfiguration();
    this.rawSchema = rawSchema;
    this.defaultValues = defaultValues;
    this.schema = s.object(this.rawSchema);
    this.index = new Fuse(
      Object.keys(this.rawSchema).map((k) => ({
        id: k,
        value: this.rawSchema[k],
      })),
      {
        threshold: 0.75,
        keys: ["id"],
      }
    );
  }

  public async touch(objectId: string, dbTarget = "server"): Promise<void> {
    await ((this.prisma as any)[dbTarget] as Prisma.ServerDelegate<any>).upsert(
      {
        where: { id: objectId },
        create: {
          id: objectId,
        },
        update: {},
      }
    );
    this.prepare();
  }

  public async getConfig(
    objectId: string,
    dbTarget = "server"
  ): Promise<Record<string, string | number | boolean | any[]>> {
    await this.prepare();
    return {
      ...this.defaultValues,
      ...(((
        await (
          (this.prisma as any)[dbTarget] as Prisma.ServerDelegate<any>
        ).findUnique({
          where: { id: objectId },
        })
      )?.config as Record<any, any>) ?? {}),
    };
  }

  public async getUserConfig(
    userId: string,
    guildId: string | null
  ): Promise<Record<string, string | number | boolean | any[]>> {
    return {
      ...this.defaultValues,
      ...(guildId ? await this.getConfig(guildId) : {}),
      ...(await this.getConfig(userId, "member")),
    };
  }

  public async setOptions(
    objectId: string,
    data: Record<string, string | number | boolean | string[]>,
    dbTarget = "server"
  ): Promise<void> {
    await this.prepare();
    if (roughSizeOfObject(data) > 512 * 1024 * 1024)
      throw new Error("What the hell is this payload?");
    const oldConfig = await this.getConfig(objectId, dbTarget);
    const parsed = this.schema.parse({
      ...this.defaultValues,
      ...oldConfig,
      ...data,
    });

    await ((this.prisma as any)[dbTarget] as Prisma.ServerDelegate<any>).upsert(
      {
        where: { id: objectId },
        create: {
          id: objectId,
          config: {},
        },
        update: {
          config: parsed as Prisma.InputJsonObject,
        },
      }
    );
  }
}
