const { byCode, BANK_CUSTOM_CODE } = require('./banks.js');

/** 仅数字，最多 19 位 */
function normalizeCardDigits(raw) {
  return String(raw || '').replace(/\D/g, '').slice(0, 19);
}

/** 展示用：每 4 位空格 */
function formatCardInputDisplay(digits) {
  const d = normalizeCardDigits(digits);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/** 掩码后四位 */
function maskLastFour(last4) {
  const s = String(last4 || '').replace(/\D/g, '').slice(-4);
  if (s.length < 4) return s ? `**** ${s.padStart(4, '•')}` : '**** ——';
  return `**** ${s}`;
}

/**
 * 还款日相对账单日：同日无效；其余视为合法（小号为次月还款）
 */
function isDueAfterBill(billDay, dueDay) {
  const b = Number(billDay);
  const d = Number(dueDay);
  if (!b || !d || b < 1 || b > 28 || d < 1 || d > 28) return false;
  return d !== b;
}

/** 下一个「还款日」自然日 0 点（due 仅日，1–28） */
function nextDueDateStart(dueDay) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const due = Number(dueDay);
  let ty = y;
  let tm = m;
  const t = new Date(ty, tm, due, 0, 0, 0, 0);
  if (t.getTime() < new Date(ty, tm, d, 0, 0, 0, 0).getTime()) {
    tm += 1;
    if (tm > 11) {
      tm = 0;
      ty += 1;
    }
  }
  return new Date(ty, tm, due, 0, 0, 0, 0);
}

/** 距离下次还款剩余整天数（当天还款算 0），按真实今天计算 */
function daysUntilNextDue(dueDay) {
  const target = nextDueDateStart(dueDay);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  return Math.ceil((target - start) / 86400000);
}

function formatDueYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 下一期还款日 YYYY-MM-DD（相对今天） */
function nextDueYmd(dueDay) {
  return formatDueYmd(nextDueDateStart(dueDay));
}

/** 指定查看月份内的还款日 0 点（local），dueDay 为 1–28 */
function dueDateInViewMonth(viewYm, dueDay) {
  const n = normalizeYm(viewYm);
  const [ys, ms] = n.split('-');
  const y = parseInt(ys, 10);
  const monthIndex = parseInt(ms, 10) - 1;
  const d = Number(dueDay);
  return new Date(y, monthIndex, d, 0, 0, 0, 0);
}

/**
 * 从今天 0 点到「查看月份」内还款日的天数差（可负表示已过期）
 * 展示用天数为非负；紧急态包含已逾期（raw <= 7）
 */
function daysRelativeToDueInViewMonth(viewYm, dueDay) {
  const target = dueDateInViewMonth(viewYm, dueDay);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const raw = Math.ceil((target - start) / 86400000);
  return {
    raw,
    display: Math.max(0, raw),
    dueDate: target,
    dueYmd: formatDueYmd(target),
  };
}

function currentYm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeYm(ym) {
  if (!ym || typeof ym !== 'string') return currentYm();
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return currentYm();
  const month = parseInt(m[2], 10);
  if (month < 1 || month > 12) return currentYm();
  return `${m[1]}-${m[2]}`;
}

function ymDisplayLabel(ym) {
  const n = normalizeYm(ym);
  const parts = n.split('-');
  const y = parseInt(parts[0], 10);
  const mo = parseInt(parts[1], 10);
  return `${y}年${mo}月`;
}

/** 日期选择器返回值 -> YYYY-MM */
function ymFromDatePickerValue(v) {
  if (!v && v !== 0) return currentYm();
  const s = String(v).slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(s)) return normalizeYm(s);
  return currentYm();
}

/** 仅使用 repaid_months 作为已还款来源，不再兼容旧字段 */
function migrateRepaidMonths(card) {
  if (!card) return card;
  const repaid_months = {
    ...(card.repaid_months && typeof card.repaid_months === 'object' ? card.repaid_months : {}),
  };
  return { ...card, repaid_months };
}

/**
 * @param {object} card
 * @param {string} [viewYm] 查看的年月 YYYY-MM，还款勾选状态按该月独立
 */
function enrichCard(card, viewYm) {
  const ym = normalizeYm(viewYm);
  const c = migrateRepaidMonths(card);
  const bank = byCode(c.bank_code);
  const dueMeta = daysRelativeToDueInViewMonth(ym, c.due_day);
  const daysLeft = dueMeta.display;
  const next_due_ymd = dueMeta.dueYmd;
  const repaid_active = !!c.repaid_months[ym];
  const customName = (c.custom_bank_name || '').trim();
  const bank_name =
    c.bank_code === BANK_CUSTOM_CODE
      ? (customName || '其它银行')
      : bank
        ? bank.name
        : '未知银行';
  const bank_color = bank ? bank.color : '#1a1a2e';
  const logo_code = c.bank_code === BANK_CUSTOM_CODE ? BANK_CUSTOM_CODE : c.bank_code;
  return {
    ...c,
    bank_name,
    bank_color,
    logo_path: `/assets/banks/${logo_code}.png`,
    card_display: maskLastFour(c.last4),
    days_until_due: daysLeft,
    next_due_ymd,
    view_ym: ym,
    repaid_active,
    due_urgent: !repaid_active && dueMeta.raw <= 7,
  };
}

/** 列表展示：按还款日（日号）升序，同日按 id 稳定排序 */
function sortCardsByDueDayAsc(cards) {
  if (!Array.isArray(cards)) return [];
  return [...cards].sort((a, b) => {
    const da = Number(a && a.due_day);
    const db = Number(b && b.due_day);
    const na = Number.isFinite(da) && da >= 1 && da <= 28 ? da : 999;
    const nb = Number.isFinite(db) && db >= 1 && db <= 28 ? db : 999;
    if (na !== nb) return na - nb;
    return String((a && a.id) || '').localeCompare(String((b && b.id) || ''));
  });
}

module.exports = {
  normalizeCardDigits,
  formatCardInputDisplay,
  maskLastFour,
  isDueAfterBill,
  daysUntilNextDue,
  nextDueDateStart,
  formatDueYmd,
  nextDueYmd,
  currentYm,
  normalizeYm,
  ymDisplayLabel,
  ymFromDatePickerValue,
  migrateRepaidMonths,
  dueDateInViewMonth,
  daysRelativeToDueInViewMonth,
  enrichCard,
  sortCardsByDueDayAsc,
};
