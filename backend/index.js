import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { init as initDB } from "./db.js";
import * as store from "./credit-store.js";

function getOpenid(c) {
  return (
    c.req.header("x-wx-openid") ||
    c.req.header("X-Wx-Openid") ||
    c.req.header("x-dev-openid") ||
    c.req.header("X-Dev-Openid") ||
    ""
  );
}

const app = new Hono();

app.use(logger());

app.get("/", (c) => {
  return c.json({ ok: true, service: "credit-manager-api" });
});

app.get("/api/wx_openid", (c) => {
  if (c.req.header("x-wx-source")) {
    return c.text(c.req.header("x-wx-openid") ?? "");
  }
  return c.notFound();
});

const api = new Hono();

api.use("*", async (c, next) => {
  const openid = getOpenid(c);
  if (!openid) {
    return c.json({ ok: false, error: "missing_openid" }, 401);
  }
  c.set("openid", openid);
  await next();
});

api.get("/cards", async (c) => {
  try {
    const data = await store.listCards(c.get("openid"));
    return c.json({ ok: true, data });
  } catch (e) {
    return c.json({ ok: false, error: e.message || "list_failed" }, 500);
  }
});

api.get("/cards/:id", async (c) => {
  try {
    const data = await store.getCard(c.get("openid"), c.req.param("id"));
    return c.json({ ok: true, data });
  } catch (e) {
    return c.json({ ok: false, error: e.message || "get_failed" }, 500);
  }
});

api.post("/cards", async (c) => {
  try {
    const payload = await c.req.json().catch(() => ({}));
    const id = await store.createCard(c.get("openid"), payload);
    return c.json({ ok: true, id });
  } catch (e) {
    return c.json({ ok: false, error: e.message || "create_failed" }, 400);
  }
});

api.patch("/cards/:id", async (c) => {
  try {
    const patch = await c.req.json().catch(() => ({}));
    const ok = await store.updateCard(c.get("openid"), c.req.param("id"), patch);
    return c.json({ ok });
  } catch (e) {
    return c.json({ ok: false, error: e.message || "update_failed" }, 500);
  }
});

api.delete("/cards/:id", async (c) => {
  try {
    const ok = await store.deleteCard(c.get("openid"), c.req.param("id"));
    return c.json({ ok });
  } catch (e) {
    return c.json({ ok: false, error: e.message || "delete_failed" }, 500);
  }
});

api.get("/settings", async (c) => {
  try {
    const data = await store.getSettings(c.get("openid"));
    return c.json({ ok: true, data });
  } catch (e) {
    return c.json({ ok: false, error: e.message || "settings_get_failed" }, 500);
  }
});

api.patch("/settings", async (c) => {
  try {
    const payload = await c.req.json().catch(() => ({}));
    const ok = await store.setSettings(c.get("openid"), payload);
    return c.json({ ok });
  } catch (e) {
    return c.json({ ok: false, error: e.message || "settings_set_failed" }, 500);
  }
});

app.route("/api", api);

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
