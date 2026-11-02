importScripts('core.js', 'daily.js');
const C = globalThis.UsualCore;
let queue = Promise.resolve();
function enqueue(action) {
  const task = queue.then(action);
  queue = task.catch(() => {});
  return task;
}
const daily = globalThis.UsualDaily.create({chrome, C, enqueue});

async function handle(message, sender) {
  if (!sender.tab || !/^https:\/\/mail\.google\.com\//.test(sender.url || '')) throw new Error('Open Gmail to use Usual Delete.');
  const email = C.normalizeEmail(message.account);
  if (!email) throw new Error('Could not identify the active Gmail account. Refresh Gmail and try again.');
  const key = `account:${email}`;
  const stored = await chrome.storage.local.get(key);
  const account = C.hydrateAccount(stored[key]);
  if (message.autoJobId) await daily.validate(email, sender.tab.id, message.autoJobId);
  let next = account;
  let added = 0;
  switch (message.type) {
    case 'ud:auto-context': return {account, ...await daily.context(email, sender.tab.id)};
    case 'ud:auto-complete': return daily.complete(email, sender.tab.id, message.autoJobId, message);
    case 'ud:get': {
      const base = daily.baseUrl(sender.url);
      if (base) account.gmailBaseUrl = base;
      if (JSON.stringify(account) !== JSON.stringify(stored[key])) await chrome.storage.local.set({[key]: account});
      return {account};
    }
    case 'ud:events': {
      if (!account.settings.learning) return {account, added: 0};
      const result = C.applyEvents(account, Array.isArray(message.events) ? message.events : []);
      next = result.account;
      added = result.added;
      if (!added) return {account, added};
      break;
    }
    case 'ud:rule': {
      const address = C.normalizeEmail(message.email);
      if (!address || !['auto', 'always', 'never', 'forget'].includes(message.mode)) throw new Error('Enter a valid, complete sender email address.');
      next = structuredClone(account);
      if (message.mode === 'forget') {
        delete next.senders[address];
        for (const event of Object.keys(next.events)) if (JSON.parse(event)[2] === address) delete next.events[event];
      } else {
        next.senders[address] = {...(next.senders[address] || {deleted: 0, opened: 0, lastSeen: Date.now()}), mode: message.mode};
      }
      break;
    }
    case 'ud:settings': {
      next = structuredClone(account);
      for (const key of ['acrossPages', 'learning', 'dailyLearning']) if (typeof message.settings?.[key] === 'boolean') next.settings[key] = message.settings[key];
      if ([3, 5, 10].includes(message.settings?.threshold)) next.settings.threshold = message.settings.threshold;
      break;
    }
    case 'ud:scan-complete': {
      next = structuredClone(account);
      next.daily = {...next.daily, lastCompletedAt: Date.now(), nextAttemptAt: 0, status: 'completed', lastSource: 'manual', lastAdded: Math.max(0, Math.min(500, Number(message.added) || 0)), lastPages: Math.max(0, Math.min(10, Number(message.pages) || 0))};
      break;
    }
    case 'ud:reset': next = {...C.emptyAccount(), gmailBaseUrl: account.gmailBaseUrl}; break;
    default: throw new Error('Unknown extension action.');
  }
  await chrome.storage.local.set({[key]: next});
  return {account: next, added};
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string' || !message.type.startsWith('ud:') || ['ud:panel', 'ud:select', 'ud:auto-cancel'].includes(message.type)) return;
  // Serialize read/modify/write operations across every Gmail tab, including rejected writes.
  const task = enqueue(() => handle(message, sender));
  task.then(value => {
    const {cleanupJob, ...reply} = value;
    sendResponse({ok: true, ...reply});
    if (cleanupJob) daily.cleanup(cleanupJob).finally(daily.request);
    if (['ud:get', 'ud:settings', 'ud:reset', 'ud:scan-complete', 'ud:auto-complete'].includes(message.type)) daily.request();
  }, error => sendResponse({ok: false, error: error.message}));
  return true;
});

chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === daily.ALARM) daily.request(); });
chrome.runtime.onStartup.addListener(daily.request);
chrome.runtime.onInstalled.addListener(daily.request);
chrome.tabs.onActivated.addListener(({tabId}) => { daily.protectTab(tabId); enqueue(() => daily.cancelForTab(tabId, 'interrupted')).then(daily.request).catch(() => {}); });
chrome.tabs.onRemoved.addListener(tabId => { enqueue(() => daily.cancelForTab(tabId, 'closed')).then(daily.request).catch(() => {}); });
chrome.tabs.onUpdated.addListener((tabId, changes) => {
  if (changes.url) enqueue(() => daily.cancelNavigated(tabId, changes.url)).then(daily.request).catch(() => {});
});
daily.request();
