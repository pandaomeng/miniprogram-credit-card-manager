const { BANKS, BANK_CUSTOM_CODE } = require('../../utils/banks.js');
const {
  normalizeCardDigits,
  formatCardInputDisplay,
  isDueAfterBill,
} = require('../../utils/card-helpers.js');
const dataStore = require('../../services/data-store.js');

const DAY_LABELS = Array.from({ length: 28 }, (_, i) => `${i + 1} 日`);

Page({
  data: {
    mode: 'add',
    editId: '',
    bankChosen: false,
    bank_code: '',
    bankDisplayName: '',
    custom_bank_name: '',
    billIndex: 4,
    dueIndex: 22,
    billDay: 5,
    dueDay: 23,
    dayLabels: DAY_LABELS,
    cardInputDisplay: '',
    cardDigits: '',
    notes: '',
    hints: { bank: '', card: '', notes: '', due: '' },
    canSubmit: false,
  },

  onLoad(query) {
    const mode = query.mode === 'edit' ? 'edit' : 'add';
    wx.setNavigationBarTitle({
      title: mode === 'edit' ? '编辑信用卡' : '添加信用卡',
    });
    this.setData({
      mode,
      bankChosen: false,
      bank_code: '',
      bankDisplayName: '',
      custom_bank_name: '',
    });
    if (mode === 'edit' && query.id) {
      this.prefill(query.id);
    } else {
      this.recompute();
    }
  },

  async prefill(id) {
    const card = await dataStore.getCardById(id);
    if (!card) {
      wx.showToast({ title: '卡片不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 400);
      return;
    }
    const last4 = String(card.last4 || '')
      .replace(/\D/g, '')
      .slice(-4);
    const digits = last4 || '';
    const billIndex = Math.max(0, Math.min(27, card.bill_day - 1));
    const dueIndex = Math.max(0, Math.min(27, card.due_day - 1));

    let bankChosen = false;
    let bank_code = '';
    let bankDisplayName = '';
    let custom_bank_name = '';

    if (card.bank_code === BANK_CUSTOM_CODE) {
      bankChosen = true;
      bank_code = BANK_CUSTOM_CODE;
      custom_bank_name = card.custom_bank_name || '';
      bankDisplayName = (custom_bank_name || '').trim() || '其它银行';
    } else {
      const b = BANKS.find((x) => x.code === card.bank_code);
      if (b) {
        bankChosen = true;
        bank_code = b.code;
        bankDisplayName = b.name;
      }
    }

    this.setData({
      editId: id,
      bankChosen,
      bank_code,
      bankDisplayName,
      custom_bank_name,
      cardDigits: digits,
      cardInputDisplay: formatCardInputDisplay(digits),
      notes: card.notes || '',
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
      bank_code,
      custom_bank_name,
      cardDigits,
      notes,
      billIndex,
      dueIndex,
    } = this.data;
    const billDay = billIndex + 1;
    const dueDay = dueIndex + 1;
    const digits = normalizeCardDigits(cardDigits);
    const cn = (custom_bank_name || '').trim();
    const bankOk =
      bankChosen &&
      !!bank_code &&
      (bank_code !== BANK_CUSTOM_CODE || (cn.length >= 1 && cn.length <= 20));
    const cardOk = true;
    const dueOk = isDueAfterBill(billDay, dueDay);
    const notesTrim = (notes || '').trim();
    const notesOk = notesTrim.length <= 200;

    const hints = {
      bank: bankOk ? '' : '请选择发卡银行',
      card: '',
      notes: notesOk ? '' : '备注最长 200 个字符',
      due: dueOk ? '' : '还款日须与账单日不同（小于账单日视为次月还款）',
    };
    if (bank_code === BANK_CUSTOM_CODE && bankChosen && cn.length > 20) {
      hints.bank = '银行名称最长 20 个字符';
    }

    const canSubmit = bankOk && cardOk && dueOk && notesOk;
    this.setData({ billDay, dueDay, hints, canSubmit });
  },

  onPickBank() {
    wx.navigateTo({
      url: '/pages/bank-pick/bank-pick',
      events: {
        bankPicked: (data) => {
          this.applyBankPick(data);
        },
      },
    });
  },

  applyBankPick(data) {
    if (!data || !data.bank_code) return;
    const name = (data.custom_bank_name || '').trim();
    const display =
      data.bank_code === BANK_CUSTOM_CODE
        ? (name || '其它银行')
        : data.bank_name || '';
    this.setData(
      {
        bankChosen: true,
        bank_code: data.bank_code,
        custom_bank_name:
          data.bank_code === BANK_CUSTOM_CODE ? name : '',
        bankDisplayName: display,
      },
      () => this.recompute(),
    );
  },

  onCardInput(e) {
    const digits = normalizeCardDigits(e.detail.value);
    const display = formatCardInputDisplay(digits);
    this.setData({ cardDigits: digits, cardInputDisplay: display }, () => this.recompute());
  },

  onNotesInput(e) {
    this.setData({ notes: e.detail.value }, () => this.recompute());
  },

  onBillChange(e) {
    const billIndex = Number(e.detail.value);
    this.setData({ billIndex }, () => this.recompute());
  },

  onDueChange(e) {
    const dueIndex = Number(e.detail.value);
    this.setData({ dueIndex }, () => this.recompute());
  },

  async onSave() {
    if (!this.data.canSubmit) {
      wx.showToast({ title: '请完善表单', icon: 'none' });
      return;
    }
    const {
      mode,
      editId,
      bank_code,
      custom_bank_name,
      cardDigits,
      notes,
      billIndex,
      dueIndex,
    } = this.data;
    const digits = normalizeCardDigits(cardDigits);
    const last4 = digits.length ? digits.slice(-4) : '';
    const payload = {
      bank_code,
      custom_bank_name:
        bank_code === BANK_CUSTOM_CODE
          ? (custom_bank_name || '').trim()
          : '',
      last4,
      notes: (notes || '').trim(),
      bill_day: billIndex + 1,
      due_day: dueIndex + 1,
    };

    let ok = false;
    if (mode === 'edit') {
      ok = await dataStore.updateCard(editId, payload);
    } else {
      ok = await dataStore.addCard(payload);
    }
    if (!ok) {
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
      return;
    }
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 450);
  },

  onCancel() {
    wx.navigateBack();
  },
});
