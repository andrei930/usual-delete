const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const events = (n, email = 'offers@example.com', type = 'deleted', offset = 0) => Array.from({length: n}, (_, i) => ({id: `${offset + i}`, email, type}));
const trained = n => C.applyEvents(C.emptyAccount(), events(n)).account;

test('requires three distinct unread deleted conversations', () => {
  assert.deepEqual(C.eligibleSenders(trained(2)), []);
  assert.deepEqual(C.eligibleSenders(trained(3)), ['offers@example.com']);
});
test('rescan is idempotent and does not mutate input', () => {
  const account = trained(3);
  const result = C.applyEvents(account, events(3));
  assert.equal(result.added, 0);
  assert.equal(account.senders['offers@example.com'].deleted, 3);
});
test('opening mail lowers confidence and is counted once per conversation', () => {
  const result = C.applyEvents(trained(3), events(1, 'offers@example.com', 'opened'));
  assert.deepEqual(C.eligibleSenders(result.account), []);
  assert.equal(C.applyEvents(result.account, events(1, 'offers@example.com', 'opened')).added, 0);
});
test('90 percent evidence threshold includes its boundary', () => {
  const account = C.applyEvents(trained(9), events(1, 'offers@example.com', 'opened')).account;
  assert.equal(C.eligibleSenders(account).length, 1);
});
test('manual never and always override evidence', () => {
  const account = trained(3);
  account.senders['offers@example.com'].mode = 'never';
  account.senders['new@example.com'] = {mode: 'always', deleted: 0, opened: 12};
  assert.deepEqual(C.eligibleSenders(account), ['new@example.com']);
});
test('higher threshold delays learning', () => {
  const account = trained(3);
  account.settings.threshold = 5;
  assert.deepEqual(C.eligibleSenders(account), []);
});
test('normalizes sender identities and rejects search injection', () => {
  assert.equal(C.normalizeEmail(' Offers+Weekly@Example.COM '), 'offers+weekly@example.com');
  for (const value of ['a@example.com OR from:boss@example.com', 'a@example.com"}', '<a@example.com>', 'nope', null, {}, '__proto__']) assert.equal(C.normalizeEmail(value), null);
});
test('constructs inbox-only unread search with protected-message filters', () => {
  assert.equal(C.buildQuery(trained(3)), 'in:inbox is:unread -is:starred -is:important {from:"offers@example.com"}');
  assert.throws(() => C.buildQuery(C.emptyAccount()), /No learned/);
});
test('refuses to silently truncate a long sender search', () => {
  const account = C.emptyAccount();
  for (let i = 0; i < 400; i++) account.senders[`sender${i}@example.com`] = {mode: 'always'};
  assert.throws(() => C.buildQuery(account), /Too many senders/);
});
test('skips read, starred, important, unknown and mixed-sender rows', () => {
  const row = {email: 'offers@example.com', unread: true, starred: false, important: false, multipleSenders: false};
  const account = trained(3);
  assert.equal(C.isCandidate(row, account), true);
  for (const patch of [{unread: false}, {starred: true}, {important: true}, {multipleSenders: true}, {email: 'boss@example.com'}, {email: null}]) assert.equal(C.isCandidate({...row, ...patch}, account), false);
});
test('rejects malformed observations and keeps only required metadata', () => {
  const result = C.applyEvents(C.emptyAccount(), [{email: 'a@example.com', id: 'x', type: 'deleted', subject: 'secret'}, {email: 'b@example.com', id: '', type: 'deleted'}, {email: 'c@example.com', id: 'x', type: 'archived'}]);
  assert.equal(result.added, 1);
  assert.equal(JSON.stringify(result.account).includes('secret'), false);
  assert.equal(Object.keys(result.account.senders).length, 1);
});
test('events are independent for different senders and evidence types', () => {
  const result = C.applyEvents(C.emptyAccount(), [{id: '1', email: 'a@example.com', type: 'deleted'}, {id: '1', email: 'b@example.com', type: 'deleted'}, {id: '1', email: 'a@example.com', type: 'opened'}]);
  assert.equal(result.added, 3);
});
