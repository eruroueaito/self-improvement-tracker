# ADR 0002: Storage and time facts

- Status: Accepted
- Date: 2026-08-04

Android uses Capacitor Community SQLite. The browser development shell uses a versioned localStorage adapter and tests use an in-memory adapter implementing the same repository contract.

Timers persist absolute timestamps and accumulated duration. Notifications are best-effort reminders and never determine whether a countdown completed. Settlement writes the Session, reward ledger entry, and companion projection atomically.
