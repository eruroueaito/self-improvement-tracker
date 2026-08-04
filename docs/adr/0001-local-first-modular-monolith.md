# ADR 0001: Local-first modular monolith

- Status: Accepted
- Date: 2026-08-04

Use a TypeScript modular monolith organized around Goals, Recommendations, Sessions, and Rewards. Domain modules do not import React, Capacitor, SQLite, or browser APIs. UI calls one application facade, while adapters implement explicit ports.

This keeps the core deterministic and testable without introducing a distributed system, event bus, dependency injection framework, or speculative plugin architecture.
