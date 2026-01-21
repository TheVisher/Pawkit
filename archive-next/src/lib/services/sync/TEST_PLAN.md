# Test Plan: Sync Service

This document outlines the test coverage for the Pawkit V2 Sync Service, corresponding to task #TEST-1.

## Scope

The tests verify the core functionality of the sync engine, ensuring robust data synchronization, conflict resolution, and queue management.

## Test Categories

### 1. Queue Management
- **FIFO Processing:** Ensures operations are processed in the order they were added.
- **Retry Logic:** Verifies exponential backoff and retry limits.
- **Failed Sync Parking:** Confirms items are parked after max retries to prevent blocking the queue.
- **Queue Merging:** Tests optimization strategies (e.g., merging multiple updates, replacing create+delete with nothing).

### 2. Entity Sync & Conflict Resolution
- **Last-Write-Wins:** Verifies the fundamental conflict resolution strategy.
- **Local Priority:** Ensures pending local changes are not overwritten by stale server data.
- **Deletion Handling:** Confirms deletions propagate correctly and respect priority.

### 3. Service Coordination
- **Workspace Isolation:** Verifies data is scoped to the correct workspace.
- **Offline Handling:** Ensures the service pauses gracefully when offline.
- **Cross-Tab Sync:** Tests `BroadcastChannel` communication to coordinate state across tabs.

### 4. API Error Handling
- **Auth Errors (401):** Ensures auth errors don't trigger infinite retries.
- **Not Found (404):** Verifies correct handling of operations on missing entities.
- **Idempotency:** Checks that duplicate creates (200 OK) are handled as successes.

## Implementation Details

The tests use `vitest` with `fake-indexeddb` to mock the local database. External dependencies like `fetch` and Zustand stores are mocked to isolate the sync logic.

## Running Tests

```bash
pnpm test
```
