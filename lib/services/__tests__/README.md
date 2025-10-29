# Sync Service Test Suite

This directory contains comprehensive tests for the sync service.

## Files

- **sync-service-test-utils.ts** - Test utilities, mock data generators, and TestRunner framework
- **sync-service.test.ts** - Comprehensive test suite with 26 test cases across 7 test suites

## Running Tests

### Browser-Based (Recommended)

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Navigate to test page:
   ```
   http://localhost:3002/test/sync
   ```

3. Click "Run All Tests"

### Console-Based

```javascript
import { runAllTests } from '@/lib/services/__tests__/sync-service.test';
await runAllTests();
```

## Test Coverage

- ✅ Multi-tab sync coordination (4 tests)
- ✅ Network timeout handling (3 tests)
- ✅ Failed push retry (4 tests)
- ✅ Deletion conflict resolution (4 tests)
- ✅ Partial sync failure recovery (5 tests)
- ✅ Metadata quality scoring (4 tests)
- ✅ Active device preference (2 tests)

**Total: 26 tests**

## Documentation

- **SYNC_SERVICE_TEST_SUITE.md** - Complete test documentation
- **SYNC_TEST_RESULTS.md** - Expected test results and analysis

## Test Utilities

### Mock Data Generators

```typescript
createMockCard(overrides?: Partial<CardDTO>): CardDTO
createMockCollection(overrides?: Partial<CollectionNode>): CollectionNode
createRichMetadataCard(overrides?: Partial<CardDTO>): CardDTO
createPoorMetadataCard(overrides?: Partial<CardDTO>): CardDTO
```

### TestRunner

```typescript
const runner = new TestRunner();

await runner.test('Test name', async () => {
  runner.assert(condition, 'Error message');
  runner.assertEqual(actual, expected);
  runner.assertContains(haystack, needle);
  await runner.waitFor(() => condition, { timeout: 5000 });
});

runner.printSummary();
```

### Time Helpers

```typescript
delay(ms: number): Promise<void>
dateInPast(minutes: number): string
dateInFuture(minutes: number): string
```

## Expected Results

- **Pass Rate:** 92-100% (some tests are network-dependent)
- **Duration:** ~3000-6000ms
- **Browser:** Chrome, Firefox, Safari 15.4+ (requires BroadcastChannel support)

## Contributing

To add new tests:

1. Add test function to `sync-service.test.ts`
2. Add to `runAllTests()`
3. Update documentation
4. Verify all tests still pass
