import { MappedObjectValidator, s } from "@sapphire/shapeshift";

export default class FakePlugin {
  public static readonly DEFAULT_CONFIG = {
    enableAI: true,
  };

  public static readonly CONFIG_SCHEMA: MappedObjectValidator<any> = {
    enableAI: s.boolean,
  };
}
