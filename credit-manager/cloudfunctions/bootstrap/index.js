const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const CARDS = 'credit_cards';
const SETTINGS = 'user_settings';

const DEMO_CARDS = [
  { bank_code: 'CMB', last4: '8888', cardholder_name: '李雷', bill_day: 5, due_day: 23 },
  { bank_code: 'CCB', last4: '6666', cardholder_name: '李雷', bill_day: 10, due_day: 28 },
  { bank_code: 'ICBC', last4: '1234', cardholder_name: '李雷', bill_day: 1, due_day: 20 },
];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const withDemo = !!(event && event.withDemo);

  try {
    // 触发集合创建：若集合不存在，add 会自动创建。
    const existedSetting = await db.collection(SETTINGS).where({ _openid: openid }).limit(1).get();
    if (!existedSetting.data || !existedSetting.data.length) {
      await db.collection(SETTINGS).add({
        data: {
          hideRepaid: false,
          viewYm: '',
          created_at: db.serverDate(),
          updated_at: db.serverDate(),
        },
      });
    }

    if (withDemo) {
      const cardsRes = await db.collection(CARDS).where({ _openid: openid }).limit(1).get();
      if (!cardsRes.data || !cardsRes.data.length) {
        for (const c of DEMO_CARDS) {
          await db.collection(CARDS).add({
            data: {
              ...c,
              custom_bank_name: '',
              repaid_months: {},
              created_at: db.serverDate(),
              updated_at: db.serverDate(),
            },
          });
        }
      }
    }

    return {
      ok: true,
      envId: wxContext.ENV,
      openid,
      collections: [CARDS, SETTINGS],
    };
  } catch (e) {
    return { ok: false, error: e.message || 'bootstrap_failed' };
  }
};
