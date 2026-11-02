'use strict';
async function send(type) {
  const status = document.getElementById('status');
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab?.id || !tab.url?.startsWith('https://mail.google.com/')) {
      status.textContent = 'Open Gmail in the current tab, then try again.';
      return;
    }
    await chrome.tabs.sendMessage(tab.id, {type: `ud:${type}`});
    window.close();
  } catch (_) { status.textContent = 'Refresh your Gmail tab once, then try again. The extension needs a fresh Gmail page after installation or an update.'; }
}
document.getElementById('select').addEventListener('click', () => send('select'));
document.getElementById('settings').addEventListener('click', () => send('panel'));
