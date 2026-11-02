const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
// Set NODE_PATH to an existing Playwright installation, or run npm install first.
const {chromium} = require('playwright');
const extensionPath = path.resolve(__dirname, '..');

(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'usual-delete-test-'));
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  const context = await chromium.launchPersistentContext(profile, {
    headless: true, executablePath, channel: executablePath ? undefined : 'chromium', viewport: {width: 1280, height: 900},
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    ignoreDefaultArgs: ['--disable-extensions']
  });
  const errors = [];
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); console.log(`PASS ${message}`); checks++; };
  try {
    const fixture = await fs.readFile(path.join(__dirname, 'gmail-fixture.html'), 'utf8');
    await context.route('https://mail.google.com/**', route => route.fulfill({contentType: 'text/html', body: fixture}));
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    // Keep the existing manual-selection scenarios deterministic; test daily scans below.
    await worker.evaluate(async () => {
      const account = UsualCore.emptyAccount(); account.settings.dailyLearning = false;
      await chrome.storage.local.set({'account:me@example.com': account, 'account:other@example.com': account});
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('https://mail.google.com/mail/u/0/#inbox');
    await page.locator('#usual-delete-root').waitFor({state: 'attached'});
    check(worker.url().endsWith('/background.js'), 'Manifest V3 service worker loads');
    const panel = page.locator('#usual-delete-root');
    const toolbar = page.locator('#usual-delete-toolbar');
    const openPanel = () => worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({url: 'https://mail.google.com/*'});
      return chrome.tabs.sendMessage(tab.id, {type: 'ud:panel'});
    });
    const idle = () => page.waitForFunction(() => !document.getElementById('usual-delete-root').shadowRoot.getElementById('select').disabled);
    await toolbar.waitFor();
    check(await toolbar.evaluate(node => node.previousElementSibling.id === 'bulk' && node.nextElementSibling.id === 'refresh'), 'selection button sits between Select all and Refresh');
    const icon = toolbar.getByRole('button', {name: 'Select usual deletes'});
    check(await icon.locator('svg').count() === 1 && (await icon.textContent()).trim() === '', 'toolbar action is an accessible icon without a text label');
    await page.evaluate(() => {
      const button = document.getElementById('usual-delete-toolbar');
      window.hoverMoves = 0;
      window.hoverObserver = new MutationObserver(changes => { for (const change of changes) if ([...change.removedNodes].includes(button)) window.hoverMoves++; });
      window.hoverObserver.observe(button.parentElement, {childList: true});
    });
    await icon.hover();
    await page.evaluate(() => { const tooltip = document.createElement('span'); tooltip.id = 'temporary-gmail-tooltip'; document.getElementById('bulk').parentElement.style.alignItems = 'flex-start'; document.getElementById('bulk').after(tooltip); });
    await page.waitForTimeout(200);
    check(await page.evaluate(() => window.hoverMoves === 0) && await icon.evaluate(node => getComputedStyle(node).cursor === 'pointer'), 'Gmail hover mutations do not move the icon or change its pointer cursor');
    check(await icon.evaluate(node => { const r = node.getBoundingClientRect(), b = document.getElementById('bulk').getBoundingClientRect(); return Math.abs(r.top + r.height / 2 - b.top - b.height / 2) < 1; }), 'icon alignment follows Gmail’s compact native control height');
    await page.evaluate(() => { window.hoverObserver.disconnect(); document.getElementById('bulk').parentElement.style.alignItems = 'center'; document.getElementById('temporary-gmail-tooltip').remove(); });
    check(await panel.locator('#launch, #gear').count() === 0 && !await panel.locator('#panel').isVisible(), 'no floating action buttons or automatic settings panel');
    await toolbar.evaluate(node => node.remove());
    await toolbar.waitFor();
    check(await toolbar.count() === 1, 'toolbar control remounts once after Gmail removes it');
    await openPanel();
    await panel.locator('#account').filter({hasText: 'me@example.com'}).waitFor();
    check(await panel.locator('#sender-count').textContent() === '0', 'first run has no invented sender rules');
    await panel.locator('#learn').click();
    await panel.locator('#status').filter({hasText: 'Learned 4 new unread conversations from 2 pages.'}).waitFor({timeout: 25000});
    check(await panel.locator('#sender-count').textContent() === '1', 'Trash training traverses pages and learns only repeated senders');
    check((await page.evaluate(() => window.testState)).opened === 0, 'training opens no messages');
    check(page.url().endsWith('#inbox'), 'training returns to the original inbox');
    await panel.locator('#learn').click();
    await panel.locator('#status').filter({hasText: 'Learned 0 new unread conversations from 2 pages.'}).waitFor({timeout: 25000});
    check(true, 'rescanning Trash does not inflate evidence');
    await panel.locator('details').nth(1).locator('summary').click();
    await panel.locator('#across').uncheck();
    await panel.locator('#status').filter({hasText: 'Settings saved.'}).waitFor();
    await panel.locator('#select').click();
    await panel.locator('#status').filter({hasText: '2 matching unread conversations selected on this page.'}).waitFor();
    const selected = await page.locator('tr').evaluateAll(rows => rows.filter(r => r.querySelector('[role="checkbox"][aria-checked="true"]')).map(r => r.getAttribute('data-legacy-thread-id')));
    check(JSON.stringify(selected) === JSON.stringify(['i1', 'i2']), 'current-page selection excludes read, starred, important, mixed and unknown senders');
    check((await page.evaluate(() => window.testState)).deleted === 0, 'selection never clicks Gmail Delete');
    await panel.locator('#close').click();
    await toolbar.getByRole('button', {name: 'Select usual deletes'}).click();
    await idle();
    check(!await panel.locator('#panel').isVisible() && await page.locator('tr [role="checkbox"][aria-checked="true"]').count() === 2, 'toolbar selection works without opening the settings panel');
    await panel.locator('#toast').waitFor({state: 'hidden'});
    check(true, 'selection feedback disappears automatically');
    await openPanel();
    await panel.locator('#sender-details summary').click();
    await panel.locator('#email').fill('shop@example.com');
    await panel.locator('#add-form button').click();
    await panel.locator('#status').filter({hasText: 'Sender added.'}).waitFor();
    check(await panel.locator('#sender-count').textContent() === '2', 'manual sender addition is immediately available');
    await panel.getByLabel('Rule for shop@example.com', {exact: true}).selectOption('never');
    await panel.locator('#status').filter({hasText: 'Sender rule saved.'}).waitFor();
    check(await panel.locator('#sender-count').textContent() === '1', 'never-select rule overrides learned and manual rules');
    await panel.getByLabel('Rule for offers@example.com', {exact: true}).selectOption('never');
    await idle();
    await panel.locator('#email').fill('no-mail@example.com');
    await panel.locator('#add-form button').click();
    await idle();
    await page.locator('[data-legacy-thread-id="i4"] [role="checkbox"]').click();
    await openPanel();
    await panel.locator('#select').click();
    await idle();
    check(await page.locator('tr [role="checkbox"][aria-checked="true"]').count() === 0, 'a zero-match selection clears unrelated pre-existing checkboxes');
    await panel.getByLabel('Rule for no-mail@example.com', {exact: true}).selectOption('forget');
    await idle();
    await panel.getByLabel('Rule for offers@example.com', {exact: true}).selectOption('auto');
    await idle();
    await panel.locator('#across').check();
    await panel.locator('#status').filter({hasText: 'Settings saved.'}).waitFor();
    await panel.locator('#select').click();
    await idle();
    check(!(await page.evaluate(() => window.testState)).all && await page.locator('tr [role="checkbox"][aria-checked="true"]').count() === 2, 'mixed-sender results prevent automatic selection across pages');
    await page.evaluate(() => { location.hash = '#inbox'; });
    await page.locator('[data-legacy-thread-id="i4"]').waitFor();
    await page.evaluate(() => { window.testState.includeMixed = false; });
    await panel.locator('#select').click();
    await panel.locator('#status').filter({hasText: 'All conversations matching the Gmail search are selected'}).waitFor();
    check((await page.evaluate(() => window.testState)).all === true, 'one click uses Gmail native selection across all result pages');
    check(decodeURIComponent(page.url()).includes('in:inbox is:unread -is:starred -is:important'), 'whole-inbox search retains unread and protection filters');
    // Repeated clicks must not invert or accumulate selection.
    await panel.locator('#select').click();
    await idle();
    await page.waitForFunction(() => window.testState.all);
    check((await page.evaluate(() => window.testState)).all, 'repeated selection remains selected');
    await page.evaluate(() => { location.hash = '#inbox'; });
    await page.locator('[data-legacy-thread-id="i4"]').waitFor();
    await panel.locator('#select').click();
    await panel.locator('#status').filter({hasText: 'Finding matching unread conversations'}).waitFor();
    await page.evaluate(() => { location.hash = '#sent'; });
    await idle();
    check((await panel.locator('#status').textContent()).includes('view changed'), 'navigating away cancels an in-flight selection');
    await page.evaluate(() => { location.hash = '#inbox'; });
    await page.locator('[data-legacy-thread-id="i1"]').waitFor();
    await panel.locator('#close').click();
    await page.locator('[data-legacy-thread-id="i1"] .subject').click();
    await page.waitForTimeout(1400);
    const data = await worker.evaluate(async () => (await chrome.storage.local.get('account:me@example.com'))['account:me@example.com']);
    check(data.senders['offers@example.com'].opened === 1, 'opening a conversation supplies negative learning evidence');
    await page.evaluate(() => { location.hash = '#inbox'; });
    await openPanel();
    await panel.locator('#sender-count').filter({hasText: '0'}).waitFor();
    check(true, 'negative evidence removes a low-confidence automatic sender');
    // Changing Gmail's account menu identity must select a separate storage bucket.
    await page.locator('header a').evaluate(node => node.setAttribute('aria-label', 'Google Account: Other (other@example.com)'));
    await openPanel();
    await panel.locator('#account').filter({hasText: 'other@example.com'}).waitFor();
    check(await panel.locator('#sender-count').textContent() === '0', 'changing Gmail accounts does not carry sender rules over');
    check(errors.length === 0, `no browser JavaScript errors (${errors.join('; ')})`);
    // Put the synthetic demo in a useful state for visual QA.
    await page.locator('header a').evaluate(node => node.setAttribute('aria-label', 'Google Account: Demo (me@example.com)'));
    await openPanel();
    await panel.locator('#account').filter({hasText: 'me@example.com'}).waitFor();
    await panel.getByLabel('Rule for offers@example.com', {exact: true}).selectOption('always');
    await panel.locator('#status').filter({hasText: 'Sender rule saved.'}).waitFor();
    await panel.locator('details').nth(1).locator('summary').click();
    await panel.locator('#sender-details summary').click();
    await panel.locator('#close').click();
    await page.screenshot({path: process.env.PREVIEW_PATH || path.join(extensionPath, '..', 'usual-delete-preview.png')});
    check(await worker.evaluate(() => UsualCore.DEFAULTS.dailyLearning), 'daily learning is enabled by default for new and migrated accounts');
    await worker.evaluate(async () => {
      const key = 'account:me@example.com'; const account = (await chrome.storage.local.get(key))[key];
      account.daily.lastCompletedAt = Date.now() - UsualCore.DAY - 1000; account.daily.nextAttemptAt = 0;
      await chrome.storage.local.set({[key]: account});
    });
    await openPanel();
    await panel.locator('details').nth(1).locator('summary').click();
    const originalUrl = page.url(); const previousOpened = (await page.evaluate(() => window.testState)).opened;
    const helperCreated = context.waitForEvent('page');
    await panel.locator('#daily').check();
    const helper = await helperCreated;
    helper.on('pageerror', error => errors.push(error.message));
    // Extension-created initial navigations can start before Playwright attaches
    // request interception. Replay it through the fixture; never use a Gmail login.
    await helper.goto('https://mail.google.com/mail/u/0/#search/' + encodeURIComponent('in:trash is:unread'));
    try { await helper.waitForEvent('close', {timeout: 45000}); }
    catch (error) {
      console.error('DAILY DEBUG', await worker.evaluate(async () => {
        const data = await chrome.storage.local.get(null);
        return {job: data['ud:daily-job'], daily: data['account:me@example.com']?.daily, tabs: (await chrome.tabs.query({url: 'https://mail.google.com/*'})).map(t => ({id: t.id, active: t.active, url: t.url}))};
      }), await helper.evaluate(() => {
        const root = document.getElementById('usual-delete-root')?.shadowRoot;
        return {hash: location.hash, rows: document.querySelectorAll('tr.zA').length, account: root?.getElementById('account')?.textContent, status: root?.getElementById('status')?.textContent};
      }), errors);
      throw error;
    }
    const automatic = await worker.evaluate(async () => (await chrome.storage.local.get('account:me@example.com'))['account:me@example.com']);
    check(automatic.daily.lastSource === 'automatic' && automatic.daily.lastPages === 2 && Date.now() - automatic.daily.lastCompletedAt < 30000, 'daily learning scans multiple Trash pages and records completion');
    check(page.url() === originalUrl && (await page.evaluate(() => window.testState)).opened === previousOpened && (await page.evaluate(() => window.testState)).deleted === 0, 'automatic learning leaves the user’s view and messages untouched');
    const scheduled = await worker.evaluate(async () => { await queue; return chrome.alarms.get('ud:daily-learning'); });
    check(scheduled && scheduled.scheduledTime >= automatic.daily.lastCompletedAt + 24 * 60 * 60 * 1000, 'the next automatic scan is scheduled no earlier than 24 hours later');
    await panel.locator('#daily').uncheck();
    await idle();
    check(!(await worker.evaluate(async () => (await chrome.storage.local.get('account:me@example.com'))['account:me@example.com'].settings.dailyLearning)), 'automatic learning can be disabled in settings');
    console.log(`${checks} browser checks passed using the actual unpacked extension on intercepted synthetic Gmail pages. No live Gmail data was accessed.`);
  } finally {
    await context.close();
    await fs.rm(profile, {recursive: true, force: true});
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
