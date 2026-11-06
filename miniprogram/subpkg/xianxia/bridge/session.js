/**
 * session.js — 修仙会话：当前这段人生 + 与存档层的连接
 * ============================================================================
 *
 * 这一层是页面与规则之间**唯一**的通道：
 *   · 页面不直接碰引擎（规则在 runtime/engine.js 里，是生成物）；
 *   · 页面不直接碰存档（存档协议在 bridge/storage.js 里）；
 *   · 页面只调这里的动作，然后拿 `view`（视图数据）。
 *
 * 为什么要有这一层
 * ----------------
 * ① **只此一份当前人生**：多个页面（roll / life / past）会来回跳，
 *    如果每个页面各自持有 state，就会出现「人生页改了、往期人生页不知道」的情况。
 * ② **保存时机统一**：引擎里的动作会改状态；什么时候存盘、存盘失败怎么办，
 *    都集中在这里，页面只管调 `save()` 并看返回值。
 * ③ **失败要说人话**：存档层抛的是带 code 的错误，这里翻译成界面能显示的话。
 *
 * ⚠ 与官方人生**完全隔离**：这里不 require 官方引擎，也不碰 `one8b.*` / `o8b.*`。
 */
'use strict';

var engine = require('../runtime/engine.js');
var viewModel = require('./view-model.js');
var storageModule = require('../../../bridge/storage.js');

var run = null;
var listeners = [];
var storage = null;
var idCounter = 0;

/** 存档层实例（第一次用时才建，省得启动就占内存）。 */
function store() {
  if (!storage) storage = storageModule.createStorage();
  return storage;
}

/** 允许测试注入假的存档层。 */
function setStorage(instance) {
  storage = instance;
}

function notify(reason) {
  var snapshot = viewModel.build(run);
  for (var i = 0; i < listeners.length; i++) {
    try {
      listeners[i](snapshot, reason || '', run);
    } catch (error) {
      /* 页面回调出错不许把会话搞坏。 */
    }
  }
}

/**
 * 人生编号：必须是 ASCII（引擎校验 /^[a-zA-Z0-9_-]{1,100}$/）。
 * ⚠ 不用 crypto.randomUUID —— 小程序端没有 crypto，且要保证同一个人生
 *   在多次保存之间编号不变。
 */
function newId() {
  idCounter += 1;
  return 'life-' + Date.now().toString(36) + '-' + idCounter.toString(36);
}

/** 随机种子（中文没问题，种子只要求非空且 ≤80 字）。 */
function newSeed() {
  idCounter += 1;
  return '山海-' + Date.now().toString(36) + '-' + idCounter.toString(36);
}

/* ───────────────────────────────── 生命周期 ── */

/**
 * 随机出生，开一段新人生。
 * @param {{seed?:string, id?:string}} [opts]
 */
function newLife(opts) {
  opts = opts || {};
  var seed = opts.seed || newSeed();
  var id = opts.id || newId();
  run = engine.createRun({seed: seed, id: id});
  notify('new');
  return run;
}

/** 继续某段人生（从存档读回来）。 */
function resume(id) {
  var state = store().readLife(id);
  if (!state) return null;
  try {
    engine.validateRun(state);
  } catch (error) {
    return null;
  }
  run = state;
  notify('resume');
  return run;
}

/** 丢掉当前人生（离开页面时用）。 */
function clear() {
  run = null;
  notify('clear');
}

/* ───────────────────────────────── 动作 ── */

function advance(months) {
  if (!run) return 0;
  var moved = engine.advance(run, months || 1);
  if (moved) notify('advance');
  return moved;
}

function advanceToChoice() {
  if (!run) return 0;
  var moved = engine.advanceToChoice(run);
  if (moved) notify('advance');
  return moved;
}

function options() {
  return run ? engine.options(run) : [];
}

function currentNode() {
  return run ? engine.currentNode(run) : null;
}

function nodeText(node) {
  return run ? engine.nodeText(node, run) : '';
}

/** 选一个选项。返回引擎的结果（result）。 */
function choose(choiceId) {
  if (!run) return null;
  var result = engine.choose(run, choiceId);
  notify('choose');
  return result;
}

function acknowledge() {
  if (!run) return null;
  var result = engine.acknowledge(run);
  notify('acknowledge');
  return result;
}

function setActivity(id) {
  if (!run) return null;
  var result = engine.setActivity(run, id);
  notify('activity');
  return result;
}

function travelTo(id) {
  if (!run) return null;
  var result = engine.travelTo(run, id);
  notify('travel');
  return result;
}

function leaveExpedition() {
  if (!run) return null;
  var result = engine.leaveExpedition(run);
  notify('leave');
  return result;
}

function seekTraining(groundId) {
  if (!run) return null;
  var result = engine.seekTraining(run, groundId);
  notify('training');
  return result;
}

function review() {
  return run ? engine.review(run) : null;
}

/* ───────────────────────────────── 存档 ── */

/**
 * 保存当前人生。
 * @returns {Promise<{ok:boolean, message?:string, code?:string}>}
 */
function save() {
  if (!run) return Promise.resolve({ok: false, message: '还没有人生可以保存。'});
  return store().save(run, engine.validateRun).then(function (result) {
    notify('saved');
    return {ok: true, revision: result.revision, generation: result.generation};
  }).catch(function (error) {
    var code = error && error.code ? error.code : 'unknown';
    var message = error && error.message ? error.message : '保存失败。';
    return {ok: false, code: code, message: message};
  });
}

/** 往期人生清单。 */
function lives() {
  return store().listLives();
}

/**
 * 读回一段人生的**完整状态**（往期人生那一行要显示「N次抉择 · 结局标题」，
 * 清单摘要里没有这两项 ⇒ 得把分片拼回来）。
 */
function readLife(id) {
  if (!id) return null;
  try {
    return store().readLife(id) || null;
  } catch (error) {
    return null;
  }
}

/** 当前人生编号。 */
function currentId() {
  return run ? run.id : null;
}

function onChange(fn) {
  listeners.push(fn);
  return function () {
    var index = listeners.indexOf(fn);
    if (index >= 0) listeners.splice(index, 1);
  };
}

module.exports = {
  engine: engine,
  get run() { return run; },
  get view() { return viewModel.build(run); },
  newLife: newLife,
  resume: resume,
  clear: clear,
  advance: advance,
  advanceToChoice: advanceToChoice,
  options: options,
  currentNode: currentNode,
  nodeText: nodeText,
  choose: choose,
  acknowledge: acknowledge,
  setActivity: setActivity,
  travelTo: travelTo,
  leaveExpedition: leaveExpedition,
  seekTraining: seekTraining,
  review: review,
  save: save,
  lives: lives,
  readLife: readLife,
  currentId: currentId,
  onChange: onChange,
  setStorage: setStorage,
  newId: newId,
  newSeed: newSeed,
};
