import { MappedObjectValidator, s } from "@sapphire/shapeshift";

export default class Core {
  public static readonly DEFAULT_CONFIG = {
    enableAI: true,
    footers: true,
    uwu: false,
    showModerator: false,
    "warnings.sendDm": true,
  };

  public static readonly CONFIG_SCHEMA: MappedObjectValidator<any> = {
    enableAI: s.boolean,
    footers: s.boolean,
    uwu: s.boolean,
    showModerator: s.boolean,
    "warnings.sendDm": s.boolean,
  };
}
