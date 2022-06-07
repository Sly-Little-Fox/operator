import cp from "node:child_process";
import fastifyAllow from "fastify-allow";
import createServer from "fastify";
import consola from "consola";
import sharp from "sharp";
import { fetch, FetchResultTypes } from "@sapphire/fetch";
import { Low, JSONFile } from "lowdb";
import { h32 } from "xxhashjs";

const lowdb = new Low<Record<string, string>>(new JSONFile("cache.json"));

const fastify = createServer();

fastify.register(fastifyAllow);

function isURLValid(url: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

fastify.get("/ping", (_req, res) => {
  res.send(`Pong! It's ${new Date().toTimeString()} for me.`);
});

// ! Image size should be approximately 450x550

fastify.get("/ocr", async (req, res) => {
  if (
    !(req.query as { url: string }).url ||
    !isURLValid((req.query as { url: string }).url)
  ) {
    res.status(400);
    res.send({
      error: "Didn't I tell you to provide a valid URL?",
      errorCode: "ERR_INVALID_URL",
      result: null,
    });
    return;
  }

  const start = Date.now();

  const sharpFactory = await sharp(
    await fetch(
      (req.query as { url: string }).url,
      {
        headers: { Accept: "image/png" },
      },
      FetchResultTypes.Buffer
    )
  );

  const image = await sharpFactory
    .clone()
    .resize({
      withoutEnlargement: true,
      height: 550,
    })
    .toBuffer();

  const imageForCache = await sharpFactory
    .clone()
    .resize({
      withoutEnlargement: true,
      height: 75,
    })
    .tiff()
    .toBuffer();

  lowdb.data ||= {};

  const hash = h32().update(imageForCache).digest().toString(16);
  const fromCache = lowdb.data[hash];
  if (fromCache) {
    res.header("X-Response-Time", (Date.now() - start) / 1000);
    res.send({
      error: null,
      errorCode: null,
      result: fromCache,
    });
    return;
  }

  const child = cp.execFile(
    "tesseract",
    ["stdin", "stdout"],
    {
      timeout: 5000,
    },
    async (err, stdout, stderr) => {
      if (err) throw err;
      if (stderr) consola.warn("[STDERR]", stderr.trim());
      const ocrResult = stdout.toString().trim();
      res.header("X-Response-Time", (Date.now() - start) / 1000);
      res.send({
        error: null,
        errorCode: null,
        result: ocrResult,
      });
      lowdb.data ||= {};
      lowdb.data[hash] = ocrResult;
      lowdb.write();
    }
  );

  child.stdin?.write(image);
  child.stdin?.end();
});

fastify.listen(3001, "0.0.0.0").then(() => {
  consola.success("Server booted up!");
});
