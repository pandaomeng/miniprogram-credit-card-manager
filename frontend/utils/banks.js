/** 非列表银行：自定义名称时使用，主题色用于详情页 */
const BANK_CUSTOM_CODE = 'CUSTOM';

const CUSTOM_BANK_META = {
  code: BANK_CUSTOM_CODE,
  name: '',
  color: '#64748b',
};

/** 15 家预置银行：主题色用于详情页头图 */
const BANKS = [
  { code: 'CMB', name: '招商银行', color: '#C8102E' },
  { code: 'CCB', name: '中国建设银行', color: '#003B8F' },
  { code: 'ICBC', name: '中国工商银行', color: '#C41230' },
  { code: 'ABC', name: '中国农业银行', color: '#319C8B' },
  { code: 'BOC', name: '中国银行', color: '#B61C22' },
  { code: 'BCM', name: '交通银行', color: '#00367A' },
  { code: 'PSBC', name: '中国邮政储蓄银行', color: '#007F3E' },
  { code: 'SPDB', name: '浦发银行', color: '#003B7A' },
  { code: 'CMBC', name: '民生银行', color: '#005BAC' },
  { code: 'CEB', name: '中国光大银行', color: '#691B7E' },
  { code: 'CITIC', name: '中信银行', color: '#E60012' },
  { code: 'PAB', name: '平安银行', color: '#FF6A00' },
  { code: 'GDB', name: '广发银行', color: '#E4002B' },
  { code: 'CIB', name: '兴业银行', color: '#004889' },
  { code: 'HXB', name: '华夏银行', color: '#D80C18' },
];

function byCode(code) {
  if (code === BANK_CUSTOM_CODE) {
    return CUSTOM_BANK_META;
  }
  return BANKS.find((b) => b.code === code) || null;
}

module.exports = { BANKS, BANK_CUSTOM_CODE, byCode };
