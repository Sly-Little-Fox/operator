import { s, BaseValidator, MappedObjectValidator } from "@sapphire/shapeshift";
import { readdir } from "fs/promises";
import path from "path";

const rawSchema: Record<string, BaseValidator<any>> = {};
const defaultValues = {};

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = decodeURIComponent(new URL(".", import.meta.url).pathname);

export async function getConfiguration(): Promise<{
  rawSchema: Record<string, BaseValidator<any>>;
  defaultValues: Record<string, any>;
}> {
  await Promise.all(
    [
      ...(await readdir(path.join(__dirname, "../plugins/"))),
      "../config/core.js",
    ].map(async (file) => {
      let { CONFIG_SCHEMA: importedSchema, DEFAULT_CONFIG: pluginDefault } = (
        await import(path.join(__dirname, `../plugins/${file}`))
      ).default;
      importedSchema ||= {};
      pluginDefault ||= {};
      const temp1: MappedObjectValidator<any> = {};
      const temp2: MappedObjectValidator<any> = {};
      const pluginName = path.basename(path.basename(file, ".js"), ".ts");
      Object.keys(importedSchema).forEach((key) => {
        temp1[`${pluginName}.${key}`] = importedSchema[key];
      });
      Object.keys(pluginDefault).forEach((key) => {
        temp2[`${pluginName}.${key}`] = pluginDefault[key];
      });
      Object.assign(rawSchema, temp1);
      Object.assign(defaultValues, temp2);
      if (pluginName === "core") return;
      Object.assign(rawSchema, {
        [`${pluginName}.enabled`]: s.boolean,
        [`${pluginName}.exclude`]: s.string.array,
      });
      Object.assign(defaultValues, {
        [`${pluginName}.enabled`]: false,
        [`${pluginName}.exclude`]: [],
      });
    })
  );
  return {
    rawSchema,
    defaultValues,
  };
}

await getConfiguration();

/* s.object({
  id: s.string,
  name: s.string,
  roles: s.array(s.string),
}).parse(
  await fetch(
    `https://api.wit.ai/entities/configuration_key?v=${s.string.parse(
      process.env.WIT_VERSION
    )}`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: "configuration_key",
        roles: ["configuration_key"],
        keywords: Object.keys(rawSchema).map((k) => ({
          keyword: k,
          synonyms: [],
        })),
      }),
      headers: {
        Authorization: `Bearer ${process.env.WIT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
    FetchResultTypes.JSON
  )
); */
