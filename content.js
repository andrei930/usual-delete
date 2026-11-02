(() => {
  'use strict';
  if (document.getElementById('usual-delete-root')) return;
  const C = globalThis.UsualCore;
  const G = globalThis.UsualGmail;
  const host = document.createElement('div');
  host.id = 'usual-delete-root';
  const shadow = host.attachShadow({mode: 'open'});
  shadow.innerHTML = `
    <style>
      :host{all:initial;position:fixed;right:24px;bottom:22px;z-index:2147483646;font-family:Arial,sans-serif;color:#272b29;color-scheme:light}
      *{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #266a55;outline-offset:3px}button:disabled{opacity:.5;cursor:wait}
      .toast{position:fixed;z-index:2147483646;width:max-content;max-width:min(330px,calc(100vw - 32px));padding:10px 13px;border:1px solid #cdd6c9;border-radius:8px;background:#fafbf6;color:#314b3a;box-shadow:0 3px 14px #1732231a;font-size:12px;line-height:1.5;pointer-events:none}
      .panel{width:392px;max-width:calc(100vw - 32px);max-height:calc(100vh - 104px);overflow:auto;margin-bottom:12px;border:1px solid #d8dfd4;border-radius:22px;background:#fafbf6;box-shadow:0 16px 70px #16332430}.panel[hidden],[hidden]{display:none!important}.head{padding:23px 24px 0;display:flex;align-items:center;justify-content:space-between}.brand{font-weight:800;font-size:12px;letter-spacing:1.6px}.brand i{font-style:normal;color:#2e7859;font-size:19px;margin-right:7px}.close{background:none;border:0;color:#57665c;font-size:23px;padding:0 3px}.body{padding:20px 24px 22px}h1{margin:0;font-size:29px;line-height:1.16;letter-spacing:-1.2px;font-weight:600}.sub{font-size:13px;color:#677268;line-height:1.55;margin:11px 0 17px}.account{font-size:11px;color:#677268;overflow-wrap:anywhere}.stats{display:flex;gap:9px;margin:18px 0}.stat{flex:1;padding:13px 12px;background:#edf2e8;border-radius:12px}.stat b{display:block;font-size:23px;font-weight:500;margin-bottom:5px}.stat span{font-size:11px;color:#58675b}
      .primary{background:#285f49;color:white;border:0;border-radius:11px;padding:14px 16px;width:100%;font-size:13px;font-weight:700;display:block}.primary:hover{background:#1b4c38}.secondary{background:transparent;border:1px solid #cdd6c9;border-radius:10px;padding:11px 12px;width:100%;color:#314b3a;font-size:12px;margin-top:9px}.secondary:hover{background:#edf2e8}.note{font-size:11px;color:#68736a;line-height:1.55;margin:10px 0 0}.status{font-size:12px;line-height:1.5;background:#eef3e8;color:#28563c;border-radius:10px;padding:12px;margin:12px 0 0;white-space:pre-line}.status.error{background:#f9e9df;color:#86442c}details{margin-top:19px;border-top:1px solid #dfe5d9;padding-top:16px}summary{font-size:12px;font-weight:bold;cursor:pointer;list-style-position:outside;margin-left:13px}.rules{margin-top:12px;max-height:230px;overflow:auto}.rule{padding:10px 0;border-bottom:1px solid #e5e9df}.rule-top{font-size:12px;overflow-wrap:anywhere;font-weight:bold}.rule-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}.evidence{font-size:10px;color:#68736a}select{border:1px solid #d2dacc;border-radius:6px;background:white;color:#344d3a;padding:5px;font-size:11px;max-width:150px}.add{display:flex;gap:6px;margin-top:12px}.add input{width:100%;min-width:0;border:1px solid #d2dacc;border-radius:8px;padding:9px;font-size:12px;background:white;color:#27372b}.add button{background:#e5eddf;border:0;border-radius:8px;color:#34583d;padding:9px 12px;font-size:12px}.setting{display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.4;margin:12px 0}.setting input{accent-color:#285f49;margin:2px 0 0}.threshold{display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:13px}.reset{border:0;background:none;padding:0;font-size:11px;color:#8b553f;text-decoration:underline;margin-top:16px}.footer{padding:13px 24px;background:#edf2e8;color:#657561;font-size:10px;line-height:1.5}
      @media(prefers-reduced-motion:no-preference){.panel{animation:enter .16s ease-out}@keyframes enter{from{transform:translateY(6px);opacity:0}to{transform:translateY(0);opacity:1}}}
    </style>
    <section class="panel" id="panel" aria-label="Usual Delete settings" hidden>
      <div class="head"><span class="brand"><i>◒</i> USUAL DELETE</span><button class="close" id="close" aria-label="Close settings">×</button></div>
      <div class="body">
        <h1>Your inbox,<br>a little lighter.</h1>
        <p class="sub">One click to select the senders you usually delete without reading.</p>
        <div class="account" id="account">Connecting to Gmail…</div>
        <div class="stats"><div class="stat"><b id="sender-count">0</b><span>ready senders</span></div><div class="stat"><b id="match-count">0</b><span>matches on this page</span></div></div>
        <button class="primary" id="select">Select usual deletes ↗</button>
        <button class="secondary" id="learn">Learn from Trash</button>
        <p class="note">Start by learning from up to 10 pages of unread mail in Trash, or add a sender below. Mail is never opened or deleted by this extension.</p>
        <div class="status" id="status" role="status" aria-live="polite" hidden></div>
        <details id="sender-details"><summary>Manage sender rules</summary><div class="rules" id="rules"></div><form class="add" id="add-form"><input id="email" type="email" required placeholder="newsletter@example.com" aria-label="Sender email address" autocomplete="off"><button type="submit">Add</button></form><p class="note">Add enables an exact sender immediately. “Never select” overrides learning.</p></details>
        <details><summary>Selection & learning</summary>
          <label class="setting"><input type="checkbox" id="across"> <span>Across all result pages<br><span class="note">Search the whole inbox, then use Gmail’s bulk selection. Gmail may include other messages in a matching conversation. Review before deleting.</span></span></label>
          <label class="setting"><input type="checkbox" id="learning"> <span>Learn while I browse Trash and open messages</span></label>
          <label class="setting"><input type="checkbox" id="daily"> <span>Learn from Trash automatically once a day</span></label>
          <p class="note" id="daily-status"></p>
          <label class="threshold">Unread deletions to learn a sender <select id="threshold"><option value="3">3</option><option value="5">5</option><option value="10">10</option></select></label>
          <p class="note">Automatic rules also need at least 90% deletion evidence. Opening an unread conversation lowers confidence. Read, starred, important and mixed-sender rows are skipped on the visible page. Gmail search filters apply to other pages.</p>
          <button class="reset" id="reset">Reset learning for this Gmail account</button>
        </details>
      </div>
      <div class="footer">LOCAL BY DESIGN · No server, AI service or analytics.<br>Sender addresses, counts and conversation IDs stay in this Chrome profile.</div>
    </section><div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`;
  document.documentElement.append(host);
  const $ = id => shadow.getElementById(id);
  const toolbarHost = document.createElement('span');
  toolbarHost.id = 'usual-delete-toolbar';
  const toolbarShadow = toolbarHost.attachShadow({mode: 'open'});
  toolbarShadow.innerHTML = `<style>
    :host{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;width:40px;height:20px;flex:0 0 40px;margin:0 4px 0 0;color:inherit;cursor:pointer}
    button{appearance:none;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;color:inherit;border-radius:4px;width:40px;height:40px;padding:8px;opacity:.8;cursor:pointer}
    svg{display:block;width:20px;height:20px;pointer-events:none}
    button:hover{background:#80808020}button:focus-visible{outline:2px solid currentColor;outline-offset:-2px}button:disabled{opacity:.4;cursor:wait}
  </style><button id="toolbar-select" aria-label="Select usual deletes" title="Select usual deletes"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3.5 7 2 2 3.5-4M12 7h8M3.5 16l2 2 3.5-4M12 16h8"/></svg></button>`;
  const toolbarButton = toolbarShadow.getElementById('toolbar-select');
  let mountedAnchor = null;
  function mountToolbar() {
    const anchor = G.toolbarAnchor();
    if (!anchor?.parentElement) { toolbarHost.remove(); mountedAnchor = null; $('toast').hidden = true; return; }
    // Hover tooltips can insert temporary siblings. Don't move a connected button
    // to chase those mutations: detaching it under the cursor causes flicker.
    if (toolbarHost.parentElement !== anchor.parentElement || mountedAnchor !== anchor) { anchor.after(toolbarHost); mountedAnchor = anchor; }
    const height = `${Math.max(16, Math.round(anchor.getBoundingClientRect().height))}px`;
    if (toolbarHost.style.height !== height) toolbarHost.style.height = height;
    // Native toolbar icons use image styling, so their inherited text color can
    // remain black in Gmail's dark theme. Choose readable text from the backdrop.
    for (let parent = anchor.parentElement; parent; parent = parent.parentElement) {
      const color = getComputedStyle(parent).backgroundColor.match(/[\d.]+/g)?.map(Number);
      if (!color || (color.length > 3 && color[3] < .95)) continue;
      const brightness = (color[0] * 299 + color[1] * 587 + color[2] * 114) / 1000;
      const textColor = brightness < 140 ? 'rgb(232, 234, 237)' : 'rgb(68, 71, 70)';
      if (toolbarHost.style.color !== textColor) toolbarHost.style.color = textColor;
      break;
    }
  }
  let account = null;
  let accountId = null;
  let busy = false;
  let observing = false;
  let resetArmed = false;
  let generation = 0;
  let selectionQuery = null;
  let resetTimer;
  let toastTimer;
  let initialized = false;
  let automaticJobId = null;

  function status(text, error = false) {
    if (automaticJobId) return;
    $('status').hidden = !text;
    $('status').textContent = text;
    $('status').classList.toggle('error', error);
    clearTimeout(toastTimer);
    $('toast').hidden = true;
    if (text && !error && $('panel').hidden && toolbarHost.isConnected) {
      const rect = toolbarButton.getBoundingClientRect();
      $('toast').textContent = text.split(/(?<=\.)\s/)[0];
      $('toast').style.left = `${Math.max(16, Math.min(rect.left, window.innerWidth - 346))}px`;
      $('toast').style.top = `${rect.bottom + 8}px`;
      $('toast').hidden = false;
      toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
    }
  }
  function panel(open = true) {
    $('panel').hidden = !open;
    $('toast').hidden = true;
    if (open) refresh().catch(error => status(error.message, true));
  }
  async function rpc(type, data = {}) {
    const currentId = G.accountEmail();
    if (!currentId || (accountId && currentId !== accountId)) throw new Error('The Gmail account changed. Open settings again before continuing.');
    const reply = await chrome.runtime.sendMessage({type: `ud:${type}`, account: currentId, ...(automaticJobId ? {autoJobId: automaticJobId} : {}), ...data});
    if (!reply?.ok) throw new Error(reply?.error || 'The extension was updated. Refresh Gmail and try again.');
    if (G.accountEmail() !== currentId) throw new Error('The Gmail account changed. Open settings again.');
    accountId = currentId;
    account = reply.account;
    return reply;
  }
  function render() {
    if (!account) return;
    $('account').textContent = accountId;
    $('sender-count').textContent = C.eligibleSenders(account).length;
    $('match-count').textContent = G.isInbox() || selectionQuery ? G.rows().filter(row => C.isCandidate(row, account)).length : '—';
    $('across').checked = account.settings.acrossPages;
    $('learning').checked = account.settings.learning;
    $('daily').checked = account.settings.dailyLearning;
    $('daily').disabled = !account.settings.learning;
    $('daily-status').textContent = !account.settings.dailyLearning ? 'Automatic daily learning is off.' : !account.settings.learning ? 'Daily learning is paused with learning.' : account.daily.status === 'running' ? 'Learning from Trash in a temporary background Gmail tab…' : account.daily.lastCompletedAt ? `Last Trash scan: ${new Date(account.daily.lastCompletedAt).toLocaleString()}. Runs again after 24 hours while Gmail is open.` : 'Runs daily while Gmail is open, using a temporary background tab. Missed scans catch up when Gmail is available.';
    $('threshold').value = String(account.settings.threshold);
    const rules = $('rules');
    rules.replaceChildren();
    const entries = Object.entries(account.senders).sort(([a, x], [b, y]) => Number(C.qualified(y, account.settings)) - Number(C.qualified(x, account.settings)) || a.localeCompare(b));
    if (!entries.length) {
      const text = document.createElement('p'); text.className = 'note'; text.textContent = 'No senders yet. Learn from Trash to find your patterns.'; rules.append(text);
    }
    for (const [email, record] of entries) {
      const row = document.createElement('div'); row.className = 'rule';
      const title = document.createElement('div'); title.className = 'rule-top'; title.textContent = email;
      const bottom = document.createElement('div'); bottom.className = 'rule-bottom';
      const evidence = document.createElement('span'); evidence.className = 'evidence'; evidence.textContent = `${record.deleted} deleted unread · ${record.opened} opened`;
      const select = document.createElement('select'); select.setAttribute('aria-label', `Rule for ${email}`);
      for (const [value, text] of [['auto', C.qualified({...record, mode: 'auto'}, account.settings) ? 'Learned ✓' : 'Still learning'], ['always', 'Always select'], ['never', 'Never select'], ['forget', 'Forget sender']]) {
        const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
      }
      select.value = record.mode;
      select.addEventListener('change', () => run(async () => { await rpc('rule', {email, mode: select.value}); render(); status('Sender rule saved.'); }));
      bottom.append(evidence, select); row.append(title, bottom); rules.append(row);
    }
  }
  async function refresh() {
    const current = G.accountEmail();
    if (!current) throw new Error('Could not identify your Gmail account. Wait for Gmail to load, or refresh the tab.');
    if (current !== accountId) { accountId = null; account = null; selectionQuery = null; generation += 1; }
    await rpc('get'); render();
  }
  async function run(action) {
    if (busy) return;
    busy = true;
    for (const id of ['select', 'learn', 'reset']) $(id).disabled = true;
    toolbarButton.disabled = true;
    try { await action(); } catch (error) { $('panel').hidden = false; status(error.message, true); }
    finally { busy = false; for (const id of ['select', 'learn', 'reset']) $(id).disabled = false; toolbarButton.disabled = false; }
  }
  function guard(token, id, hash) {
    if (generation !== token || G.accountEmail() !== id || G.routeKey(location.hash) !== G.routeKey(hash)) throw new Error('Stopped because the Gmail view changed. Try again from your inbox.');
    return true;
  }
  async function selectUsual() {
    await refresh();
    if (!C.eligibleSenders(account).length) { $('panel').hidden = false; status('First, click “Learn from Trash” or add a sender under Manage sender rules.'); return; }
    let hash = location.hash;
    const token = ++generation;
    const id = accountId;
    if (account.settings.acrossPages) {
      const query = C.buildQuery(account);
      selectionQuery = query;
      hash = `#search/${encodeURIComponent(query)}`;
      status('Finding matching unread conversations across your inbox…');
      location.hash = hash;
      await G.delay(700);
    } else if (!G.isInbox()) {
      throw new Error('Current-page mode works in your inbox. Open Inbox, or enable “Across all result pages” in settings.');
    }
    const check = () => guard(token, id, hash);
    let list;
    try { list = await G.stableRows(check); }
    catch (error) {
      if (check() && !G.rows().length) { status('No selectable conversations were found. If Gmail is still loading, try again.'); return; }
      throw error;
    }
    check();
    const candidates = list.filter(row => C.isCandidate(row, account));
    // Clear any pre-existing Gmail-wide selection before selecting exactly the eligible visible rows.
    const bulk = G.bulkControl();
    if (!bulk && G.allResultsSelected()) throw new Error('Clear Gmail’s existing selection first; its select-all checkbox could not be identified.');
    if (bulk && ['true', 'mixed'].includes(bulk.getAttribute('aria-checked'))) {
      bulk.click(); await G.delay(180); check();
      if (bulk.getAttribute('aria-checked') === 'true') { bulk.click(); await G.delay(180); }
    }
    list = G.rows();
    for (const row of list) { check(); G.setSelected(row, C.isCandidate(row, account)); }
    if (!candidates.length) { status('No matching unread conversations on this page. Previous selection cleared. Protected or mixed-sender rows are skipped.'); return; }
    await G.delay(350); check();
    list = G.rows();
    const selected = list.filter(row => row.selected);
    if (selected.length !== candidates.length || selected.some(row => !C.isCandidate(row, account))) throw new Error('Gmail did not select the expected conversations. Review the checkboxes and try again.');
    if (account.settings.acrossPages && list.every(row => C.isCandidate(row, account))) {
      // Gmail shows its across-pages control only after the native select-all checkbox is checked.
      if (bulk && bulk.getAttribute('aria-checked') !== 'true') { bulk.click(); await G.delay(250); check(); }
      const all = G.allResultsLink();
      if (all) {
        all.click(); await G.delay(300); check();
        if (!G.allResultsSelected()) { status(`${selected.length} conversations selected on this page. Gmail did not confirm selection across pages; use its “Select all conversations” link to extend it.`, true); return; }
        status('All conversations matching the Gmail search are selected, including other result pages. Review them, then use Gmail’s Delete button. Gmail may include other messages in a matching thread.');
        render(); return;
      }
    }
    status(`${selected.length} matching unread conversation${selected.length === 1 ? '' : 's'} selected on this page. Review, then use Gmail’s Delete button.${account.settings.acrossPages ? ' If Gmail shows a “Select all conversations” link, click it to include other pages. Protected or mixed-sender rows prevent automatic selection across pages.' : ''}`);
    render();
  }
  function trainingEvents(list) {
    return list.filter(row => row.id && row.email && row.unread && !row.starred && !row.important && !row.multipleSenders).map(row => ({id: row.id, email: row.email, type: 'deleted'}));
  }
  async function learnTrash({automatic = false} = {}) {
    await refresh();
    if (!account.settings.learning) throw new Error('Enable learning in “Selection & learning” first.');
    const previousHash = location.hash || '#inbox';
    let hash = '#search/' + encodeURIComponent('in:trash is:unread');
    const token = ++generation;
    const id = accountId;
    selectionQuery = null;
    location.hash = hash;
    status('Learning from unread conversations in Trash. No messages are opened…');
    await G.delay(700);
    let added = 0;
    let pages = 0;
    for (; pages < 10; pages++) {
      const check = () => guard(token, id, hash);
      let list;
      try { list = await G.stableRows(check); }
      catch (error) { if (!G.rows().length && G.noResults() && check()) break; throw error; }
      const result = await rpc('events', {events: trainingEvents(list)});
      added += result.added;
      status(`Learned ${added} new unread conversations from ${pages + 1} page${pages ? 's' : ''} of Trash…`);
      if (!automatic) render(); check();
      const next = [...document.querySelectorAll('[role="button"], button')].find(node => G.visible(node) && /^(older|mai vechi)(\b|\s)/i.test(G.label(node)) && node.getAttribute('aria-disabled') !== 'true' && !node.classList.contains('T-I-JE'));
      if (!next || pages === 9) { pages += 1; break; }
      const signature = list.map(row => row.id).join('|');
      G.activateButton(next);
      await G.waitFor(() => {
        if (G.accountEmail() !== id) throw new Error('The active Gmail account changed. Learning stopped.');
        const newHash = location.hash;
        if (G.routeKey(newHash).replace(/\/p\d+$/, '') !== '#search/in:trash is:unread') throw new Error('You navigated away. Learning stopped.');
        return G.rows().length && G.rows().map(row => row.id).join('|') !== signature;
      });
      hash = location.hash;
    }
    guard(token, id, hash);
    if (automatic) return {added, pages};
    await rpc('scan-complete', {added, pages});
    location.hash = previousHash;
    status(`Learned ${added} new unread conversations from ${pages} page${pages === 1 ? '' : 's'}. ${C.eligibleSenders(account).length} sender${C.eligibleSenders(account).length === 1 ? '' : 's'} ready. Re-scanning the same conversations does not count them twice.`);
    render();
  }
  async function observeTrash() {
    if (!initialized || busy || observing || !G.isTrash() || !G.accountEmail()) return;
    observing = true;
    try {
      await refresh();
      if (account.settings.learning) await rpc('events', {events: trainingEvents(G.rows())});
      if (!$('panel').hidden) render();
    } catch (_) { /* UI actions surface connection failures; passive observation stays quiet. */ }
    finally { observing = false; }
  }
  // Opening an unread conversation is negative feedback for sender-based inference.
  document.addEventListener('click', event => {
    if (busy || !account?.settings.learning || G.isTrash() || !(event.target instanceof Element)) return;
    const element = event.target.closest('tr.zA, [role="row"][data-legacy-thread-id]');
    if (!element || event.target.closest('[role="checkbox"], [role="button"], button, .T-KT, .a9q')) return;
    const row = G.parseRow(element);
    if (!row.id || !row.email || !row.unread || row.multipleSenders) return;
    const id = accountId;
    const before = location.hash;
    setTimeout(async () => {
      if (G.accountEmail() !== id || location.hash === before || G.isList()) return;
      try { await rpc('events', {events: [{id: row.id, email: row.email, type: 'opened'}]}); } catch (_) {}
    }, 1000);
  }, true);
  $('close').addEventListener('click', () => panel(false));
  toolbarButton.addEventListener('click', event => { event.stopPropagation(); run(selectUsual); });
  for (const name of ['mousedown', 'mouseup', 'mouseover', 'mouseout', 'pointerover', 'pointerout']) toolbarShadow.addEventListener(name, event => event.stopPropagation());
  $('select').addEventListener('click', () => run(selectUsual));
  $('learn').addEventListener('click', () => run(learnTrash));
  shadow.addEventListener('keydown', event => { if (event.key === 'Escape') { panel(false); toolbarButton.focus(); } });
  document.addEventListener('pointerdown', event => {
    if (!$('panel').hidden && !busy && !event.composedPath().includes(host) && !event.composedPath().includes(toolbarHost)) panel(false);
  }, true);
  $('add-form').addEventListener('submit', event => {
    event.preventDefault();
    run(async () => { await refresh(); await rpc('rule', {email: $('email').value, mode: 'always'}); $('email').value = ''; render(); status('Sender added. Its unread inbox conversations can now be selected.'); });
  });
  for (const [id, key] of [['across', 'acrossPages'], ['learning', 'learning'], ['daily', 'dailyLearning'], ['threshold', 'threshold']]) {
    $(id).addEventListener('change', () => run(async () => { await rpc('settings', {settings: {[key]: id === 'threshold' ? Number($(id).value) : $(id).checked}}); render(); status('Settings saved.'); }));
  }
  $('reset').addEventListener('click', () => {
    if (!resetArmed) { resetArmed = true; $('reset').textContent = 'Click again to erase this account’s learning'; clearTimeout(resetTimer); resetTimer = setTimeout(() => { resetArmed = false; $('reset').textContent = 'Reset learning for this Gmail account'; }, 6000); return; }
    run(async () => { await rpc('reset'); resetArmed = false; $('reset').textContent = 'Reset learning for this Gmail account'; render(); status('Learning and rules erased for this account.'); });
  });
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === 'ud:auto-cancel' && message.jobId === automaticJobId) { generation += 1; automaticJobId = null; initialized = true; respond({ok: true}); }
    if (message?.type === 'ud:panel') { panel(); respond({ok: true}); }
    if (message?.type === 'ud:select') { run(selectUsual); respond({ok: true}); }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    const value = changes[`account:${accountId}`]?.newValue;
    if (area === 'local' && value && !automaticJobId) { account = C.hydrateAccount(value); if (!$('panel').hidden) render(); }
  });
  let debounce;
  let mountFrame;
  function scheduleMount() {
    if (mountFrame) return;
    mountFrame = requestAnimationFrame(() => { mountFrame = null; mountToolbar(); });
  }
  const observer = new MutationObserver(changes => {
    if (!changes.some(change => !host.contains(change.target))) return;
    scheduleMount();
    clearTimeout(debounce);
    debounce = setTimeout(() => { observeTrash(); if (account && !$('panel').hidden) render(); }, 800);
  });
  observer.observe(document.body, {childList: true, subtree: true});
  window.addEventListener('hashchange', () => { $('toast').hidden = true; mountToolbar(); clearTimeout(debounce); debounce = setTimeout(() => { observeTrash(); if (account && !$('panel').hidden) render(); }, 900); });
  mountToolbar();
  (async () => {
    const email = await G.waitFor(() => G.accountEmail(), 20000);
    const context = await chrome.runtime.sendMessage({type: 'ud:auto-context', account: email});
    if (!context?.ok || context.cancelled) return;
    if (!context.helper) { initialized = true; await refresh(); await observeTrash(); return; }
    automaticJobId = context.jobId;
    busy = true;
    toolbarButton.disabled = true;
    try {
      const result = await learnTrash({automatic: true});
      await rpc('auto-complete', result);
    } catch (_) {
      if (automaticJobId) { try { await rpc('auto-complete', {error: true}); } catch (_) {} }
    } finally { automaticJobId = null; busy = false; toolbarButton.disabled = false; }
  })().catch(() => {});
})();
