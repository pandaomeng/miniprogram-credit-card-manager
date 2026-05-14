import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { init as initDB, Counter } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const homePage = readFileSync(join(__dirname, "index.html"), "utf-8");

const app = new Hono();

app.use(logger());

app.get("/", () => {
  return new Response(homePage, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
});

app.post("/api/count", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { action } = body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({ truncate: true });
  }

  return c.json({
    code: 0,
    data: await Counter.count(),
  });
});

app.get("/api/count", async (c) => {
  const result = await Counter.count();
  return c.json({
    code: 0,
    data: result,
  });
});

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", (c) => {
  if (c.req.header("x-wx-source")) {
    return c.text(c.req.header("x-wx-openid") ?? "");
  }
  return c.notFound();
});

const port = Number(process.env.PORT) || 80;

await initDB();

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log("启动成功", info.port);
  }
);
