/* eslint-disable @typescript-eslint/lines-between-class-members */

import { MappedObjectValidator } from "@sapphire/shapeshift";

export default class OperatorPlugin {
  public static readonly PLUGIN_NAME: string;
  public readonly FEATURES_USED: string[] = [];
  public static readonly DEFAULT_CONFIG = {};
  public static readonly CONFIG_SCHEMA: MappedObjectValidator<any> = {};
}
