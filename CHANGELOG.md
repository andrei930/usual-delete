# Changelog

## 1.1.0 — 2026-11-02

- Replace the toolbar label with an accessible checklist icon matching Gmail’s controls.
- Fix pointer flicker by keeping the toolbar node stable during hover-related DOM mutations.
- Enable automatic daily Trash learning by default for new and existing accounts.
- Scan in a temporary inactive tab with account validation, cancellation on user takeover, cleanup, retries, and persistence across service-worker restarts.
- Add scan status and a daily-learning switch; add the local alarms permission.
- Extend automated coverage for scheduling, migration, hover stability, and the complete background scan.

## 1.0.2 — 2026-11-02

- Move Select usual deletes into Gmail’s toolbar, between Select all and Refresh.
- Remove the floating action buttons and keep settings available through the Chrome toolbar popup.
- Keep the settings panel closed during normal selection and show brief feedback that disappears automatically.
- Restore the selection button when Gmail replaces toolbar elements.

## 1.0.1 — 2026-11-02

- Read Gmail’s importance state from the accessible switch surrounding its icon.
- Activate native pagination buttons through their mouse-down/up handlers so Trash learning advances across pages.
- Extend the synthetic Gmail fixture to cover both behaviors.

## 1.0.0 — 2026-11-02

- Initial Gmail selector with local sender learning from unread mail in Trash.
- One-click unread inbox selection, manual sender overrides, per-account data isolation, and confidence feedback from observed opens.
- Settings panel, Chrome toolbar popup, installation and privacy documentation, and automated model, storage, and browser checks.
