const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const Daily = require('../daily.js');
function harness({open = true} = {}) {
  const account = C.emptyAccount();
  account.gmailBaseUrl = 'https://mail.google.com/mail/u/0/';
  const data = {'account:me@example.com': account};
  const tabs = new Map(open ? [[1, {id: 1, windowId: 1, active: true, url: account.gmailBaseUrl + '#inbox'}]] : []);
  const created = []; const removed = []; const alarms = new Map();
  let time = 1793635200000; let counter = 1; let chain = Promise.resolve();
  const enqueue = action => { const task = chain.then(action); chain = task.catch(() => {}); return task; };
  const chrome = {
    storage: {local: {
      get: async key => key === null ? structuredClone(data) : {[key]: structuredClone(data[key])},
      set: async values => Object.assign(data, structuredClone(values)),
      remove: async key => { delete data[key]; }
    }},
    alarms: {create: async (name, options) => alarms.set(name, options), clear: async name => alarms.delete(name)},
    tabs: {
      query: async () => [...tabs.values()],
      create: async options => { const tab = {id: ++counter, ...options}; created.push(tab); tabs.set(tab.id, tab); return tab; },
      get: async id => { if (!tabs.has(id)) throw Error('No such tab'); return tabs.get(id); },
      remove: async id => { removed.push(id); tabs.delete(id); },
      sendMessage: async () => ({ok: true})
    }
  };
  const options = {chrome, C, enqueue, now: () => time, makeId: () => `job-${counter + 1}`};
  const daily = Daily.create(options);
  const flush = async () => { for (let i = 0; i < 8; i++) { await chain; await Promise.resolve(); } };
  const kick = async () => { daily.request(); await flush(); };
  return {data, tabs, created, removed, alarms, daily, options, flush, kick, now: () => time, advance: ms => { time += ms; }};
}
test('creates an inactive helper and leaves the original Gmail tab untouched', async () => {
  const h = harness(); await h.kick();
  assert.equal(h.created.length, 1);
  assert.equal(h.created[0].active, false);
  assert.equal(h.tabs.get(1).url, 'https://mail.google.com/mail/u/0/#inbox');
  assert.ok(decodeURIComponent(h.created[0].url).endsWith('#search/in:trash is:unread'));
});
test('coalesces concurrent wakes into one scan', async () => {
  const h = harness();
  for (let i = 0; i < 20; i++) h.daily.request();
  await h.flush(); assert.equal(h.created.length, 1);
});
test('completes once per 24 hours, closes only its own helper, and schedules the next scan', async () => {
  const h = harness(); await h.kick();
  const job = h.data['ud:daily-job'];
  const result = await h.daily.complete('me@example.com', job.tabId, job.id, {added: 4, pages: 2});
  await h.daily.cleanup(result.cleanupJob); await h.kick();
  assert.equal(h.removed[0], job.tabId);
  assert.equal(h.data['account:me@example.com'].daily.lastCompletedAt, h.now());
  assert.equal(h.created.length, 1);
  h.advance(C.DAY - 1); await h.kick(); assert.equal(h.created.length, 1);
  h.advance(1); await h.kick(); assert.equal(h.created.length, 2);
});
test('catches up when Gmail reopens without opening a browser window', async () => {
  const h = harness({open: false}); await h.kick(); assert.equal(h.created.length, 0);
  h.tabs.set(1, {id: 1, active: true, windowId: 1, url: 'https://mail.google.com/mail/u/0/#inbox'});
  await h.kick(); assert.equal(h.created.length, 1);
});
test('both learning switches prevent an automatic scan', async () => {
  for (const key of ['learning', 'dailyLearning']) {
    const h = harness(); h.data['account:me@example.com'].settings[key] = false; await h.kick();
    assert.equal(h.created.length, 0);
  }
});
test('persisted jobs survive a service-worker restart without duplicate tabs', async () => {
  const h = harness(); await h.kick();
  const resumed = Daily.create(h.options); resumed.request(); await h.flush();
  assert.equal(h.created.length, 1);
  h.advance(4 * 60 * 1000); resumed.request(); await h.flush();
  assert.equal(h.data['ud:daily-job'], undefined);
  assert.equal(h.removed.length, 1);
  assert.equal(h.data['account:me@example.com'].daily.status, 'retrying');
});
test('activating the helper cancels the scan and preserves the user’s tab', async () => {
  const h = harness(); await h.kick(); const job = h.data['ud:daily-job'];
  h.tabs.get(job.tabId).active = true;
  await h.daily.cancelForTab(job.tabId, 'interrupted'); await h.daily.cleanup(job);
  assert.equal(h.data['ud:daily-job'], undefined);
  assert.equal(h.removed.length, 0);
});
test('navigating the helper to user mail cancels and never closes that view', async () => {
  const h = harness(); await h.kick(); const job = h.data['ud:daily-job'];
  const url = job.base + '#inbox'; h.tabs.get(job.tabId).url = url;
  await h.daily.cancelNavigated(job.tabId, url); await h.daily.cleanup(job);
  assert.equal(h.data['ud:daily-job'], undefined); assert.equal(h.removed.length, 0);
});
test('wrong accounts and invalid leases cannot commit automatic scan results', async () => {
  const h = harness(); await h.kick(); const job = h.data['ud:daily-job'];
  await assert.rejects(h.daily.complete('other@example.com', job.tabId, job.id, {}));
  await assert.rejects(h.daily.complete('me@example.com', 999, job.id, {}));
  const result = await h.daily.context('other@example.com', job.tabId);
  assert.equal(result.cancelled, true);
  assert.equal(h.data['account:other@example.com'], undefined);
});
test('failed scans are retried later and never count as a completed day', async () => {
  const h = harness(); await h.kick(); const job = h.data['ud:daily-job'];
  await h.daily.complete('me@example.com', job.tabId, job.id, {error: true}); await h.kick();
  assert.equal(h.data['account:me@example.com'].daily.lastCompletedAt, 0);
  assert.equal(h.created.length, 1);
  h.advance(60 * 60 * 1000); await h.kick(); assert.equal(h.created.length, 2);
});
test('a signed-out redirect is cleaned up without touching a user-activated tab', async () => {
  const h = harness(); await h.kick(); const job = h.data['ud:daily-job'];
  delete h.tabs.get(job.tabId).url;
  await h.daily.cleanup(job);
  assert.equal(h.removed.length, 1);
  const second = harness(); await second.kick(); const protectedJob = second.data['ud:daily-job'];
  second.daily.protectTab(protectedJob.tabId); delete second.tabs.get(protectedJob.tabId).url;
  await second.daily.cleanup(protectedJob);
  assert.equal(second.removed.length, 0);
});
