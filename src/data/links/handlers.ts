import { GoogleSafeBrowsingClient } from "google-safe-browsing";
import { readFile } from "node:fs/promises";
import mem from "mem";
import Fuse from "fuse.js";
import p from "phin";
import { container } from "@sapphire/framework";
import {
  cf1111Schema,
  quad9Schema,
  yandexSafetySchema,
} from "../../utilities/schemas.js";

const resolveFile = (file: string) =>
  decodeURIComponent(new URL(file, import.meta.url).pathname);

const readSpam404 = mem(() => readFile(resolveFile("spam404.txt")), {
  maxAge: 60 * 60 * 1000,
});

const fuzzyIndex = new Fuse(
  (await readFile(resolveFile("popular-domains.txt"), "utf8")).split("\n"),
  {
    ignoreLocation: true,
    threshold: 0.9,
  }
);

const safeBrowsingChecker = process.env.SAFE_BROWSING_KEY
  ? new GoogleSafeBrowsingClient(process.env.SAFE_BROWSING_KEY)
  : null;

/*
 * All these functions return a boolean meaning "is url allowed"
 * They can optionally accept an argument "isNsfwChannel"
 * It controls whether NSFW links should also be filtered
 */

export async function cloudflare(
  url: URL,
  isNsfwChannel = false
): Promise<boolean> {
  const response = await p({
    url: `https://${
      isNsfwChannel ? "security" : "family"
    }.cloudflare-dns.com/dns-query?name=${url.hostname}&type=A`,
    headers: { Accept: "application/dns-json" },
    parse: "json",
  });
  const body = cf1111Schema.parse(response);
  return body.Answer[0].data !== "0.0.0.0";
}

export async function quad9(url: URL): Promise<boolean> {
  const response = await p({
    url: `https://api.quad9.net/search/${url.hostname}`,
    headers: { Accept: "application/json" },
    followRedirects: true,
  });
  const body = quad9Schema.parse(response.body.toString());
  return !body.blocked;
}

export async function safeBrowsing(url: URL): Promise<boolean> {
  if (safeBrowsingChecker === null) {
    container.logger.warn(
      "You didn't provide a Safe Browsing API key. Provider will be disabled."
    );
    return true;
  }
  const result = await safeBrowsingChecker.isUrlSafe(url.href);
  return result;
}

export async function yandex(
  url: URL,
  isNsfwChannel = false
): Promise<boolean> {
  if (isNsfwChannel) return true;
  const response = await p({
    url: "https://yandex.ru/safety/check",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
    data: { url: url.hostname },
    followRedirects: true,
  });
  const body = yandexSafetySchema.parse(response);
  return !body.info.length;
}

export async function spam404(url: URL): Promise<boolean> {
  const data = (await readSpam404()).toString().split("\n");
  const result = !data.includes(url.hostname);
  return result;
}

export async function fuzzy(url: URL): Promise<boolean> {
  return !!fuzzyIndex
    .search(url.hostname, {
      limit: 50,
    })
    .filter(
      (r) =>
        r.item[0] === url.hostname[0] &&
        r.item.length === url.hostname.length &&
        r.item !== url.hostname
    ).length;
}

/* export async function content(url: URL): Promise<boolean> {
  const data = await p({
    url: url.href,
    headers: {
      "Accept-Language": "en",
    },
  });
  const tree = parse(data.body.toString());
  const it = tree.innerText.replace(/ +/g, " ");
  const rootHostname = url.hostname.match(/[\w-]+\.[\w-]+$/)![0];
  // Looks like Discord's login page
  if (
    [
      "Welcome back!",
      "We're so excited to see you again!",
      "Log in with QR Code",
      "Scan this with the Discord mobile app to log in instantly.",
    ].every(it.includes) &&
    !["discord.com", "discordapp.com"].includes(rootHostname)
  )
    return false;
  // No free bobux
  if (
    [
      "Login to Roblox",
      "Forgot Password or Username?",
      "login with",
      "Another Logged In Device",
      "Don't have an account?",
      "Sign Up",
    ].every(it.includes) &&
    rootHostname !== "roblox.com"
  )
    return false;
  // Minceraft
  if (
    [
      "Still have a Mojang account? Log in here:",
      "No Microsoft account? Sign up for free!",
      "Mojang Account (Email)",
    ].every(it.includes) &&
    !["microsoft.com", "live.com", "minecraft.net"].includes(rootHostname)
  )
    return false;
  // Goole 1000-7
  if (
    [
      "Sign in",
      "Use your Google Account",
      "Not your computer? Use a Private Window to sign in.",
      "Create account",
      "Next",
    ].every(it.includes) &&
    picomatch("google.*")(rootHostname)
  )
    return false;
  return true;
} */
