import { CreditCard, UserSetting } from "./db.js";

function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

export function cleanPatch(patch = {}) {
  const out = {};
  const allow = [
    "bank_code",
    "custom_bank_name",
    "last4",
    "cardholder_name",
    "bill_day",
    "due_day",
    "repaid_months",
  ];
  allow.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(patch, k)) out[k] = patch[k];
  });
  if (out.bill_day !== undefined) out.bill_day = toInt(out.bill_day, 1);
  if (out.due_day !== undefined) out.due_day = toInt(out.due_day, 1);
  if (typeof out.last4 === "string") out.last4 = out.last4.replace(/\D/g, "").slice(-4);
  if (typeof out.custom_bank_name === "string") out.custom_bank_name = out.custom_bank_name.trim().slice(0, 20);
  if (typeof out.cardholder_name === "string") out.cardholder_name = out.cardholder_name.trim().slice(0, 20);
  if (out.repaid_months && typeof out.repaid_months === "object") {
    const cleaned = {};
    Object.keys(out.repaid_months).forEach((k) => {
      const m = k.match(/^(\d{4})-(\d{2})$/);
      if (!m) return;
      const mm = parseInt(m[2], 10);
      if (mm >= 1 && mm <= 12) cleaned[k] = !!out.repaid_months[k];
    });
    out.repaid_months = cleaned;
  }
  return out;
}

function toCardJson(row) {
  if (!row) return null;
  const o = row.get ? row.get({ plain: true }) : row;
  return { ...o, id: o.id };
}

export async function listCards(openid) {
  const rows = await CreditCard.findAll({
    where: { owner_openid: openid },
    order: [
      ["due_day", "ASC"],
      ["id", "ASC"],
    ],
  });
  return rows.map((r) => toCardJson(r));
}

export async function getCard(openid, id) {
  const row = await CreditCard.findOne({
    where: { owner_openid: openid, id },
  });
  return toCardJson(row);
}

export async function createCard(openid, payload) {
  const body = cleanPatch(payload);
  const required = ["bank_code", "bill_day", "due_day"];
  const miss = required.find((k) => !body[k]);
  if (miss) throw new Error(`missing:${miss}`);
  const row = await CreditCard.create({
    ...body,
    owner_openid: openid,
    last4: body.last4 || "",
    repaid_months: body.repaid_months || {},
  });
  return row.id;
}

export async function updateCard(openid, id, patch) {
  const body = cleanPatch(patch);
  const [n] = await CreditCard.update(body, {
    where: { owner_openid: openid, id },
  });
  return n > 0;
}

export async function deleteCard(openid, id) {
  const n = await CreditCard.destroy({
    where: { owner_openid: openid, id },
  });
  return n > 0;
}

export async function getSettings(openid) {
  const row = await UserSetting.findOne({
    where: { owner_openid: openid },
  });
  if (!row) {
    return { hideRepaid: false, viewYm: "" };
  }
  return {
    hideRepaid: !!row.hideRepaid,
    viewYm: row.viewYm || "",
  };
}

export async function setSettings(openid, payload = {}) {
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(payload, "hideRepaid")) {
    patch.hideRepaid = !!payload.hideRepaid;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "viewYm")) {
    const v = String(payload.viewYm || "");
    patch.viewYm = /^\d{4}-\d{2}$/.test(v) ? v : "";
  }
  if (Object.keys(patch).length === 0) return true;

  const [row] = await UserSetting.findOrCreate({
    where: { owner_openid: openid },
    defaults: {
      owner_openid: openid,
      hideRepaid: false,
      viewYm: "",
    },
  });
  await row.update(patch);
  return true;
}
