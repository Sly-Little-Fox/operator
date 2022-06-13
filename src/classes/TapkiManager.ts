import type { PrismaClient } from "@prisma/client";
import { s } from "@sapphire/shapeshift";

export class TapkiManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public async touch(userId: string): Promise<void> {
    await this.prisma.tapkiUser.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });
  }

  public getUser(userId: string) {
    return this.prisma.tapkiUser.findUnique({
      where: { id: userId },
    });
  }

  public deleteUser(userId: string) {
    return this.prisma.tapkiUser.deleteMany({
      where: { id: userId },
    });
  }

  public setHealth(userId: string, health: number) {
    s.number.lessThanOrEqual(1000).parse(health);
    return this.prisma.tapkiUser.update({
      where: { id: userId },
      data: { hp: health },
    });
  }

  public setTapki(userId: string, tapki: number) {
    return this.prisma.tapkiUser.update({
      where: { id: userId },
      data: { tapki },
    });
  }

  public incrTapki(userId: string, incrementBy = 1) {
    return this.prisma.tapkiUser.update({
      where: { id: userId },
      data: {
        tapki: {
          increment: incrementBy,
        },
      },
    });
  }

  public decrTapki(userId: string, decrementBy = 1) {
    return this.prisma.tapkiUser.update({
      where: { id: userId },
      data: {
        tapki: {
          decrement: decrementBy,
        },
      },
    });
  }

  public toHospital(userId: string) {
    return this.prisma.tapkiUser.update({
      where: { id: userId },
      data: { inHospitalFrom: Date.now() },
    });
  }
}
