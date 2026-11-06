/**
 * 修仙像素场景（canvas 组件）
 * ============================================================================
 *
 * 画的是上游 `apps/preview/cultivation-pixel.js` 那套 192×108 像素画面，
 * 算法在 `art/scene.js`（移植），那边有「与上游逐笔比对」的门禁守着。
 *
 * 两件小事：
 *   ① **不重画**：内容没变就不重画（口径照官方 px-scene 的 sceneKey）。
 *      否则人生页每 250 ms 触发一次 ⇒ 每帧重刷几千个色块，真机直接卡。
 *   ② **默认静态**：动画默认关。要看动效就把 animate 打开
 *      （每 200 ms 一帧，且同样只在内容变过时重画）。
 */
var scene = require('../../art/scene.js');
var session = require('../../bridge/session.js');

Component({
  properties: {
    /** 版本号：页面每次刷新视图时 +1 ⇒ 组件知道该重画了。
     *  ⚠ **不把整份 run 传进来**：run 里有几百条日志，
     *    每次 setData 传过去就是几十 KB 的序列化开销，真机直接掉帧。
     *    组件自己 require 会话模块拿当前人生（同一份模块实例）。 */
    version: { type: Number, value: 0 },
    /** 'light' | 'dark' */
    theme: { type: String, value: 'light' },
    /** 是否播动效 */
    animate: { type: Boolean, value: false },
  },

  data: { ready: false },

  lifetimes: {
    ready: function () {
      this.setupCanvas();
    },
    detached: function () {
      this.stopTimer();
    },
  },

  observers: {
    'version, theme': function () {
      if (this._ready) this.render();
    },
    animate: function (value) {
      if (value) this.startTimer();
      else this.stopTimer();
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
          var displayHeight = res[0].height || 180;
          /* 逻辑画布 192×108 ⇒ 按显示宽度等比放大，再乘上屏幕像素比。 */
          var scale = (displayWidth * dpr) / scene.W;
          canvas.width = Math.round(scene.W * scale);
          canvas.height = Math.round(scene.H * scale);
          ctx.scale(scale, scale);
          ctx.imageSmoothingEnabled = false;
          self._canvas = canvas;
          self._ctx = ctx;
          self._ready = true;
          self.render();
        });
    },

    /** 画面指纹：内容没变就不重画。 */
    sceneKey: function () {
      var run = session.run;
      var theme = this.data.theme || '';
      if (!run) return theme + '|none';
      var cultivation = run.life ? run.life.cultivation : null;
      var people = [];
      if (run.life) {
        var companions = [];
        try {
          companions = require('../../runtime/engine.js').presentPeople(run) || [];
        } catch (error) {
          companions = [];
        }
        for (var i = 0; i < companions.length && i < 3; i++) {
          people.push([companions[i].sex, Math.min(80, Math.floor((companions[i].age || 0) / 3))]);
        }
      }
      return [
        theme,
        run.month,
        run.player.realm,
        run.player.stones,
        cultivation ? cultivation.activity : '',
        cultivation ? cultivation.continent : '',
        cultivation ? cultivation.detained ? 1 : 0 : 0,
        people,
      ].join('|');
    },

    render: function () {
      if (!this._ready) return;
      var key = this.sceneKey();
      if (key === this._key) return;
      this._key = key;
      var ctx = this._ctx;
      var model = scene.buildModel(session.run, this.data.theme);
      if (!model) return;
      try {
        /* 四层画布合成一张：按 sky → back → mid → front 的原顺序画。 */
        scene.drawScene({ sky: ctx, back: ctx, mid: ctx, front: ctx }, model, Date.now(), !this.data.animate);
        this._ok = true;
      } catch (error) {
        this._ok = false;
        console.warn('[xianxia-scene] 画面画不出来：', (error && error.message) || error);
      }
    },

    startTimer: function () {
      if (this._timer) return;
      var self = this;
      this._timer = setInterval(function () {
        if (!self._ready) return;
        self._key = null;
        self.render();
      }, 200);
    },

    stopTimer: function () {
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    },
  },
});
