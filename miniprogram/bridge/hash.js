/**
 * hash.js — 纯 JS 的 SHA-256（小程序端没有 crypto API）
 * ============================================================================
 *
 * 为什么需要它
 * ------------
 * 存档协议要求「写完读回、核对字节数与哈希」才算保存成功（见 bridge/storage.js）。
 *
 * ⚠ 这个文件在**主包** `miniprogram/bridge/`：主包的首页与分包里的人生页
 *   都要用它（微信规矩：主包不能同步引用分包代码，分包却可以引用主包）。
 * 微信小程序**没有** crypto.subtle，也没有 Node 的 crypto ⇒ 必须自带实现。
 *
 * 为什么用 SHA-256 而不是更简单的校验和
 * ------------------------------------
 * 这个哈希的用途是**发现损坏**（写了一半、读回被截断、缓存被别的进程改写）。
 * 32 位校验和在这种场景其实够用，但 SHA-256 有两个好处：
 *   ① 实现是确定的、可被 Node 的 crypto 直接验证 ⇒ 门禁能证明它算得对；
 *   ② 碰撞概率可以忽略，将来若要拿它做「同一份人生是不是同一份」的判断也不用换。
 *
 * ⚠ 这份实现**必须**被 scripts/test-xianxia-storage.mjs 用 Node 的 crypto 对拍
 *   （随机输入 × 多组，比对 hex 逐字相同）—— 门禁会抓住任何一处写错。
 */
'use strict';

var K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function utf8Bytes(text) {
  var s = String(text == null ? '' : text);
  var bytes = [];
  for (var i = 0; i < s.length; i++) {
    var code = s.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < s.length) {
      var low = s.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        var point = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        bytes.push(0xf0 | (point >> 18), 0x80 | ((point >> 12) & 0x3f), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
        i++;
      } else {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      }
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

/** UTF-8 字节长度（不用 TextEncoder —— 小程序端那个是长度占位实现）。 */
function utf8Length(text) {
  return utf8Bytes(text).length;
}

/**
 * SHA-256，返回小写 hex。
 * @param {string} text
 * @returns {string} 64 位 hex
 */
function sha256Hex(text) {
  var bytes = utf8Bytes(text);
  var bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  /* 长度用 64 位大端；JS 的位运算只有 32 位，所以拆成高/低 32 位。 */
  var high = Math.floor(bitLength / 0x100000000);
  var low = bitLength >>> 0;
  bytes.push((high >>> 24) & 0xff, (high >>> 16) & 0xff, (high >>> 8) & 0xff, high & 0xff);
  bytes.push((low >>> 24) & 0xff, (low >>> 16) & 0xff, (low >>> 8) & 0xff, low & 0xff);

  var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  var h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  var w = new Array(64);
  for (var offset = 0; offset < bytes.length; offset += 64) {
    var i;
    for (i = 0; i < 16; i++) {
      w[i] = ((bytes[offset + i * 4] << 24) | (bytes[offset + i * 4 + 1] << 16) |
        (bytes[offset + i * 4 + 2] << 8) | bytes[offset + i * 4 + 3]) >>> 0;
    }
    for (i = 16; i < 64; i++) {
      var s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
      var s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (i = 0; i < 64; i++) {
      var S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      var ch = ((e & f) ^ (~e & g)) >>> 0;
      var temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      var S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      var maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      var temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e;
      e = (d + temp1) >>> 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(toHex).join('');
}

function rotr(value, bits) {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

function toHex(value) {
  var text = (value >>> 0).toString(16);
  while (text.length < 8) text = '0' + text;
  return text;
}

module.exports = {sha256Hex, utf8Bytes, utf8Length};
