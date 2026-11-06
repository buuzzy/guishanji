/**
 * storage.js — 修仙存档层（`xianxia.v1.*` 命名空间）
 * ============================================================================
 *
 * 这个文件为什么在**主包**（`miniprogram/bridge/`）而不在分包里
 * -------------------------------------------------------------
 * 微信小程序的规矩：**主包不能同步引用分包代码**（分包代码要先下载下来才能用），
 * 反过来「分包可以引用主包」是可以的。
 * ⇒ 凡是**主包与分包都要用**的东西，一律放主包：
 *   · 主包的首页（`pages/home/home`）要列存档清单（读这一层）；
 *   · 分包的人生页（`subpkg/xianxia/pages/life/life`）要写存档（也用这一层）。
 * 而**只有分包才用**的东西（规则引擎、会话、视图模型）留在分包里
 * —— 引擎有 1.7 MB，放主包会让主包逼近 2 MB 上限。
 *
 * 为什么不能直接搬官方那套
 * ----------------------
 * 官方人生用的是 `one8b.*` / `o8b.*`（app.js 直写 / 引擎适配层），
 * 并且写入前要过 `content-retirement.cleanRaw`（退役内容清洗）。
 * 修仙是**另一个玩法**、另一套数据形态 ⇒
 *   · 键必须完全分开（一个都不能碰官方的）；
 *   · 不参与退役清洗（修仙不是要退役的内容）。
 *
 * 为什么不能直接搬 HTML 端那个 AdventureStore
 * ------------------------------------------
 * HTML 端是「单键整档」：`shanhai.adventure.v01` 存一整份 JSON，上限 3 MiB。
 * 微信的规则是**单键 1 MB、全部缓存合计 10 MB** ⇒ 整档塞一个键迟早撞上限，
 * 而且一个键坏了整档都没了。
 * ⇒ 这里改成**分片 + 双 manifest 槽**。
 *
 * 存档协议（顺序不可换）
 * ----------------------
 *   1. 校验状态（引擎的 validateRun）；
 *   2. 写**新一代**的全部分片；
 *   3. 逐片读回，核对字节数与 SHA-256；
 *   4. 把 manifest 写到**另一个**槽（两个槽交替）；
 *   5. 读回 manifest 核对；
 *   6. 以上全过 ⇒ 才算「已保存」。
 * 失败时：**保留旧 manifest 与旧代**（绝不先删旧档腾空间），
 * 界面明确提示「保存失败，可导出/归档」。
 *
 * 读回来时选**revision 大且全部分片都在、哈希都对**的那个槽；
 * 另一个槽坏了也不影响 —— 这就是「双槽」的意义。
 *
 * 命名空间
 * --------
 *   xianxia.v1.manifest.a / xianxia.v1.manifest.b   两个交替的 manifest 槽
 *   xianxia.v1.life.<id>.<gen>.<part>                人生分片
 *
 * ⚠ **绝不写官方键**（scripts/test-xianxia-storage.mjs 会逐字节比对官方键原文）。
 */
'use strict';

var hashUtil = require('./hash.js');

var NAMESPACE = 'xianxia.v1.';
var MANIFEST_SLOTS = ['a', 'b'];
/** 单个分片的目标大小（UTF-8 字节）。保守值，不是微信的硬限制。 */
var SHARD_TARGET = 512 * 1024;
/** 每段人生保留几代（当前代 + 上一代可恢复备份）。 */
var KEEP_GENERATIONS = 2;

/** 存档层自己的错误类型（code 供界面判断该显示什么话）。 */
function StorageError(code, message) {
  var error = new Error(message);
  error.name = 'XianxiaStorageError';
  error.code = code;
  return error;
}

/** 默认用 wx 的同步存储；测试时可以注入假的。 */
function wxStorage() {
  return {
    get: function (key) {
      try {
        var value = wx.getStorageSync(key);
        return value === '' || value === undefined ? null : value;
      } catch (error) {
        throw StorageError('unavailable', '本机存储读不出来：' + (error && error.message));
      }
    },
    set: function (key, value) {
      try {
        wx.setStorageSync(key, value);
      } catch (error) {
        var quota = error && (error.name === 'QuotaExceededError' || /exceed|quota/i.test(error.errMsg || ''));
        throw StorageError(quota ? 'quota' : 'unavailable', quota ? '本机存储空间不够了。' : '本机存储写不进去：' + (error && error.message));
      }
    },
    remove: function (key) {
      try {
        wx.removeStorageSync(key);
      } catch (error) {
        /* 删不掉不致命：留着也只是占一点空间。 */
      }
    },
    keys: function () {
      try {
        return (wx.getStorageInfoSync() || {}).keys || [];
      } catch (error) {
        return [];
      }
    },
  };
}

