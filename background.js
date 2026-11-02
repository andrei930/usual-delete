importScripts('core.js');
const C = globalThis.UsualCore;
let queue = Promise.resolve();

async function handle(message, sender) {
  if (!sender.tab || !/^https:\/\/mail\.google\.com\//.test(sender.url || '')) throw new Error('Open Gmail to use Usual Delete.');
  const email = C.normalizeEmail(message.account);
  if (!email) throw new Error('Could not identify the active Gmail account. Refresh Gmail and try again.');
  const key = `account:${email}`;
  const stored = await chrome.storage.local.get(key);
  const account = stored[key] || C.emptyAccount();
  let next = account;
  let added = 0;
  switch (message.type) {
    case 'ud:get': return {account};
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
      for (const key of ['acrossPages', 'learning']) if (typeof message.settings?.[key] === 'boolean') next.settings[key] = message.settings[key];
      if ([3, 5, 10].includes(message.settings?.threshold)) next.settings.threshold = message.settings.threshold;
      break;
    }
    case 'ud:reset': next = C.emptyAccount(); break;
    default: throw new Error('Unknown extension action.');
  }
  await chrome.storage.local.set({[key]: next});
  return {account: next, added};
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string' || !message.type.startsWith('ud:') || ['ud:panel', 'ud:select'].includes(message.type)) return;
  // Serialize read/modify/write operations across every Gmail tab, including rejected writes.
  const task = queue.then(() => handle(message, sender));
  queue = task.catch(() => {});
  task.then(value => sendResponse({ok: true, ...value}), error => sendResponse({ok: false, error: error.message}));
  return true;
});
