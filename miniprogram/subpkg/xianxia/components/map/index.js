/**
 * 点阵大陆地图（canvas 组件）
 * ============================================================================
 *
 * 画的是上游 `apps/preview/continent-atlas.js` 那张点阵地图（960×624 的逻辑坐标）。
 * 算法在 `art/atlas.js`（移植），那边有「与上游逐笔比对」的门禁守着。
 *
 * 画布实际像素 = 逻辑坐标 × 显示比例 ⇒ 字与点都按显示宽度缩放，手机上看得清。
 */
var atlas = require('../../art/atlas.js');
var session = require('../../bridge/session.js');

Component({
  properties: {
    /** 版本号：页面每次刷新视图时 +1 ⇒ 组件知道该重画了。
     *  ⚠ 不把整份 run 传进来（理由同 scene 组件）。 */
    version: { type: Number, value: 0 },
    /** 'light' | 'dark' */
    theme: { type: String, value: 'light' },
    /** 放大地图（上游 .wmap.zoomed） */
    zoom: { type: Boolean, value: false },
  },

  data: { ready: false },

  lifetimes: {
    ready: function () {
      this.setupCanvas();
    },
  },

  observers: {
    'version, theme': function () {
      if (this._ready) this.render();
    },
    /** 放大/恢复 ⇒ 画布的显示尺寸变了 ⇒ 要重新量一次并重画。 */
    zoom: function () {
      if (this._ready) this.setupCanvas();
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
          var displayWidth = res[0].width || 320;
          var displayHeight = res[0].height || 208;
          var scale = (displayWidth * dpr) / atlas.W;
          canvas.width = Math.round(atlas.W * scale);
          canvas.height = Math.round(atlas.H * scale);
          ctx.scale(scale, scale);
          self._canvas = canvas;
          self._ctx = ctx;
          self._displayWidth = displayWidth;
          self._ready = true;
          /* 画布刚重建（尺寸可能变了）⇒ 一定要重画，别被 _key 的去重挡掉。 */
          self._key = null;
          self.render();
        });
    },

    render: function () {
      if (!this._ready) return;
      var run = session.run;
      var key = JSON.stringify([
        this.data.theme || '',
        run ? run.month : -1,
        run && run.life && run.life.cultivation ? run.life.cultivation.continent : '',
        run && run.life && run.life.cultivation ? run.life.cultivation.visited : [],
        run && run.life && run.life.cultivation ? run.life.cultivation.closed : [],
        run && run.life && run.life.cultivation ? run.life.cultivation.routes : [],
      ]);
      if (key === this._key) return;
      this._key = key;
      try {
        atlas.drawMap(this._ctx, run, this.data.theme, this._displayWidth);
        this._ok = true;
      } catch (error) {
        this._ok = false;
        console.warn('[xianxia-map] 地图画不出来：', (error && error.message) || error);
      }
    },
  },
});