/**
 * 建一个存档层。
 * @param {{storage?:object, namespace?:string, now?:function, rulesVersion?:number,
 *          supportedVersions?:number[]}} [opts]
 */
function createStorage(opts) {
  opts = opts || {};
  var storage = opts.storage || wxStorage();
  var namespace = opts.namespace || NAMESPACE;
  var now = opts.now || function () { return Date.now(); };
  /* 新人生用当前规则版本（12）。 */
  var rulesVersion = opts.rulesVersion || 12;
  /**
   * **能读的旧版本**。
   * ⚠ 规则升版不等于旧人生作废：引擎里每一版的执行器都保留着，
   *   旧存档读回来后**继续按它自己那一版跑**（实测：第 8 版的存档
   *   在第 12 版引擎里校验通过、还能继续推进）。
   *   ⇒ 清单里的 rulesVersion 只是「这份清单是用哪一版写的」，
   *   读的时候两个都认；每段人生真正的版本在它自己的状态里。
   */
  var supportedVersions = opts.supportedVersions || [8, 12];

  var manifestKey = function (slot) { return namespace + 'manifest.' + slot; };
  var shardKey = function (id, generation, part) {
    return namespace + 'life.' + id + '.' + generation + '.' + part;
  };

  /**
   * 把底层存储抛出来的错**归一化**成带 code 的错误。
   * ⚠ 为什么要放在这里而不是只在 wx 适配层：
   *   配额爆掉这件事，各家存储的报错方式不一样
   *   （wx 是 errMsg「exceed storage max size」，别的实现可能直接抛 QuotaExceededError）。
   *   归一化放在这一层 ⇒ 无论底层怎么报错，界面拿到的都是同一套 code。
   */
  function normalize(error) {
    if (error && error.code && error.name === 'XianxiaStorageError') return error;
    var message = error && (error.message || error.errMsg) ? (error.message || error.errMsg) : '本机存储出了状况。';
    var quota = /quota|exceed|space|存储空间|额度/i.test(message) ||
      (error && error.name === 'QuotaExceededError');
    return StorageError(quota ? 'quota' : 'unavailable', quota ? '本机存储空间不够了。' : message);
  }

  /** 全部写入串行排队（避免两个保存交错）。 */
  var queue = Promise.resolve();
  function enqueue(task) {
    var result = queue.then(task, task);
    /* 失败不能卡住后面的写入。 */
    queue = result.then(function () {}, function () {});
    return result;
  }

  /* ───────────────────────────────── manifest ── */

  function readManifest(slot) {
    var raw = storage.get(manifestKey(slot));
    if (!raw) return null;
    try {
      var doc = JSON.parse(raw);
      /* ⚠ 旧清单（rulesVersion 8）**照样要能读** ⇒ 只检查「是不是我们认得的版本」，
       *   不检查「是不是当前版本」。 */
      if (!doc || supportedVersions.indexOf(doc.rulesVersion) < 0 || !Array.isArray(doc.lives)) return null;
      return doc;
    } catch (error) {
      return null;
    }
  }

  /** 两个槽里挑「revision 大且分片齐全」的那一个。 */
  function pickManifest() {
    var slots = MANIFEST_SLOTS.map(readManifest).filter(Boolean);
    if (!slots.length) return null;
    slots.sort(function (a, b) { return (b.revision || 0) - (a.revision || 0); });
    for (var i = 0; i < slots.length; i++) {
      if (allShardsIntact(slots[i])) return slots[i];
    }
    return slots[0];
  }

  function allShardsIntact(manifest) {
    for (var i = 0; i < manifest.lives.length; i++) {
      var life = manifest.lives[i];
      for (var j = 0; j < life.shards.length; j++) {
        var shard = life.shards[j];
        var raw = storage.get(shard.key);
        if (raw === null) return false;
        if (hashUtil.utf8Length(raw) !== shard.bytes) return false;
        if (hashUtil.sha256Hex(raw) !== shard.hash) return false;
      }
    }
    return true;
  }

  /* ───────────────────────────────── 分片 ── */

  /** 把整份 JSON 切成不超过 SHARD_TARGET 的片段。 */
  function splitText(text) {
    if (hashUtil.utf8Length(text) <= SHARD_TARGET) return [text];
    var pieces = [];
    var current = '';
    var currentBytes = 0;
    /* 按字符切，避免把代理对/组合字符劈开。 */
    var chars = Array.from(text);
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      var size = hashUtil.utf8Length(ch);
      if (currentBytes + size > SHARD_TARGET && current) {
        pieces.push(current);
        current = '';
        currentBytes = 0;
      }
      current += ch;
      currentBytes += size;
    }
    if (current) pieces.push(current);
    return pieces;
  }

  /* ───────────────────────────────── 读 ── */

  /** 读回一段人生（分片拼回 + 校验）。 */
  function readLife(id) {
    var manifest = pickManifest();
    if (!manifest) return null;
    var entry = null;
    for (var i = 0; i < manifest.lives.length; i++) {
      if (manifest.lives[i].id === id) { entry = manifest.lives[i]; break; }
    }
    if (!entry) return null;
    var text = '';
    for (var j = 0; j < entry.shards.length; j++) {
      var raw = storage.get(entry.shards[j].key);
      if (raw === null) return null;
      if (hashUtil.sha256Hex(raw) !== entry.shards[j].hash) return null;
      text += raw;
    }
    try {
      var state = JSON.parse(text);
      /* 每段人生**自己那一版**才算数：认不出来的版本直接不读，
       *   免得用错执行器跑出一段说不清的人生。 */
      var own = state && state.life && state.life.cultivation
        ? state.life.cultivation.rulesVersion : null;
      if (own === null || supportedVersions.indexOf(own) < 0) return null;
      return state;
    } catch (error) {
      return null;
    }
  }

  /** 往期人生清单（只读 manifest 里的摘要，不解分片）。 */
  function listLives() {
    var manifest = pickManifest();
    if (!manifest) return [];
    return manifest.lives.map(function (life) {
      return {
        id: life.id,
        generation: life.generation,
        phase: life.phase,
        name: life.name,
        realm: life.realm,
        age: life.age,
        months: life.months,
        rulesVersion: life.rulesVersion,
        updatedAt: life.updatedAt,
      };
    });
  }

  function activeId() {
    var manifest = pickManifest();
    return manifest ? manifest.activeId : null;
  }

  /* ───────────────────────────────── 写 ── */

  /**
   * 保存一段人生。返回 {revision, generation}。
   * 失败抛 StorageError（code: quota / readback / invalid / unavailable）。
   */
  function save(run, validate) {
    return enqueue(function () {
      if (typeof validate === 'function') validate(run);
      var text = JSON.stringify(run);
      /* 清单读不出来（但确实存在字节）⇒ **停止写入**：
         否则会把「清单坏了」变成「人生索引丢了」，而旧分片还躺在盘上没人认领。 */
      var manifestBytesExist =
        storage.get(manifestKey('a')) !== null || storage.get(manifestKey('b')) !== null;
      var manifest = pickManifest();
      if (!manifest && manifestBytesExist) {
        throw StorageError('corrupt', '存档清单读不出来，已停止写入，原文没有被动过。');
      }
      if (!manifest) {
        manifest = {revision: 0, rulesVersion: rulesVersion, activeId: null, lives: [], updatedAt: 0};
      }

      var id = run.id;
      var previous = null;
      for (var i = 0; i < manifest.lives.length; i++) {
        if (manifest.lives[i].id === id) { previous = manifest.lives[i]; break; }
      }
      var generation = previous ? previous.generation + 1 : 1;
      var pieces = splitText(text);

      /* ② 写新一代的全部分片。 */
      var shards = [];
      for (var p = 0; p < pieces.length; p++) {
        var key = shardKey(id, generation, p);
        try {
          storage.set(key, pieces[p]);
        } catch (error) {
          throw normalize(error);
        }
        shards.push({key: key, bytes: hashUtil.utf8Length(pieces[p]), hash: hashUtil.sha256Hex(pieces[p])});
      }

      /* ③ 逐片读回核对。 */
      for (var q = 0; q < shards.length; q++) {
        var raw = storage.get(shards[q].key);
        if (raw === null) throw StorageError('readback', '刚写进去的人生读不回来。');
        if (hashUtil.utf8Length(raw) !== shards[q].bytes || hashUtil.sha256Hex(raw) !== shards[q].hash) {
          throw StorageError('readback', '刚写进去的人生读回来对不上。');
        }
      }

      /* 新的 manifest。 */
      var lives = manifest.lives.filter(function (life) { return life.id !== id; });
      lives.push({
        id: id,
        generation: generation,
        shards: shards,
        bytes: hashUtil.utf8Length(text),
        hash: hashUtil.sha256Hex(text),
        phase: run.phase,
        name: run.player && run.player.name,
        realm: run.player && run.player.realm,
        age: Math.floor(((run.birth && run.birth.startAge) || 16) + run.month / 12),
        months: run.month,
        /* 这段人生**自己那一版**规则（8 的旧档就是 8）—— 读回来时按它执行。 */
        rulesVersion: (run.life && run.life.cultivation && run.life.cultivation.rulesVersion) || rulesVersion,
        updatedAt: now(),
      });
      var next = {
        revision: (manifest.revision || 0) + 1,
        rulesVersion: rulesVersion,
        activeId: id,
        lives: lives,
        updatedAt: now(),
      };

      /* ④ 写到另一个槽。 */
      var slot = next.revision % 2 === 0 ? 'a' : 'b';
      var manifestRaw = JSON.stringify(next);
      try {
        storage.set(manifestKey(slot), manifestRaw);
      } catch (error) {
        throw normalize(error);
      }

      /* ⑤ 读回 manifest 核对。 */
      var readBack = storage.get(manifestKey(slot));
      if (readBack !== manifestRaw) throw StorageError('readback', '存档清单读回来对不上。');

      /* ⑥ 成功之后才回收旧代：只删「不是当前代、也不是上一代」的。 */
      collectGarbage(id, generation);

      return {revision: next.revision, generation: generation};
    });
  }

  /** 删掉太老的分片（保留当前代 + 上一代备份）。 */
  function collectGarbage(id, generation) {
    var keys = storage.keys();
    var prefix = namespace + 'life.' + id + '.';
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key.indexOf(prefix) !== 0) continue;
      var rest = key.slice(prefix.length);
      var dot = rest.indexOf('.');
      var gen = parseInt(rest.slice(0, dot), 10);
      if (!isFinite(gen)) continue;
      if (gen < generation - (KEEP_GENERATIONS - 1)) storage.remove(key);
    }
  }

  /** 删除一段人生（连它的所有分片）。 */
  function removeLife(id) {
    return enqueue(function () {
      var manifest = pickManifest();
      if (!manifest) return false;
      var lives = manifest.lives.filter(function (life) { return life.id !== id; });
      if (lives.length === manifest.lives.length) return false;
      var next = {
        revision: (manifest.revision || 0) + 1,
        rulesVersion: rulesVersion,
        activeId: manifest.activeId === id ? null : manifest.activeId,
        lives: lives,
        updatedAt: now(),
      };
      var slot = next.revision % 2 === 0 ? 'a' : 'b';
      try {
        storage.set(manifestKey(slot), JSON.stringify(next));
      } catch (error) {
        throw normalize(error);
      }
      var keys = storage.keys();
      var prefix = namespace + 'life.' + id + '.';
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf(prefix) === 0) storage.remove(keys[i]);
      }
      return true;
    });
  }

  return {
    namespace: namespace,
    save: save,
    readLife: readLife,
    listLives: listLives,
    activeId: activeId,
    removeLife: removeLife,
    pickManifest: pickManifest,
    manifestKey: manifestKey,
    shardKey: shardKey,
  };
}

module.exports = {
  createStorage: createStorage,
  StorageError: StorageError,
  NAMESPACE: NAMESPACE,
  SHARD_TARGET: SHARD_TARGET,
  KEEP_GENERATIONS: KEEP_GENERATIONS,
};
