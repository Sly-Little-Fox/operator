import {
  SlashCommandBuilder,
  SlashCommandStringOption,
} from "@discordjs/builders";
import {
  ApplicationCommandRegistry,
  Command,
  PieceContext,
  RegisterBehavior,
} from "@sapphire/framework";
import type { CommandInteraction } from "discord.js";
import si from "systeminformation";
import _ from "lodash";
import { INFO } from "../../config/colors.js";
import { untilLength } from "../../utilities/utilities.js";

let sysInfo: {
  cpu: si.Systeminformation.CpuData;
  memory: si.Systeminformation.MemData;
  currentLoad: si.Systeminformation.CurrentLoadData;
  diskLayout: si.Systeminformation.DiskLayoutData[];
  system: si.Systeminformation.SystemData;
  bios: si.Systeminformation.BiosData;
  chassis: si.Systeminformation.ChassisData;
  defNetIface: si.Systeminformation.NetworkInterfacesData;
  blockDevices: si.Systeminformation.BlockDevicesData[];
};

export class InfoCommand extends Command {
  public constructor(context: PieceContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "info",
      aliases: ["bot-info", "information", "system-information", "sys-info"],
      description: "Used to view Operator's system information",
      generateDashLessAliases: true,
    });
  }

  public async chatInputRun(interaction: CommandInteraction): Promise<void> {
    const tab = interaction.options.get("tab")?.value as string | undefined;
    const defaultNetworkInterfaceName = await si.networkInterfaceDefault();
    sysInfo ||= {
      cpu: await si.cpu(),
      memory: await si.mem(),
      currentLoad: await si.currentLoad(),
      diskLayout: await si.diskLayout(),
      blockDevices: await si.blockDevices(),
      system: await si.system(),
      bios: await si.bios(),
      chassis: await si.chassis(),
      defNetIface: (await si.networkInterfaces()).find(
        (i) => i.iface === defaultNetworkInterfaceName
      )!,
    };

    const fsInfo =
      (await si.fsSize()).find((fs) => fs.mount === "/") ||
      (await si.fsSize()).find((fs) => fs.mount === process.cwd())!;

    switch (tab) {
      case "cpu": {
        await interaction.reply({
          embeds: [
            {
              title: "\\ℹ️ Extended CPU information",
              color: INFO,
              fields: [
                {
                  name: "Processor flags",
                  value: untilLength(sysInfo.cpu.flags.split(" "), 175, " "),
                },
                {
                  name: "Cache size",
                  value:
                    `L1D: ${(sysInfo.cpu.cache.l1d / 1024 / 1024).toFixed(
                      2
                    )} MB, L1I: ${(sysInfo.cpu.cache.l1d / 1024 / 1024).toFixed(
                      2
                    )} MB, ` +
                    `L2: ${(sysInfo.cpu.cache.l2 / 1024 / 1024).toFixed(
                      2
                    )} MB, L3: ${(sysInfo.cpu.cache.l3 / 1024 / 1024).toFixed(
                      2
                    )} MB`,
                },
                {
                  name: "Governor",
                  value: _.capitalize(sysInfo.cpu.governor),
                  inline: true,
                },
                {
                  name: "Architecture",
                  value:
                    {
                      x32: "Regular x86 (32-bit)",
                      x64: "x86_64 (amd64)",
                      arm: "ARM (32-bit)",
                      arm64: "ARM (64-bit)",
                    }[process.arch] ?? process.arch,
                  inline: true,
                },
                {
                  name: "Speed",
                  value: `${(await si.cpuCurrentSpeed()).avg} GHz, max ${
                    sysInfo.cpu.speedMax
                  } GHz`,
                  inline: true,
                },
                ...(sysInfo.cpu.performanceCores
                  ? [
                      {
                        name: "ARM specific cores",
                        value:
                          `${sysInfo.cpu.performanceCores} performance cores, ` +
                          `${sysInfo.cpu.efficiencyCores} efficiency cores`,
                      },
                    ]
                  : []),
              ],
            },
          ],
        });
        break;
      }
      case "host": {
        await interaction.reply({
          embeds: [
            {
              title: "\\ℹ️ Extended host information",
              color: INFO,
              fields: [
                {
                  name: "Type",
                  value: sysInfo.system.virtual
                    ? "Virtual machine"
                    : `Physical machine (${sysInfo.system.model})`,
                  inline: true,
                },
                {
                  name: "Default network interface",
                  value:
                    `Name: ${sysInfo.defNetIface.ifaceName}, ` +
                    `speed: ${sysInfo.defNetIface.speed} Mbit/s`,
                },
                {
                  name: "BIOS vendor",
                  value: sysInfo.bios.vendor,
                  inline: true,
                },
                {
                  name: "Chassis type",
                  value: sysInfo.chassis.type,
                  inline: true,
                },
              ],
            },
          ],
        });
        break;
      }
      case "disk": {
        const currentDisk = sysInfo.diskLayout.find(
          (d) => d.device === fsInfo.fs.replace(/p?[0-9]$/m, "")
        )!;
        await interaction.reply({
          embeds: [
            {
              title: "\\ℹ️ Extended disk information",
              color: INFO,
              fields: [
                {
                  name: "Disk with root partition",
                  value:
                    `Vendor: ${currentDisk.vendor ?? "unknown"}, type: ${
                      currentDisk.type
                    }, ` +
                    `interface type: ${currentDisk.interfaceType}, size: ${(
                      currentDisk.size /
                      1024 /
                      1024 /
                      1024
                    ).toFixed(1)} GB`,
                },
                {
                  name: "Total block devices",
                  value: `${
                    sysInfo.blockDevices.filter((d) => d.type === "disk").length
                  } disks, ${
                    sysInfo.blockDevices.filter((d) =>
                      d.type.startsWith("raid")
                    ).length
                  } RAIDs, ${
                    sysInfo.blockDevices.filter((d) => d.type === "part").length
                  } partitions (${sysInfo.blockDevices.length} total)`,
                },
              ],
            },
          ],
        });
        break;
      }
      default: {
        await interaction.reply({
          embeds: [
            {
              title: "\\ℹ️ System information",
              color: INFO,
              fields: [
                {
                  name: "CPU model",
                  value:
                    `${sysInfo.cpu.manufacturer} ${sysInfo.cpu.brand}`.replace(
                      /®|™/g,
                      ""
                    ),
                },
                {
                  name: "Filesystem info (/)",
                  value: `${(fsInfo?.used / 1024 / 1024 / 1024).toFixed(
                    1
                  )} GB/${(fsInfo?.size / 1024 / 1024 / 1024).toFixed(
                    1
                  )} GB used (\`${fsInfo.fs}\`, ${fsInfo.type})`,
                },
                {
                  name: "CPU load",
                  value: `${sysInfo.currentLoad.currentLoad.toFixed(1)}% (${
                    sysInfo.cpu.cores
                  } ${
                    sysInfo.cpu.cores !== sysInfo.cpu.physicalCores
                      ? `threads, ${sysInfo.cpu.physicalCores} cores`
                      : "cores"
                  })`,
                  inline: true,
                },
                {
                  name: "Memory usage",
                  value: `${(
                    (await si.mem())?.used /
                    1024 /
                    1024 /
                    1024
                  ).toFixed(1)} GB/${(
                    sysInfo.memory.total /
                    1024 /
                    1024 /
                    1024
                  ).toFixed(1)} GB used`,
                  inline: true,
                },
              ],
            },
          ],
        });
      }
    }
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): void {
    registry.registerChatInputCommand(
      new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
          new SlashCommandStringOption()
            .setName("tab")
            .setDescription("Tabs with extended info for power users (😎)")
            .setChoices(
              ...[
                ["CPU", "cpu"],
                ["Host", "host"],
                ["Disk", "disk"],
              ].map((e) => ({ name: e[0], value: e[1] }))
            )
        ),
      {
        guildIds:
          process.env.NODE_ENV === "development"
            ? process.env.GUILD_IDS!.split(",")
            : [],
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
      }
    );
  }
}
