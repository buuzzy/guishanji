/**
 * 修仙 · 出生（转盘 + 山海行籍登记卡）
 * ============================================================================
 *
 * 版式照官方 1in8b 小程序的出生页（`subpkg/engine/pages/roll/`）：
 *   ① **转盘态**：`.roll-stage` → `.roller`（`.lbl` + `.roller-name` + `.roller-meta`）
 *      节奏逐字照官方 `miniprogram/roll.js`：26 帧、越接近定格越慢、
 *      最后一帧强制停在真正抽定的地方、再停 650 ms 出登记卡。
 *   ② **登记卡**：官方 `.cert`（`.cert-band` + `.cert-body` + `.cert-foot` + `.cert-after`），
 *      字段表沿用官方 `idcard.certFields()` 的两列格式（标签 + 片段数组）。
 *
 * ⚠ 与官方人生**完全隔离**：
 *   · 不 require 官方引擎；
 *   · 不读不写 `one8b.*` / `o8b.*` 任何键（连主题偏好也走自己的 `xianxia.v1.*`）；
 *   · 主题与官方**同一个视觉**（同一套 CSS 变量与 `.theme-light` / `.theme-dark`），
 *     但**不共用存储** ⇒ 两边各调各的。
 */
var session = require('../../bridge/session.js');
var rollerMod = require('../../bridge/roller.js');
var pageModel = require('../../bridge/page-model.js');
var guilloche = require('../../art/guilloche.js');
var theme = require('../../../../bridge/theme.js');
var safeArea = require('../../../../bridge/safe-area.js');

Page({
  data: {
    theme: 'theme-light',
    statusBarHeight: 0,
    sheetPadTop: 0,
    rolling: true,
    rollName: '',
    rollMeta: '',
    certName: '',
    certText: '',
    certPace: '',
    certMapCap: '',
    fields: [],
    oddsPre: '',
    oddsShare: '',
    oddsPost: '',
    regNo: '',
    version: 0,
    saving: false,
  },

  onLoad: function () {
    var info = null;
    try {
      info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    } catch (error) {
      info = null;
    }
    this.setData({
      theme: theme.current(),
      statusBarHeight: (info && info.statusBarHeight) || 0,
      sheetPadTop: safeArea.sheetPadTop(),
    });
    this.startRoll();
  },

  onUnload: function () {
    this.stopRoll();
  },

  /** 抽一次（转盘 + 登记卡）。 */
  startRoll: function () {
    this.stopRoll();
    session.newLife();
    var run = session.run;
    var seed = run.seed;
    this.setData({
      rolling: true,
      certName: '',
      certText: '',
      certPace: '',
      certMapCap: '',
      fields: [],
      oddsPre: '',
      oddsShare: '',
      oddsPost: '',
      regNo: '',
    });
    var self = this;
    this.roller = rollerMod.create(
      rollerMod.buildPool(function (turn) {
        return pageModel.rollerFacts(seed, turn);
      }),
      /* 定格那一帧 = 这段人生真正的出生事实（名字与人生页一致）。 */
      pageModel.finalFacts(seed),
      function (frame) {
        self.setData({rollName: frame.name, rollMeta: frame.meta});
      },
      function () { self.settle(); }
    );
  },

  stopRoll: function () {
    if (this.roller) { this.roller.stop(); this.roller = null; }
  },

  /** 定格：出登记卡。 */
  settle: function () {
    this.stopRoll();
    var run = session.run;
    if (!run) return;
    var cert = pageModel.certPage(run);
    var self = this;
    this.setData({
      rolling: false,
      /* ⚠ `certName` 与 `certText` **必须分开**：
       *   之前把正文塞进 `cert`、WXML 却按对象取 `cert.name`
       *   ⇒ 角色名永远渲染不出来（用户 2026-11-03 指出）。 */
      certName: cert.name,
      certText: cert.cert,
      certPace: cert.certPace,
      certMapCap: cert.certMapCap,
      fields: cert.fields,
      oddsPre: cert.oddsPre,
      oddsShare: cert.oddsShare,
      oddsPost: cert.oddsPost,
      regNo: cert.regNo,
      version: this.data.version + 1,
    }, function () {
      /* 雕版底纹要等视图层渲染完才有尺寸。
       * ⚠ setData 回调里的 `this` 在真机上不保证指向页面实例 ⇒ 闭包捕获。 */
      if (self.drawGuilloche) self.drawGuilloche();
    });
  },

  /**
   * 官方 `$('#certG').innerHTML = guilloche(720, 420)`：
   * 小程序画不了内联 SVG ⇒ 用**同一套公式**画到 canvas 上（官方 idcard.js 同样做法）。
   */
  drawGuilloche: function () {
    var dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 0) || 2;
    wx.createSelectorQuery().in(this).select('#certG')
      .fields({node: true, size: true})
      .exec(function (res) {
        var r = res && res[0];
        if (!r || !r.node || !r.width || !r.height) return;
        var canvas = r.node;
        var ctx = canvas.getContext('2d');
        canvas.width = Math.max(1, Math.round(r.width * dpr));
        canvas.height = Math.max(1, Math.round(r.height * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, r.width, r.height);
        try {
          guilloche.drawGuilloche(ctx, 720, 420, 'rgb(15,110,104)', r.width, r.height);
        } catch (error) {
          /* 底纹画不出来不影响登记卡本身。 */
        }
      });
  },

  /** 开始这一生 ⇒ 先存档，再去人生页。 */
  begin: function () {
    var self = this;
    if (this.data.saving) return Promise.resolve({ok: false, message: '正在存档'});
    this.setData({saving: true});
    return session.save().then(function (result) {
      self.setData({saving: false});
      if (!result.ok) {
        wx.showModal({title: '没能存下档', content: result.message, showCancel: false});
        return result;
      }
      wx.navigateTo({url: '/subpkg/xianxia/pages/life/life'});
      return result;
    });
  },

  /** 再抽一次。 */
  again: function () {
    this.startRoll();
  },
});
