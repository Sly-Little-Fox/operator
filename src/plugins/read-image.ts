import { Util } from "discord.js";
import OperatorPlugin from "../classes/OperatorPlugin.js";
import { ExtendedMessage, Features } from "../types.js";

export default class ImageScanningPlugin extends OperatorPlugin {
  public static readonly PLUGIN_NAME = "ocr-test";

  public readonly FEATURES_USED = [Features.OCR];

  async messageCreate(message: ExtendedMessage): Promise<void> {
    if (!message.ocrResult.trim()) return;
    message.reply(
      `This image has the following text:\n${Util.escapeMarkdown(
        message.ocrResult.trim()
      )}`
    );
  }
}
