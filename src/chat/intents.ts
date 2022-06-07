import { container } from "@sapphire/framework";
import { s } from "@sapphire/shapeshift";
import type { WitResponse } from "../types.js";

export const sus = "https://www.youtube.com/watch?v=0XjaiKOaWoo";
export const rickroll = "https://www.youtube.com/watch?v=j5a0jTc9S10";
export const author =
  "I was made with :pizza: by Sly-Little-Fox (https://github.com/Sly-Little-Fox)";
export const help = "command:help";
export const cutelittlepuppies = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
// eslint-disable-next-line @typescript-eslint/naming-convention
export const set_config = (witResponse: WitResponse): void => {
  const parsedResp = s
    .object({
      "configuration_key:configuration_key": s.object({
        body: s.string,
      }).array,
      "wit$number:number": s.object({
        body: s.string,
      }).array,
    })
    .parse(witResponse);
  container.logger.debug(
    parsedResp["configuration_key:configuration_key"][0].body,
    parsedResp["wit$number:number"][0].body
  );
};
