# Privacy policy — Usual Delete 1.0.1

Updated November 2, 2026.

Usual Delete is a local Chrome extension that helps you select Gmail conversations. It has no operator-hosted backend, telemetry, analytics, advertisements, or remote AI service.

## Information processed

The content script inspects Gmail’s active account identifier, message-list sender addresses, unread state, star and importance markers, selection checkboxes, and conversation identifiers. These are used to identify repeat unread deletions in Trash and select similar inbox conversations. The extension does not open messages or inspect message bodies or attachments. Subject lines are not used for learning or saved.

The following are stored in this Chrome profile’s extension-local storage: Gmail account email addresses; sender addresses; counts of observed unread deletions and observed opens; rule overrides; settings; observation timestamps; and conversation IDs used to avoid counting the same observation twice.

## Transmission and sharing

The extension does not transmit stored information to any developer, third party, or AI provider. It does not use Chrome sync storage. It drives Gmail’s native interface, so Gmail itself processes searches and selections under your existing Google account. Google’s own privacy practices continue to apply to Gmail.

## Retention and controls

Information stays in this browser profile until you forget a sender, reset the account’s learning, or uninstall the extension. The most recent 20,000 observation records are retained per Gmail account; sender counts and rules persist until removed. Settings let you pause learning. Reset applies only to the active Gmail account. Uninstalling removes extension storage. The extension does not encrypt its local records.

## Permissions

`storage` allows local rules and settings to persist. Access to `https://mail.google.com/*` allows the Gmail content script to read message-list metadata and manipulate selection controls. The extension does not request access to other websites, contacts, or Google OAuth credentials.

## Mail actions

Usual Delete selects conversations and navigates Gmail search/Trash pages. It does not click Delete, send, archive, unsubscribe, mark messages read, open message bodies, or permanently remove mail. Review selections before applying Gmail actions yourself, especially when Gmail’s conversation view is enabled.
