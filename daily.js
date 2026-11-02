/* One background scan at a time; all storage mutations use the service worker's queue. */
(() => {
  'use strict';
  const JOB_KEY = 'ud:daily-job';
  const ALARM = 'ud:daily-learning';
  const HOUR = 60 * 60 * 1000;
  const LEASE = 3 * 60 * 1000;
  function create({chrome, C, enqueue, now = () => Date.now(), makeId = () => crypto.randomUUID()}) {
    let queued = false;
    const protectedTabs = new Set();
    const read = async () => chrome.storage.local.get(null);
    const enabled = account => account.settings.learning && account.settings.dailyLearning;
    function baseUrl(url) {
      try {
        const u = new URL(url);
        return u.origin === 'https://mail.google.com' && /^\/mail\/u\/\d+\/?$/.test(u.pathname) ? `${u.origin}${u.pathname.replace(/\/?$/, '/')}` : null;
      } catch (_) { return null; }
    }
    function helperUrl(url, job) {
      try {
        const hash = decodeURIComponent(new URL(url).hash.replace(/\+/g, ' ')).replace(/\/p\d+$/, '').trim();
        return baseUrl(url) === job.base && hash === '#search/in:trash is:unread';
      } catch (_) { return false; }
    }
    const arm = async when => { await chrome.alarms.create(ALARM, {when: Math.max(now() + 60000, when)}); };
    async function cleanup(job) {
      if (!job?.tabId) return;
      try {
        const tab = await chrome.tabs.get(job.tabId);
        // A sign-in redirect is outside our Gmail host permission, so Chrome may
        // withhold its URL. It is still our disposable tab unless the user took it over.
        if (!protectedTabs.has(job.tabId) && !tab.active && (!tab.url && !tab.pendingUrl || helperUrl(tab.pendingUrl || tab.url, job))) await chrome.tabs.remove(tab.id);
      } catch (_) { /* Already closed, signed out, or taken over by the user. */ }
    }
    async function stop(job, reason, close = true) {
      const data = await read();
      if (data[JOB_KEY]?.id !== job.id) return;
      const key = `account:${job.account}`;
      const account = C.hydrateAccount(data[key]);
      account.daily = {...account.daily, status: reason, nextAttemptAt: now() + HOUR};
      await chrome.storage.local.set({[key]: account});
      await chrome.storage.local.remove(JOB_KEY);
      try { await chrome.tabs.sendMessage(job.tabId, {type: 'ud:auto-cancel', jobId: job.id}); } catch (_) {}
      if (close) await cleanup(job);
    }
    async function tick() {
      let data = await read();
      const job = data[JOB_KEY];
      if (job) {
        const account = C.hydrateAccount(data[`account:${job.account}`]);
        let tab;
        try { tab = await chrome.tabs.get(job.tabId); } catch (_) {}
        if (!enabled(account) || now() >= job.deadline || !tab || !helperUrl(tab.pendingUrl || tab.url, job) || tab.active) {
          await stop(job, !enabled(account) ? 'paused' : tab?.active ? 'interrupted' : 'retrying', !tab?.active);
          data = await read();
        } else { await arm(job.deadline); return; }
      }
      const accounts = Object.entries(data).filter(([key]) => key.startsWith('account:')).map(([key, value]) => ({key, account: C.hydrateAccount(value)})).filter(({account}) => enabled(account) && baseUrl(account.gmailBaseUrl));
      if (!accounts.length) { await chrome.alarms.clear(ALARM); return; }
      const tabs = await chrome.tabs.query({url: 'https://mail.google.com/*'});
      const due = accounts.filter(({account}) => C.nextDailyAt(account) <= now()).sort((a, b) => C.nextDailyAt(a.account) - C.nextDailyAt(b.account));
      for (const {key, account} of due) {
        const origin = tabs.find(tab => baseUrl(tab.url) === account.gmailBaseUrl);
        if (!origin) continue;
        const next = {id: makeId(), account: key.slice(8), base: account.gmailBaseUrl, startedAt: now(), deadline: now() + LEASE, tabId: null};
        account.daily = {...account.daily, lastAttemptAt: now(), nextAttemptAt: now() + HOUR, status: 'running'};
        await chrome.storage.local.set({[key]: account, [JOB_KEY]: next});
        try {
          const tab = await chrome.tabs.create({url: next.base + '#search/' + encodeURIComponent('in:trash is:unread'), active: false, windowId: origin.windowId});
          next.tabId = tab.id;
          await chrome.storage.local.set({[JOB_KEY]: next});
          await arm(next.deadline);
        } catch (_) { await stop(next, 'retrying'); await arm(now() + HOUR); }
        return;
      }
      // Missed scans catch up on the next Gmail connection; don't open Chrome windows.
      await arm(Math.min(...accounts.map(({account}) => Math.max(now() + HOUR, C.nextDailyAt(account)))));
    }
    function request() {
      if (queued) return;
      queued = true;
      enqueue(tick).catch(() => arm(now() + HOUR).catch(() => {})).finally(() => { queued = false; });
    }
    async function context(account, tabId) {
      const data = await read();
      const job = data[JOB_KEY];
      if (!job || job.tabId !== tabId) return {helper: false};
      if (job.account !== account) {
        await stop(job, 'account-mismatch', false);
        return {helper: true, cancelled: true, cleanupJob: job};
      }
      if (!enabled(C.hydrateAccount(data[`account:${account}`])) || job.deadline <= now()) {
        await stop(job, 'retrying', false);
        return {helper: true, cancelled: true, cleanupJob: job};
      }
      return {helper: true, jobId: job.id};
    }
    async function validate(account, tabId, jobId) {
      const job = (await read())[JOB_KEY];
      if (!job || job.id !== jobId || job.account !== account || job.tabId !== tabId || job.deadline <= now()) throw new Error('The automatic learning session ended.');
      return job;
    }
    async function complete(account, tabId, jobId, result) {
      const job = await validate(account, tabId, jobId);
      const key = `account:${account}`;
      const value = C.hydrateAccount((await read())[key]);
      if (result.error || !enabled(value)) {
        await stop(job, result.error ? 'retrying' : 'paused', false);
      } else {
        value.daily = {...value.daily, lastCompletedAt: now(), nextAttemptAt: 0, status: 'completed', lastSource: 'automatic', lastAdded: Math.max(0, Math.min(500, Number(result.added) || 0)), lastPages: Math.max(0, Math.min(10, Number(result.pages) || 0))};
        await chrome.storage.local.set({[key]: value});
        await chrome.storage.local.remove(JOB_KEY);
      }
      return {account: C.hydrateAccount((await read())[key]), cleanupJob: job};
    }
    async function cancelForTab(tabId, reason) {
      if (reason === 'interrupted') protectedTabs.add(tabId);
      const job = (await read())[JOB_KEY];
      if (job?.tabId === tabId) await stop(job, reason, false);
    }
    function protectTab(tabId) { protectedTabs.add(tabId); }
    async function cancelNavigated(tabId, url) {
      const job = (await read())[JOB_KEY];
      if (job?.tabId === tabId && !helperUrl(url, job)) await stop(job, 'interrupted', false);
    }
    return {request, context, validate, complete, cleanup, cancelForTab, cancelNavigated, protectTab, baseUrl, ALARM, JOB_KEY};
  }
  globalThis.UsualDaily = {create};
  if (typeof module !== 'undefined') module.exports = {create};
})();
