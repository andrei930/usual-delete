/* Shared, dependency-free learning model. No message bodies or subjects are stored. */
(() => {
  'use strict';
  const DEFAULTS = Object.freeze({threshold: 3, minRatio: 0.9, acrossPages: true, learning: true});
  const normalizeEmail = value => {
    if (typeof value !== 'string') return null;
    const email = value.trim().toLowerCase();
    // Restrict addresses to a query-safe, common subset. Never interpolate arbitrary Gmail text.
    return email.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`|~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email) ? email : null;
  };
  const emptyAccount = () => ({settings: {...DEFAULTS}, senders: {}, events: {}, updatedAt: 0});
  const qualified = (record, settings = DEFAULTS) => {
    if (!record || record.mode === 'never') return false;
    if (record.mode === 'always') return true;
    return record.deleted >= settings.threshold && record.deleted / (record.deleted + record.opened) >= settings.minRatio;
  };
  function applyEvents(account, events, now = Date.now()) {
    const next = structuredClone(account || emptyAccount());
    let added = 0;
    for (const event of events.slice(0, 500)) {
      const email = normalizeEmail(event.email);
      if (!email || !['deleted', 'opened'].includes(event.type) || typeof event.id !== 'string' || !event.id || event.id.length > 200) continue;
      const key = JSON.stringify([event.type, event.id, email]);
      if (Object.hasOwn(next.events, key)) continue;
      if (!Object.hasOwn(next.senders, email)) next.senders[email] = {deleted: 0, opened: 0, mode: 'auto', lastSeen: now};
      next.senders[email][event.type] += 1;
      next.senders[email].lastSeen = now;
      next.events[key] = now;
      added += 1;
    }
    // Bounded deduplication history; old messages can be counted again after 20,000 newer events.
    const keys = Object.keys(next.events);
    for (const key of keys.slice(0, Math.max(0, keys.length - 20000))) delete next.events[key];
    next.updatedAt = now;
    return {account: next, added};
  }
  const eligibleSenders = account => Object.entries(account.senders).filter(([email, record]) => normalizeEmail(email) && qualified(record, account.settings)).map(([email]) => email).sort();
  function buildQuery(account) {
    const senders = eligibleSenders(account);
    if (!senders.length) throw new Error('No learned senders yet. Learn from Trash or add a sender first.');
    const query = `in:inbox is:unread -is:starred -is:important {${senders.map(email => `from:"${email}"`).join(' ')}}`;
    // Do not silently truncate rules or run an incomplete search.
    if (query.length > 6500) throw new Error('Too many senders for one Gmail search. Disable “Across all result pages” to select the current page.');
    return query;
  }
  const isCandidate = (row, account) => Boolean(row.email && row.unread && !row.starred && !row.important && !row.multipleSenders && qualified(account.senders[row.email], account.settings));
  const api = {DEFAULTS, normalizeEmail, emptyAccount, qualified, applyEvents, eligibleSenders, buildQuery, isCandidate};
  globalThis.UsualCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
