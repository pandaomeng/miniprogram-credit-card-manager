const { BANKS } = require('../../utils/banks.js');
const {
  normalizeCardDigits,
  formatCardInputDisplay,
  isDueAfterBill,
} = require('../../utils/card-helpers.js');
const storage = require('../../utils/storage.js');

const DAY_LABELS = Array.from({ length: 28 }, (_, i) => `${i + 1} 日`);

Page({
  data: {
    mode: 'add',
    editId: '',
    bankNames: BANKS.map((b) => b.name),
    bankChosen: false,
    bankIndex: 0,
    cardInputDisplay: '',
    cardDigits: '',
    holderName: '',
    billIndex: 4,
    dueIndex: 22,
    billDay: 5,
    dueDay: 23,
    dayLabels: DAY_LABELS,
    hints: { bank: '', card: '', holder: '', due: '' },
    canSubmit: false,
  },

  onLoad(query) {
    const mode = query.mode === 'edit' ? 'edit' : 'add';
    wx.setNavigationBarTitle({
      title: mode === 'edit' ? '编辑信用卡' : '添加信用卡',
    });
    this.setData({ mode, bankChosen: false, bankIndex: 0 });
    if (mode === 'edit' && query.id) {
      this.prefill(query.id);
    } else {
      this.recompute();
    }
  },

  prefill(id) {
    const card = storage.getCardById(id);
    if (!card) {
      wx.showToast({ title: '卡片不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 400);
      return;
    }
    const bankIndex = BANKS.findIndex((b) => b.code === card.bank_code);
    const last4 = String(card.last4 || '')
      .replace(/\D/g, '')
      .slice(-4)
      .padStart(4, '0');
    const prefix = '5'.repeat(Math.max(0, 13 - last4.length));
    const digits = normalizeCardDigits(prefix + last4);
    const billIndex = Math.max(0, Math.min(27, card.bill_day - 1));
    const dueIndex = Math.max(0, Math.min(27, card.due_day - 1));
    this.setData({
      editId: id,
      bankChosen: bankIndex >= 0,
      bankIndex: bankIndex >= 0 ? bankIndex : 0,
      cardDigits: digits,
      cardInputDisplay: formatCardInputDisplay(digits),
      holderName: card.cardholder_name || '',
      billIndex,
      dueIndex,
      billDay: billIndex + 1,
      dueDay: dueIndex + 1,
    });
    this.recompute();
  },

  recompute() {
    const {
      bankChosen,
      bankIndex,
      cardDigits,
      holderName,
      billIndex,
      dueIndex,
    } = this.data;
    const billDay = billIndex + 1;
    const dueDay = dueIndex + 1;
    const digits = normalizeCardDigits(cardDigits);
    const bankOk = bankChosen && bankIndex >= 0;
    const cardOk = digits.length >= 13 && digits.length <= 19;
    const dueOk = isDueAfterBill(billDay, dueDay);
    const holderLen = (holderName || '').length;
    const holderOk = holderLen <= 20;

    const hints = {
      bank: bankOk ? '' : '请选择发卡银行',
      card: '',
      holder: holderOk ? '' : '姓名最长 20 个字符',
      due: dueOk ? '' : '还款日须与账单日不同（小于账单日视为次月还款）',
    };
    if (digits.length > 0 && digits.length < 13) {
      hints.card = '卡号需为 13–19 位数字';
    } else if (digits.length > 19) {
      hints.card = '卡号最多 19 位数字';
    }

    const canSubmit = bankOk && cardOk && dueOk && holderOk;
    this.setData({ billDay, dueDay, hints, canSubmit });
  },

  onBankChange(e) {
    this.setData(
      { bankChosen: true, bankIndex: Number(e.detail.value) },
      () => this.recompute(),
    );
  },

  onCardInput(e) {
    const digits = normalizeCardDigits(e.detail.value);
    const display = formatCardInputDisplay(digits);
    this.setData({ cardDigits: digits, cardInputDisplay: display }, () => this.recompute());
  },

  onHolderInput(e) {
    this.setData({ holderName: e.detail.value }, () => this.recompute());
  },

  onBillChange(e) {
    const billIndex = Number(e.detail.value);
    this.setData({ billIndex }, () => this.recompute());
  },

  onDueChange(e) {
    const dueIndex = Number(e.detail.value);
    this.setData({ dueIndex }, () => this.recompute());
  },

  onSave() {
    if (!this.data.canSubmit) {
      wx.showToast({ title: '请完善表单', icon: 'none' });
      return;
    }
    const {
      mode,
      editId,
      bankIndex,
      cardDigits,
      holderName,
      billIndex,
      dueIndex,
    } = this.data;
    const digits = normalizeCardDigits(cardDigits);
    const bank_code = BANKS[bankIndex].code;
    const last4 = digits.slice(-4);
    const payload = {
      bank_code,
      last4,
      cardholder_name: (holderName || '').trim(),
      bill_day: billIndex + 1,
      due_day: dueIndex + 1,
    };

    let ok = false;
    if (mode === 'edit') {
      ok = storage.updateCard(editId, payload);
    } else {
      const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      ok = storage.addCard({ id, ...payload });
    }
    if (!ok) return;
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 450);
  },

  onCancel() {
    wx.navigateBack();
  },
});
