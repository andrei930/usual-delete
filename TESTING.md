# Verification report

Verified November 2, 2026. Extension version 1.0.2.

## Toolbar verification for 1.0.2

The installed extension was updated and inspected in an existing Gmail session. Its button appears immediately after Select all and before Refresh, with no floating action controls. Text contrast was checked against Gmail’s dark theme, and settings were opened successfully through Chrome’s Extensions menu. No email was opened or deleted during the layout check.

The automated browser suite additionally verifies toolbar placement, removal of the floating controls, restoration after Gmail removes the toolbar element, selection without opening settings, and automatic dismissal of the brief feedback message.

## Live Gmail verification for 1.0.1

The extension was tested in an existing signed-in Chrome Gmail session with the account holder’s authorization. Trash learning completed across multiple pages, and one-click selection selected the matching unread inbox conversations. No message body was opened and no message was deleted. This verifies the tested layout, not every Gmail configuration.

Two live DOM differences were confirmed and fixed: Gmail puts importance state on a parent `role="switch"` element rather than the inner `.a9q` icon, and its Older toolbar button listens for mouse-down/up rather than a click event. The synthetic fixture reproduces both behaviors. No real mailbox screenshots, addresses, conversation IDs, or account-specific learning data are included in this repository.

## Completed

- **19 passing Node tests** for sender learning, minimum evidence, negative feedback, overrides, safe search construction, invalid inputs, event deduplication, account isolation, concurrent writes across tabs, paused learning, storage failures, sender removal, and reset scope.
- **25 passing browser checks** using the actual unpacked Manifest V3 extension, including its actual service worker and Chrome local-storage API, in a fresh temporary Chromium for Testing profile controlled by Playwright 1.64.1.
- The browser checks cover first-run state; two-page Trash training; returning to the original inbox; repeated scan deduplication; no messages opened during learning; current-page protection of read/starred/important/mixed-sender/unknown-sender rows; no automatic deletion; manual rules; never-select overrides; clearing unrelated selections when no candidates match; avoiding global selection when mixed-sender rows are visible; native selection across all search pages; inbox-only unread search; repeated selection; navigation cancellation; opening-based negative feedback; confidence reduction; Gmail account changes; and absence of browser JavaScript errors.
- Syntax checks for production JavaScript, manifest parsing, icon presence and dimensions, and ZIP integrity.
- Visual inspection of the extension’s settings panel in a synthetic Gmail inbox. The preview file shows synthetic messages, not anyone’s real mailbox.

## Test boundary

The automated browser suite intercepts requests to Gmail and serves `tests/gmail-fixture.html`. It exercises the real extension runtime against representative Gmail DOM fixtures and simulated native controls. It does **not** establish compatibility with every current live Gmail layout or language. The automated suite does not access a signed-in Gmail account. The separate, user-authorized live verification is described above.

Gmail can change its private markup, native control labels, and conversation behavior. The extension reports when it cannot confirm selection across pages and leaves the final delete action to you. Gmail search has conversation-level semantics; see README.md before deleting selected threads.

## Reproduce

From this folder, using Node 22 or newer:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

To use an already installed Chromium for Testing executable:

```sh
CHROMIUM_PATH="/absolute/path/to/chromium" npm run test:browser
```

The test profile is created in the OS temporary directory and removed on completion. The suite writes a preview PNG beside the extension folder by default; set `PREVIEW_PATH` to change that destination. No tests or development dependencies need to run for installation or normal extension use.
