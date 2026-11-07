/**
 * 五轴能力图（canvas 组件）
 * ============================================================================
 *
 * 画的是上游 `apps/preview/life-panels.js` 里 `abilityRadar()` 那张五边形图。
 * 算法在 `art/radar.js`（移植），那边有「与上游逐笔比对」的门禁守着。
 */
var radar = require('../../art/radar.js');

Component({
  properties: {
    /** 玩家状态（读 insight / courage / empathy / mind / constitution） */
    player: { type: Object, value: null },
    /** 'light' | 'dark' */
    theme: { type: String, value: 'light' },
  },

  data: { ready: false },

  lifetimes: {
    ready: function () {
      this.setupCanvas();
    },
  },

  observers: {
    'player, theme': function () {
      if (this._ready) this.render();
    },
  },

  methods: {
    setupCanvas: function () {
      var self = this;
      var q = this.createSelectorQuery();
      q.select('#cv')
        .fields({ node: true, size: true })
        .exec(function (res) {
          if (!res || !res[0] || !res[0].node) return;
          var canvas = res[0].node;
          var ctx = canvas.getContext('2d');
          var dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 0) || 2;
          var displayWidth = res[0].width || 240;
          var displayHeight = res[0].height || 226;
          var scale = (displayWidth * dpr) / radar.W;
          canvas.width = Math.round(radar.W * scale);
          canvas.height = Math.round(radar.H * scale);
          ctx.scale(scale, scale);
          self._canvas = canvas;
          self._ctx = ctx;
          /* 画布实际显示宽（CSS px）⇒ 字号按它换算，
           * 让屏幕上的字号等于上游 SVG 的实际字号（12.1px / 10.9px）。 */
          self._width = displayWidth;
          self._ready = true;
          self.render();
        });
    },

    render: function () {
      if (!this._ready) return;
      var player = this.data.player;
      if (!player) return;
      var key = radar.KEYS.map(function (k) { return player[k]; }).join(',');
      if (key === this._key) return;
      this._key = key;
      var dark = this.data.theme === 'dark';
      try {
        radar.drawRadar(this._ctx, player, {
          grid: dark ? 'rgba(190,215,208,0.22)' : 'rgba(80,110,105,0.22)',
          shape: dark ? '#4cc0af' : '#0f6e68',
          fill: dark ? 'rgba(76,192,175,0.18)' : 'rgba(15,110,104,0.18)',
          label: dark ? '#cbd5d1' : '#3d4a4d',
          value: dark ? '#a3b2af' : '#5f6e72',
          width: this._width,
        });
        this._ok = true;
      } catch (error) {
        this._ok = false;
        console.warn('[xianxia-radar] 能力图画不出来：', (error && error.message) || error);
      }
    },
  },
});
