const { byCode } = require('./banks.js');

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

/** 距离下次还款剩余整天数（当天还款算 0） */
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

/** 下一期还款日 YYYY-MM-DD，用于与 repaid_for_due_ymd 对齐 */
function nextDueYmd(dueDay) {
  return formatDueYmd(nextDueDateStart(dueDay));
}

function enrichCard(card) {
  const bank = byCode(card.bank_code);
  const daysLeft = daysUntilNextDue(card.due_day);
  const next_due_ymd = nextDueYmd(card.due_day);
  const repaid_active = !!(card.repaid && card.repaid_for_due_ymd === next_due_ymd);
  return {
    ...card,
    bank_name: bank ? bank.name : '未知银行',
    bank_color: bank ? bank.color : '#1a1a2e',
    logo_path: `/assets/banks/${card.bank_code}.png`,
    card_display: maskLastFour(card.last4),
    days_until_due: daysLeft,
    next_due_ymd,
    repaid_active,
    due_urgent: !repaid_active && daysLeft <= 7,
  };
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
  enrichCard,
};
