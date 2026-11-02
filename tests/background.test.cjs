const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
function harness() {
  const data = {};
  let listener;
  let failWrite = false;
  const context = vm.createContext({structuredClone, console, chrome: {
    storage: {local: {
      get: async key => { await new Promise(r => setTimeout(r, 1)); return {[key]: structuredClone(data[key])}; },
      set: async values => { if (failWrite) { failWrite = false; throw new Error('Disk full'); } Object.assign(data, structuredClone(values)); }
    }},
    runtime: {onMessage: {addListener: callback => { listener = callback; }}}
  }});
  context.importScripts = filename => vm.runInContext(fs.readFileSync(path.join(root, filename), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), context);
  const send = (type, payload = {}, sender = {tab: {id: 1}, url: 'https://mail.google.com/mail/u/0/'}) => new Promise(resolve => listener({type: `ud:${type}`, account: 'me@example.com', ...payload}, sender, resolve));
  return {send, data, fail: () => { failWrite = true; }};
}
test('isolates data by stable Gmail email rather than /u/ index', async () => {
  const h = harness();
  await h.send('rule', {email: 'offers@example.com', mode: 'always'});
  const second = await h.send('get', {account: 'other@example.com'});
  assert.equal(Object.keys(second.account.senders).length, 0);
  assert.equal(Object.keys((await h.send('get')).account.senders).length, 1);
});
test('serializes concurrent observations from multiple tabs', async () => {
  const h = harness();
  await Promise.all(Array.from({length: 20}, (_, i) => h.send('events', {events: [{id: String(i), email: 'offers@example.com', type: 'deleted'}]})));
  assert.equal((await h.send('get')).account.senders['offers@example.com'].deleted, 20);
});
test('a storage failure does not poison the operation queue', async () => {
  const h = harness(); h.fail();
  assert.equal((await h.send('rule', {email: 'a@example.com', mode: 'always'})).ok, false);
  assert.equal((await h.send('rule', {email: 'b@example.com', mode: 'always'})).ok, true);
});
test('pause learning stops observations', async () => {
  const h = harness();
  await h.send('settings', {settings: {learning: false}});
  const result = await h.send('events', {events: [{id: '1', email: 'offers@example.com', type: 'deleted'}]});
  assert.equal(result.added, 0);
});
test('rejects non-Gmail senders and invalid account identities', async () => {
  const h = harness();
  assert.equal((await h.send('get', {}, {url: 'https://evil.example/', tab: {id: 9}})).ok, false);
  assert.equal((await h.send('get', {account: '__proto__'})).ok, false);
});
test('forgetting clears deduplication history for that sender only', async () => {
  const h = harness();
  await h.send('events', {events: [{id: '1', email: 'a@example.com', type: 'deleted'}, {id: '2', email: 'b@example.com', type: 'deleted'}]});
  const result = await h.send('rule', {email: 'a@example.com', mode: 'forget'});
  assert.equal(Object.keys(result.account.events).length, 1);
  assert.equal(result.account.senders['a@example.com'], undefined);
});
test('reset erases only the requested account', async () => {
  const h = harness();
  await h.send('rule', {email: 'a@example.com', mode: 'always'});
  await h.send('rule', {account: 'other@example.com', email: 'b@example.com', mode: 'always'});
  assert.equal(Object.keys((await h.send('reset')).account.senders).length, 0);
  assert.equal(Object.keys((await h.send('get', {account: 'other@example.com'})).account.senders).length, 1);
});
