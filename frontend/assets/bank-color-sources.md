# 银行品牌色补齐来源清单

- 数据仓库目录: https://github.com/burningmyself/bank.logo/tree/master/resource/logo
- 代码与名称映射: https://raw.githubusercontent.com/burningmyself/bank.logo/master/resource/bankcode.json
- 提色时间: 2026-05-14
- 提色方法: 使用 ImageMagick 对 logo 缩放到 `96x96` 后做 16 色量化，基于直方图筛除近白/低饱和背景，取分数最高色作为主色。

## 本轮补齐结果（优先常见银行）

| code | 银行名 | color | logo 来源 |
|---|---|---|---|
| BJBANK | 北京银行 | `#C9131B` | https://s2.ax1x.com/2019/10/25/Kdy7FO.png |
| BJRCB | 北京农村商业银行 | `#C9131B` | https://s2.ax1x.com/2019/10/25/Kdy7FO.png |
| BOHAIB | 渤海银行 | `#29166F` | https://s2.ax1x.com/2019/10/25/Kdyz0P.png |
| SHBANK | 上海银行 | `#0110AB` | https://s2.ax1x.com/2019/10/26/K00Q1A.png |
| SHRCB | 上海农村商业银行 | `#0D2481` | https://s2.ax1x.com/2019/10/26/K00l6I.png |
| JSBANK | 江苏银行 | `#0165B3` | https://s2.ax1x.com/2019/10/25/KdxnMj.png |
| NBBANK | 宁波银行 | `#EA731A` | https://s2.ax1x.com/2019/10/25/KdxrFK.png |
| NJCB | 南京银行 | `#E60211` | https://s2.ax1x.com/2019/10/25/Kdx2yd.png |
| HZCB | 杭州银行 | `#36ADF8` | https://s2.ax1x.com/2019/10/25/KdvxRe.png |
| EGBANK | 恒丰银行 | `#003D7E` | https://s2.ax1x.com/2019/10/25/Kd643Q.png |
| CSCB | 长沙银行 | `#D9231C` | https://s2.ax1x.com/2019/10/25/Kd609e.png |
| GCB | 广州银行 | `#DA231B` | https://s2.ax1x.com/2019/10/25/Kd6HH0.png |
| QDCCB | 青岛银行 | `#E60202` | https://s2.ax1x.com/2019/10/26/K00ufH.png |
| CZBANK | 浙商银行 | `#DEB618` | https://s2.ax1x.com/2019/10/25/Kd6Dcd.png |
| SRCB | 深圳农村商业银行 | `#026AB0` | https://s2.ax1x.com/2019/10/26/K00Ntg.png |
| HSBANK | 徽商银行 | `#C4251C` | https://s2.ax1x.com/2019/10/25/KdvqVx.png |
| HKB | 汉口银行 | `#0286B3` | https://s2.ax1x.com/2019/10/25/Kdv4GF.png |
| TCCB | 天津银行 | `#00499F` | https://s2.ax1x.com/2019/10/26/K00BXq.png |
| TRCB | 天津农商银行 | `#EC5605` | https://s2.ax1x.com/2019/10/26/K00sBV.png |
| WHRCB | 武汉农村商业银行 | `#D82519` | https://s2.ax1x.com/2019/10/26/K002h4.png |
| CQBANK | 重庆银行 | `#02AB4D` | https://s2.ax1x.com/2019/10/25/Kd6atO.png |
| CDCB | 成都银行 | `#F19603` | https://s2.ax1x.com/2019/10/25/Kd6MhF.png |

## 继续补全（全量灰色补色）

- 范围：对 `BANKS` 中剩余默认灰色 (`#64748b`) 的银行再次批量提色并回填。
- 结果：新增回填 126 个代码的颜色覆盖，仍保留默认灰色的代码仅 4 个：`CBKF`、`CCQTGB`、`CGNB`、`GRCB`（当前提色稳定性不足）。
- 方法：与上文一致，使用 `bank.logo` 仓库中对应 logo 链接，做量化直方图提色并过滤低置信颜色。
