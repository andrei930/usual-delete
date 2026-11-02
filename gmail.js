/* Gmail DOM adapter. Gmail has no public DOM contract: fail visibly if controls change. */
(() => {
  'use strict';
  const C = globalThis.UsualCore;
  const visible = node => Boolean(node && node.isConnected && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const label = node => `${node?.getAttribute('aria-label') || ''} ${node?.getAttribute('data-tooltip') || ''} ${node?.getAttribute('title') || ''}`.trim();
  const main = () => [...document.querySelectorAll('[role="main"]')].find(visible) || null;
  const routeKey = hash => { try { return decodeURIComponent(hash.replace(/\+/g, ' ')); } catch (_) { return hash; } };
  function accountEmail() {
    const nodes = document.querySelectorAll('header [aria-label*="@"], [role="banner"] [aria-label*="@"], a[href*="SignOutOptions"], a[href*="accounts.google.com"][aria-label*="@"]');
    for (const node of nodes) {
      for (const match of `${node.getAttribute('aria-label') || ''} ${node.getAttribute('data-email') || ''}`.matchAll(/[a-z0-9.!#$%&'*+/=?^_`|~-]+@[a-z0-9.-]+\.[a-z]{2,63}/gi)) {
        const email = C.normalizeEmail(match[0]);
        if (email) return email;
      }
    }
    return null;
  }
  function parseRow(element) {
    const senderNodes = [...element.querySelectorAll('.yW [email], .yW [data-hovercard-id], [data-sender-email]')];
    const emails = [...new Set(senderNodes.map(node => C.normalizeEmail(node.getAttribute('email') || node.getAttribute('data-hovercard-id') || node.getAttribute('data-sender-email'))).filter(Boolean))];
    const identity = element.matches('[data-legacy-thread-id], [data-thread-id]') ? element : element.querySelector('[data-legacy-thread-id], [data-thread-id]');
    const checkbox = element.querySelector('[role="checkbox"]');
    const star = element.querySelector('.T-KT');
    // Gmail renders .a9q as an unlabeled icon inside the actual importance switch.
    const importanceIcon = element.querySelector('.a9q');
    const important = importanceIcon?.closest('[role="switch"]') || element.querySelector('[data-important]') || importanceIcon;
    const starred = Boolean(element.querySelector('.T-KT-Jp')) || /^(starred|remove star|cu stea|marcat cu stea)/i.test(label(star)) || star?.getAttribute('aria-checked') === 'true';
    const importanceLabel = label(important);
    const knownUnimportant = /not important|mark\b.*\bas important|nu este important|marchează ca important|marcați ca important/i.test(importanceLabel);
    const checked = important?.getAttribute('aria-checked');
    const isImportant = checked === 'true' || Boolean(element.querySelector('[data-important="true"]')) || (checked !== 'false' && Boolean(important && !knownUnimportant));
    return {
      element, checkbox, email: emails.length === 1 ? emails[0] : null, multipleSenders: emails.length !== 1,
      id: identity?.getAttribute('data-legacy-thread-id') || identity?.getAttribute('data-thread-id') || null,
      unread: element.classList.contains('zE') || element.getAttribute('data-unread') === 'true',
      starred, important: isImportant, selected: checkbox?.getAttribute('aria-checked') === 'true'
    };
  }
  function rows() {
    const root = main();
    if (!root) return [];
    return [...root.querySelectorAll('tr.zA, [role="row"][data-legacy-thread-id]')].filter(visible).map(parseRow).filter(row => row.checkbox);
  }
  function isTrash() {
    const route = routeKey(location.hash.slice(1));
    return route === 'trash' || /^trash\/p\d+$/.test(route) || (/^search\//.test(route) && /(?:^|\s)in:trash(?:\s|$)/i.test(route.slice(7)));
  }
  function isInbox() {
    const route = routeKey(location.hash.slice(1));
    return /^(inbox|category\/[^/]+)(\/p\d+)?$/.test(route);
  }
  function isList() { return rows().length > 0; }
  async function waitFor(test, timeout = 12000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const result = test();
      if (result) return result;
      await delay(150);
    }
    throw new Error('Gmail did not finish updating. Try again once the message list has loaded.');
  }
  async function stableRows(checkRoute) {
    let previous = '';
    let stable = 0;
    return waitFor(() => {
      if (!checkRoute()) throw new Error('Selection stopped because you navigated away.');
      const list = rows();
      const signature = list.map(row => `${row.id}:${row.email}`).join('|');
      if (signature && signature === previous) stable += 1;
      else { previous = signature; stable = 0; }
      return stable >= 4 ? list : false;
    });
  }
  function setSelected(row, selected) {
    if (!visible(row.checkbox)) throw new Error('Gmail changed the message list. Try again.');
    if ((row.checkbox.getAttribute('aria-checked') === 'true') !== selected) row.checkbox.click();
  }
  function activateButton(node) {
    if (!visible(node) || node.getAttribute('aria-disabled') === 'true') throw new Error('Gmail’s navigation control is unavailable.');
    // Gmail's Closure toolbar buttons handle mouseup, not HTMLElement.click().
    // Sending a trailing click as well can execute a control twice, so choose one path.
    if (node.classList.contains('T-I')) {
      const rect = node.getBoundingClientRect();
      const init = {bubbles: true, cancelable: true, view: window, button: 0, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2};
      node.dispatchEvent(new MouseEvent('mousedown', {...init, buttons: 1}));
      node.dispatchEvent(new MouseEvent('mouseup', {...init, buttons: 0}));
    } else node.click();
  }
  function bulkControl() {
    const root = main();
    const nodes = root ? [...root.querySelectorAll('.T-Jo[role="checkbox"], [role="toolbar"] [role="checkbox"]')] : [];
    return nodes.find(node => visible(node) && !node.closest('tr.zA, [role="row"]')) || null;
  }
  function toolbarAnchor() {
    const bulk = bulkControl();
    if (!bulk) return null;
    // Place our control after the complete Select group, including its dropdown.
    // Gmail keeps this group while swapping Refresh for selected-message actions.
    return bulk.closest('.G-Ni') || bulk;
  }
  function allResultsLink() {
    const root = main();
    if (!root) return null;
    // Gmail's native bulk-selection banner. Never search arbitrary message text for links.
    return [...root.querySelectorAll('.Tm .ya, .aeF .ya, .v1 .ya, [data-ud-all-results], [role="link"], a')].find(node => visible(node) && !node.closest('tr.zA, [role="row"]') && /^(select all\b.*\b(conversations|messages)\b|selectează toate\b|selectați toate\b)/i.test(node.textContent.trim())) || null;
  }
  function allResultsSelected() {
    return [...(main()?.querySelectorAll('.v1, .aeF .ya, .Tm .ya, .aeF [role="status"], [data-ud-all-selected]') || [])].some(node => visible(node) && /all\b.*\b(conversations|messages)\b.*\bselected|toate\b.*\bselectate/i.test(node.textContent));
  }
  const api = {visible, delay, label, main, routeKey, accountEmail, parseRow, rows, isTrash, isInbox, isList, waitFor, stableRows, setSelected, activateButton, bulkControl, toolbarAnchor, allResultsLink, allResultsSelected};
  globalThis.UsualGmail = api;
})();
