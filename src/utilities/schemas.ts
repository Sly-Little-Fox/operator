import { s } from "@sapphire/shapeshift";

// https://yandex.com/safety/
export const yandexSafetySchema = s.object({
  info: s.object({ threat: s.string.lengthLessThanOrEqual(1) }).array,
  url: s.string,
});

export const cf1111Schema = s.object({
  Status: s.number,
  TC: s.boolean,
  RD: s.boolean,
  RA: s.boolean,
  AD: s.boolean,
  CD: s.boolean,
  Question: s.object({
    name: s.string,
    type: s.number,
  }).array,
  Answer: s.object({
    name: s.string,
    type: s.number,
    TTL: s.number,
    data: s.string,
  }).array,
});

export const G8888Schema = s.object({
  Status: s.number,
  TC: s.boolean,
  RD: s.boolean,
  RA: s.boolean,
  AD: s.boolean,
  CD: s.boolean,
  Question: s.object({
    name: s.string,
    type: s.number,
  }).array,
  Answer: s.object({
    name: s.string,
    type: s.number,
    TTL: s.number,
    data: s.string,
  }).array,
  Comment: s.string.optional,
  edns_client_subnet: s.string,
});

export const quad9Schema = s.object({
  domain: s.string,
  blocked: s.boolean,
  blocked_by: s.string.array,
  meta: s.object({ name: s.string }).array,
});
