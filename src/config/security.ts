import pm from "picomatch";

export const LOCAL_SETTINGS = ["core.enableAI", "core.footers", "core.uwu"];

export const WHITELISTED_HOSTS = [
  "api.phisherman.gg",
  "cdn.jsdelivr.net",
  "kvdb.io",
  "api.wit.ai",
  "*.googleapis.com",
  "wttr.in",
  "api.moderatecontent.com",
  "api.unsplash.com",
  "*.images.weserv.nl",
  "api.pexels.com",
  "*.drand.sh",
  "drand.cloudflare.com",
  "api.cloudflare.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
  "vacefron.nl",
  "some-random-api.ml",
  "www.random.org",
  "api.imgur.com",
  "api.giphy.com",
  "g.tenor.com",
  "pixabay.com",
  "placekitten.com",
  "picsum.photos",
  "example.com",
  "example.org",
  "yandex.{ru,com}",
  "foreca.ru",
  "weather.com",
  "wttr.in",
  "accuweather.com",
];

export const isHostWhitelisted = pm(WHITELISTED_HOSTS);
