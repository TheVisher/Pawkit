# Pawkit Testing Standards & Philosophy

**Purpose**: Document testing approach, standards, and best practices for the Pawkit project

**Philosophy**: Test data integrity and critical flows, not UI pixels. 90%+ pass rate required for merge.

---

## TESTING PHILOSOPHY

### What We Test

**Focus on Data Integrity**:
- ✅ Data persistence (IndexedDB, server sync)
- ✅ CRUD operations (create, read, update, delete)
- ✅ Conflict resolution (409 errors, duplicate detection)
- ✅ Multi-session sync (cross-tab communication)
- ✅ Data migration (Den migration, schema changes)
- ✅ Critical user flows (add card, edit note, move to collection)
- ✅ API contracts (request/response validation)

**Don't Test**:
- ❌ UI pixel perfection (use visual review instead)
- ❌ CSS styling (use design system review instead)
- ❌ Animation timing (manual testing only)
- ❌ Browser-specific quirks (test in target browsers manually)

### When to Test

**Required Before Merge**:
1. **New CRUD operations** - Test create, read, update, delete
2. **Data model changes** - Test migrations and backward compatibility
3. **Sync operations** - Test server sync, conflict resolution, deduplication
4. **Multi-session features** - Test cross-tab communication, write guards
5. **Critical user flows** - Test end-to-end workflows

**Not Required**:
- Minor UI tweaks (color, spacing, typography)
- Non-critical features (experimental, beta)
- Temporary debugging code
- Documentation changes

### Why We Test

**Primary Goals**:
1. **Prevent data loss** - Users' data is sacred
2. **Catch regressions** - Ensure old features still work
3. **Document expected behavior** - Tests serve as living documentation
4. **Enable confident refactoring** - Change code without fear
5. **Maintain quality** - 90%+ pass rate ensures stability

**What Success Looks Like**:
- Zero data loss incidents
- <1% error rate in production
- 90%+ test pass rate before merge
- Critical flows covered
- Fast feedback loop (tests run in <2 minutes)

---

## TEST STRUCTURE

### Pre-Merge Test Suite Pattern

**Location**: `/app/(dashboard)/test/pre-merge-suite/page.tsx`

**Structure**:
```tsx
// Visual test runner with color-coded results
export default function PreMergeSuite() {
  const [results, setResults] = useState<TestResult[]>([]);

  const runTests = async () => {
    const testResults = [];

    // Section 1: CRUD Operations
    testResults.push(await testCRUDOperations());

    // Section 2: Data Migration
    testResults.push(await testDenMigration());

    // Section 3: Sync Operations
    testResults.push(await testSyncConflicts());

    setResults(testResults);
  };

  return (
    <div>
      <h1>Pre-Merge Test Suite</h1>
      <button onClick={runTests}>Run All Tests</button>
      <TestResults results={results} />
    </div>
  );
}
```

**Test Result Format**:
```tsx
interface TestResult {
  section: string;         // "CRUD Operations"
  name: string;            // "Create card with URL"
  status: 'pass' | 'fail' | 'warn';
  message?: string;        // Error details or warnings
  duration?: number;       // Execution time in ms
}
```

**Color Coding**:
- ✅ Green: Test passed
- ❌ Red: Test failed (blocking)
- ⚠️ Yellow: Warning (non-blocking, needs manual verification)

---

## TEST CATEGORIES

### 1. CRUD Operations (9 tests)

**Purpose**: Verify basic data operations work correctly

**Tests**:
- Create card with URL
- Create card without URL
- Read card by ID
- Update card title
- Update card content
- Delete card (moves to trash)
- Restore card from trash
- Permanently delete card
- Verify IndexedDB persistence

**Example**:
```tsx
async function testCreateCard(): Promise<TestResult> {
  try {
    const card = await createCard({
      url: 'https://example.com',
      title: 'Test Card'
    });

    // Verify card created
    if (!card.id) throw new Error('Card ID missing');

    // Verify persisted to IndexedDB
    const stored = await getCardFromIndexedDB(card.id);
    if (!stored) throw new Error('Card not in IndexedDB');

    return { section: 'CRUD', name: 'Create card', status: 'pass' };
  } catch (error) {
    return {
      section: 'CRUD',
      name: 'Create card',
      status: 'fail',
      message: error.message
    };
  }
}
```

**Pass Criteria**:
- All 9 tests must pass (100%)
- Zero data loss
- IndexedDB and server in sync

---

### 2. Data Migration (6 tests)

**Purpose**: Verify migrations don't break existing data

**Tests**:
- Verify `inDen` field deprecated (no cards have `inDen=true`)
- Verify `the-den` collection exists
- Verify `the-den` marked as private
- Test Den filtering in Library view
- Test `is:den` search operator
- Verify Den UI routes accessible

**Example**:
```tsx
async function testDenMigration(): Promise<TestResult> {
  try {
    // Check no cards have inDen=true
    const denCards = await prisma.card.findMany({
      where: { inDen: true }
    });

    if (denCards.length > 0) {
      return {
        section: 'Migration',
        name: 'inDen deprecated',
        status: 'warn',
        message: `${denCards.length} cards still have inDen=true`
      };
    }

    // Verify the-den collection exists
    const denCollection = await prisma.collection.findUnique({
      where: { slug: 'the-den' }
    });

    if (!denCollection) {
      throw new Error('the-den collection not found');
    }

    if (!denCollection.isPrivate) {
      throw new Error('the-den collection not marked private');
    }

    return { section: 'Migration', name: 'Den migration', status: 'pass' };
  } catch (error) {
    return {
      section: 'Migration',
      name: 'Den migration',
      status: 'fail',
      message: error.message
    };
  }
}
```

**Pass Criteria**:
- All migration tests pass or warn (0 failures)
- Warnings acceptable if documented
- Manual verification required for UI routes

---

### 3. Data Validation (4 tests)

**Purpose**: Ensure data integrity constraints enforced

**Tests**:
- Duplicate URL detection
- Invalid data rejection
- Orphaned reference cleanup
- Field constraint validation

**Example (409 Conflict Handling)**:
```tsx
async function testDuplicateDetection(): Promise<TestResult> {
  try {
    const url = 'https://example.com/duplicate-test';

    // Create first card
    const card1 = await createCard({ url, title: 'First' });

    // Try to create duplicate
    const response = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title: 'Duplicate' })
    });

    // Should return 409 Conflict
    if (response.status !== 409) {
      throw new Error(`Expected 409, got ${response.status}`);
    }

    // Should return existing card
    const data = await response.json();
    if (data.card.id !== card1.id) {
      throw new Error('Did not return existing card');
    }

    return {
      section: 'Validation',
      name: '409 conflict handling',
      status: 'pass'
    };
  } catch (error) {
    return {
      section: 'Validation',
      name: '409 conflict handling',
      status: 'fail',
      message: error.message
    };
  }
}
```

**Pass Criteria**:
- Database constraints enforced (unique URLs)
- 409 responses include existing card
- Invalid data rejected with clear errors
- No orphaned references in database

---

### 4. Private Pawkits (4 tests)

**Purpose**: Verify privacy isolation works

**Tests**:
- Create private collection
- Verify isolation from other users
- Test access control
- Verify persistence across sessions

**Example**:
```tsx
async function testPrivateCollection(): Promise<TestResult> {
  try {
    // Create private collection
    const collection = await createCollection({
      name: 'Secret Project',
      isPrivate: true
    });

    // Add card to private collection
    const card = await createCard({
      url: 'https://example.com/secret',
      collectionId: collection.slug
    });

    // Verify card is private
    if (!card.isPrivate) {
      throw new Error('Card not marked private');
    }

    // Verify doesn't appear in public views
    const publicCards = await getPublicCards();
    const foundInPublic = publicCards.some(c => c.id === card.id);

    if (foundInPublic) {
      throw new Error('Private card visible in public view');
    }

    return {
      section: 'Privacy',
      name: 'Private collection isolation',
      status: 'pass'
    };
  } catch (error) {
    return {
      section: 'Privacy',
      name: 'Private collection isolation',
      status: 'fail',
      message: error.message
    };
  }
}
```

**Pass Criteria**:
- Private cards never appear in public views
- isPrivate flag persists across sessions
- Access control enforced at API level
- Private collections isolated per user

---

### 5. Multi-Session Sync (7 tests)

**Purpose**: Verify cross-tab communication and conflict resolution

**Tests**:
- Detect multiple sessions
- Write guards block inactive sessions
- Active device tracking
- Cross-tab communication
- Sync conflict resolution
- Deduplication across sessions
- BroadcastChannel fallback

**Example**:
```tsx
async function testMultiSessionDetection(): Promise<TestResult> {
  try {
    // Register first session
    const session1 = registerSession();

    // Simulate second session (same user, different tab)
    const session2 = registerSession();

    // Check if both detected
    const activeSessions = getActiveSessions();

    if (activeSessions.length !== 2) {
      throw new Error(`Expected 2 sessions, found ${activeSessions.length}`);
    }

    // Verify write guard on second session
    const canWrite = checkWritePermission(session2.id);

    if (canWrite && session2.id !== getActiveSessionId()) {
      return {
        section: 'Multi-Session',
        name: 'Write guards',
        status: 'warn',
        message: 'Inactive session allowed to write'
      };
    }

    return {
      section: 'Multi-Session',
      name: 'Session detection',
      status: 'pass'
    };
  } catch (error) {
    return {
      section: 'Multi-Session',
      name: 'Session detection',
      status: 'fail',
      message: error.message
    };
  }
}
```

**Pass Criteria**:
- Multiple sessions detected correctly
- Write guards prevent conflicts
- Cross-tab updates propagate
- Manual testing required for BroadcastChannel

**⚠️ Requires Manual Testing**:
- Open 2 browser tabs
- Verify banner appears
- Test "Take Control" button
- Verify write guards work
- Test card creation in both tabs

---

### 6. Critical User Flows (4 tests)

**Purpose**: Verify end-to-end workflows

**Tests**:
- Quick add card flow
- Edit note flow
- Move card to collection flow
- Search and filter flow

**Example**:
```tsx
async function testQuickAddFlow(): Promise<TestResult> {
  try {
    // Simulate user quick-add
    const url = 'https://example.com/quick-add';

    // Step 1: Paste URL in omni bar
    const card = await quickAddCard(url);

    if (!card.id) throw new Error('Card not created');

    // Step 2: Verify appears in Library
    const libraryCards = await getLibraryCards();
    if (!libraryCards.find(c => c.id === card.id)) {
      throw new Error('Card not in Library');
    }

    // Step 3: Verify synced to server
    const serverCard = await fetch(`/api/cards/${card.id}`).then(r => r.json());
    if (!serverCard) throw new Error('Card not on server');

    // Step 4: Verify in IndexedDB
    const localCard = await getCardFromIndexedDB(card.id);
    if (!localCard) throw new Error('Card not in IndexedDB');

    return {
      section: 'User Flows',
      name: 'Quick add card',
      status: 'pass'
    };
  } catch (error) {
    return {
      section: 'User Flows',
      name: 'Quick add card',
      status: 'fail',
      message: error.message
    };
  }
}
```

**Pass Criteria**:
- Flow completes without errors
- Data persists to all storage layers
- UI updates reflect changes
- No data loss at any step

---

### 7. API Endpoints (8 tests)

**Purpose**: Verify API contracts

**Tests**:
- GET /api/cards (200 response, array of cards)
- POST /api/cards (201 created, returns card)
- PATCH /api/cards/:id (200 updated, returns card)
- DELETE /api/cards/:id (204 no content)
- GET /api/pawkits (200 response, array of collections)
- POST /api/pawkits (201 created, returns collection)
- PATCH /api/pawkits/:id (200 updated)
- DELETE /api/pawkits/:id (204 no content)

**Example**:
```tsx
async function testCardsAPI(): Promise<TestResult> {
  try {
    // Test POST /api/cards
    const createResponse = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/api-test',
        title: 'API Test Card'
      })
    });

    if (createResponse.status !== 201) {
      throw new Error(`Expected 201, got ${createResponse.status}`);
    }

    const card = await createResponse.json();
    if (!card.id) throw new Error('No card ID returned');

    // Test GET /api/cards/:id
    const getResponse = await fetch(`/api/cards/${card.id}`);
    if (getResponse.status !== 200) {
      throw new Error(`Expected 200, got ${getResponse.status}`);
    }

    // Test PATCH /api/cards/:id
    const updateResponse = await fetch(`/api/cards/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' })
    });

    if (updateResponse.status !== 200) {
      throw new Error(`Expected 200, got ${updateResponse.status}`);
    }

    // Test DELETE /api/cards/:id
    const deleteResponse = await fetch(`/api/cards/${card.id}`, {
      method: 'DELETE'
    });

    if (deleteResponse.status !== 204) {
      throw new Error(`Expected 204, got ${deleteResponse.status}`);
    }

    return {
      section: 'API',
      name: 'Cards API',
      status: 'pass'
    };
  } catch (error) {
    return {
      section: 'API',
      name: 'Cards API',
      status: 'fail',
      message: error.message
    };
  }
}
```

**Pass Criteria**:
- All endpoints return expected status codes
- Response bodies match TypeScript types
- Error handling returns structured errors
- CORS headers present

---

## TEST TARGETS

### Pre-Merge Requirements

**Minimum Pass Rate**: 90%

**Calculation**:
```
Pass Rate = (Passed + Warnings) / Total Tests * 100
```

**Example from Current Suite**:
- Total: 42 tests
- Passed: 38 tests (✅)
- Warnings: 4 tests (⚠️)
- Failed: 0 tests (❌)
- **Pass Rate**: (38 + 4) / 42 = 100% ✅

**Acceptable Warning Scenarios**:
- Multi-session tests (require manual verification)
- BroadcastChannel tests (browser-specific)
- UI route tests (manual testing required)
- Migration warnings (documented edge cases)

**Blocking Failures**:
- Any CRUD operation failure
- Any data loss scenario
- API endpoint returning wrong status
- Privacy isolation breach
- Data validation bypass

---

## MANUAL TESTING REQUIREMENTS

### When Manual Testing Required

**Always Requires Manual Testing**:
1. **Multi-session conflicts** - Open 2 browser tabs, test simultaneously
2. **BroadcastChannel** - Test cross-tab communication in different browsers
3. **Real-time sync** - Verify updates propagate across sessions
4. **UI interactions** - Button clicks, modal opens, navigation
5. **Browser compatibility** - Test in Chrome, Firefox, Safari, Edge
6. **Mobile responsiveness** - Test on iOS and Android devices

### Manual Test Checklist

**Multi-Session Testing**:
- [ ] Open 2 browser tabs with same user
- [ ] Verify multi-session banner appears
- [ ] Test "Take Control" button
- [ ] Verify write guards block inactive session
- [ ] Create card in active session, verify appears in both
- [ ] Try to create card in inactive session, verify blocked
- [ ] Close one tab, verify other becomes active

**Sync Testing**:
- [ ] Create card in Tab 1
- [ ] Verify appears in Tab 2 within 5 seconds
- [ ] Edit card in Tab 2
- [ ] Verify updates in Tab 1
- [ ] Test with internet disconnected (offline queue)
- [ ] Reconnect, verify sync completes

**Privacy Testing**:
- [ ] Create private collection
- [ ] Add card to private collection
- [ ] Open incognito window (different user)
- [ ] Verify private card not visible
- [ ] Log in as original user
- [ ] Verify private card visible

**Den Migration Testing**:
- [ ] Query for cards with `inDen=true`
- [ ] Verify count is 0
- [ ] Navigate to `/den` route
- [ ] Verify old Den items appear in "The Den" collection
- [ ] Test `is:den` search operator
- [ ] Verify returns cards from "The Den"

---

## CURRENT TEST SUITE EXAMPLES

### Pre-Merge Suite (October 2025)

**Location**: `/app/(dashboard)/test/pre-merge-suite/page.tsx`

**Stats**:
- Total Tests: 42
- Pass Rate: 91% (38 passed, 4 warnings, 0 failed)
- Execution Time: ~2 seconds
- Sections: 7

**Test Sections**:

1. **CRUD Operations** (9 tests)
   - Create, read, update, delete cards
   - IndexedDB persistence
   - Trash and restore

2. **Den Migration** (6 tests)
   - inDen field deprecated
   - the-den collection exists
   - Privacy flag set
   - UI routes accessible

3. **Data Validation** (4 tests)
   - Duplicate detection
   - Invalid data rejection
   - Constraint enforcement

4. **Private Pawkits** (4 tests)
   - Isolation testing
   - Access control
   - Persistence

5. **Multi-Session Sync** (7 tests)
   - Session detection
   - Write guards
   - Cross-tab communication
   - Conflict resolution

6. **Critical User Flows** (4 tests)
   - Quick add card
   - Edit note
   - Move to collection
   - Search and filter

7. **API Endpoints** (8 tests)
   - Cards CRUD
   - Pawkits CRUD
   - Status codes
   - Response validation

### Notable Test Examples

**409 Conflict Handling** (from current suite):
```tsx
// Test duplicate URL detection returns 409 with existing card
const response = await fetch('/api/cards', {
  method: 'POST',
  body: JSON.stringify({ url: existingUrl })
});

expect(response.status).toBe(409);
expect(response.json().card.id).toBe(existingCard.id);
```

**Duplicate Detection** (from current suite):
```tsx
// Test database-level duplicate prevention
const card1 = await createCard({ url });
const card2 = await createCard({ url }); // Should return card1

expect(card2.id).toBe(card1.id);
expect(card2.isDuplicate).toBe(true);
```

**Cross-Tab Sync** (from current suite):
```tsx
// Test BroadcastChannel propagates updates
const session1 = openSession();
const session2 = openSession();

await session1.createCard({ url });

await waitFor(() => {
  const cards = session2.getCards();
  expect(cards.find(c => c.url === url)).toBeDefined();
});
```

---

## TESTING WORKFLOW

### For New Features

**Step 1: Write Tests First (TDD)**
```tsx
// 1. Define expected behavior
describe('New Feature', () => {
  it('should do X when Y happens', async () => {
    // Arrange: Set up test data
    const card = createTestCard();

    // Act: Perform action
    const result = await newFeature(card);

    // Assert: Verify outcome
    expect(result).toMatchExpectedBehavior();
  });
});
```

**Step 2: Implement Feature**
- Write minimum code to make tests pass
- Follow design system (`.claude/skills/pawkit-ui-ux/SKILL.md`)
- Follow conventions (`.claude/skills/pawkit-conventions/SKILL.md`)

**Step 3: Run Pre-Merge Suite**
```bash
# Open in browser
open http://localhost:3000/test/pre-merge-suite

# Click "Run All Tests"
# Verify 90%+ pass rate
```

**Step 4: Manual Testing**
- Follow manual test checklist
- Test in multiple browsers if UI changes
- Test multi-session scenarios if sync changes

**Step 5: Commit**
```bash
git add .
git commit -m "feat: add new feature with tests"
```

### For Bug Fixes

**Step 1: Reproduce Bug**
- Write test that reproduces the bug
- Confirm test fails

**Step 2: Fix Bug**
- Implement fix
- Verify test now passes

**Step 3: Add Regression Test**
- Add test to pre-merge suite
- Ensure bug can't return

**Step 4: Run Full Suite**
- Verify no other tests broke
- Check for side effects

---

## COMMON TEST PATTERNS

### Testing IndexedDB Operations

```tsx
async function testIndexedDBPersistence(): Promise<TestResult> {
  try {
    // Create data
    const card = await createCard({ url: 'https://example.com' });

    // Verify stored in IndexedDB
    const db = await openIndexedDB();
    const stored = await db.get('cards', card.id);

    if (!stored) throw new Error('Not persisted to IndexedDB');

    // Verify data integrity
    expect(stored.url).toBe(card.url);
    expect(stored.title).toBe(card.title);

    return { section: 'IndexedDB', name: 'Persistence', status: 'pass' };
  } catch (error) {
    return { section: 'IndexedDB', name: 'Persistence', status: 'fail', message: error.message };
  }
}
```

### Testing API Error Handling

```tsx
async function testAPIErrorHandling(): Promise<TestResult> {
  try {
    // Test invalid data rejection
    const response = await fetch('/api/cards', {
      method: 'POST',
      body: JSON.stringify({ url: 'invalid-url' }) // Missing required fields
    });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }

    const error = await response.json();
    if (!error.error) throw new Error('No error message returned');

    return { section: 'API', name: 'Error handling', status: 'pass' };
  } catch (error) {
    return { section: 'API', name: 'Error handling', status: 'fail', message: error.message };
  }
}
```

### Testing Race Conditions

```tsx
async function testRaceCondition(): Promise<TestResult> {
  try {
    const url = 'https://example.com/race-test';

    // Create 10 cards simultaneously with same URL
    const promises = Array(10).fill(null).map(() =>
      createCard({ url, title: 'Race Test' })
    );

    const cards = await Promise.all(promises);

    // All should have same ID (deduplication worked)
    const uniqueIds = new Set(cards.map(c => c.id));

    if (uniqueIds.size !== 1) {
      throw new Error(`Expected 1 card, created ${uniqueIds.size} duplicates`);
    }

    return { section: 'Race Conditions', name: 'Duplicate prevention', status: 'pass' };
  } catch (error) {
    return { section: 'Race Conditions', name: 'Duplicate prevention', status: 'fail', message: error.message };
  }
}
```

### Testing Sync Conflicts

```tsx
async function testSyncConflict(): Promise<TestResult> {
  try {
    // Simulate conflict: Edit same card in two sessions
    const card = await createCard({ title: 'Original' });

    // Session 1: Edit to "Version A"
    const session1Update = updateCard(card.id, { title: 'Version A' });

    // Session 2: Edit to "Version B" (simultaneous)
    const session2Update = updateCard(card.id, { title: 'Version B' });

    // Both updates should succeed
    await Promise.all([session1Update, session2Update]);

    // Last write wins (expected behavior)
    const finalCard = await getCard(card.id);

    if (!['Version A', 'Version B'].includes(finalCard.title)) {
      throw new Error('Conflict not resolved');
    }

    return { section: 'Sync', name: 'Conflict resolution', status: 'pass' };
  } catch (error) {
    return { section: 'Sync', name: 'Conflict resolution', status: 'fail', message: error.message };
  }
}
```

---

## DEBUGGING FAILED TESTS

### Step 1: Check Error Message

```tsx
// Failed test shows:
{
  section: 'CRUD',
  name: 'Create card',
  status: 'fail',
  message: 'Card not in IndexedDB'
}
```

**Look for**:
- Which assertion failed
- Expected vs actual values
- Stack trace (if available)

### Step 2: Isolate the Test

```tsx
// Run single test in isolation
async function debugTest() {
  const result = await testCreateCard();
  console.log('Test result:', result);

  // Add extra logging
  const card = await createCard({ url: 'https://example.com' });
  console.log('Created card:', card);

  const stored = await getCardFromIndexedDB(card.id);
  console.log('IndexedDB card:', stored);
}
```

### Step 3: Check Dependencies

- Is IndexedDB initialized?
- Is Zustand store hydrated?
- Is API server running?
- Are environment variables set?

### Step 4: Verify Test Data

```tsx
// Add test data validation
async function testWithValidation() {
  // Clear test data first
  await clearTestData();

  // Verify clean state
  const initialCards = await getAllCards();
  if (initialCards.length > 0) {
    console.warn('Test data not clean:', initialCards);
  }

  // Run test
  const result = await testCreateCard();

  // Clean up after
  await clearTestData();

  return result;
}
```

### Step 5: Check Browser Console

- Network tab: API requests/responses
- Application tab: IndexedDB contents
- Console: Error messages
- Storage: localStorage values

---

## BEST PRACTICES

### DO ✅

1. **Test data integrity, not UI**
   - Focus on data persistence, sync, validation
   - Don't test button colors or spacing

2. **Use realistic test data**
   - Real URLs, realistic titles
   - Edge cases: empty strings, special characters

3. **Clean up after tests**
   - Delete test data
   - Reset IndexedDB
   - Clear localStorage

4. **Test error cases**
   - Invalid input
   - Network failures
   - 409 conflicts

5. **Write clear test names**
   - "Create card with URL" (good)
   - "Test 1" (bad)

6. **Add helpful error messages**
   ```tsx
   throw new Error(`Expected 201, got ${response.status}`);
   ```

7. **Test critical paths first**
   - CRUD operations
   - Sync operations
   - User flows

8. **Document manual test steps**
   - Multi-session scenarios
   - BroadcastChannel tests

### DON'T ❌

1. **Don't test implementation details**
   - Test behavior, not internal state
   - Test outcomes, not process

2. **Don't test third-party libraries**
   - Trust React, Zustand, Prisma work
   - Test YOUR code

3. **Don't skip test cleanup**
   - Always delete test data
   - Prevent test pollution

4. **Don't write brittle tests**
   - Don't depend on exact timing
   - Don't depend on UI order

5. **Don't test UI pixels**
   - Use visual review instead
   - Manual testing for styling

6. **Don't aim for 100% coverage**
   - Focus on critical paths
   - 90%+ is excellent

7. **Don't write slow tests**
   - Keep suite under 2 minutes
   - Use mocks for external services

---

## RESOURCES

### Internal References

- **Test Suite**: `/app/(dashboard)/test/pre-merge-suite/page.tsx`
- **Test Utils**: `/lib/test-utils.ts` (if exists)
- **Mock Data**: `/lib/mock-data.ts` (if exists)

### External Resources

- **Testing Library**: https://testing-library.com
- **Jest Docs**: https://jestjs.io/docs/getting-started
- **Vitest Docs**: https://vitest.dev

---

## SUCCESS METRICS

**Before Merge**:
- ✅ 90%+ test pass rate
- ✅ Zero data loss scenarios
- ✅ All CRUD tests pass
- ✅ All API tests pass
- ✅ Manual multi-session test complete

**In Production**:
- <1% error rate
- Zero data loss incidents
- Sync success rate >99%
- User-reported bugs <5 per month

**Long-term**:
- Test suite runs in <2 minutes
- 80%+ code coverage on critical paths
- Regression rate <1 per quarter
- Fast feedback loop (<5 minutes to run all tests)

---

**Last Updated**: October 29, 2025
**Test Suite Version**: Pre-Merge Suite v1.0
**Pass Rate Target**: 90%+
**Current Pass Rate**: 91% (38 passed, 4 warnings, 0 failed)

**Philosophy**: Test data integrity and critical flows. 90%+ pass rate required for merge. Manual testing required for multi-session, BroadcastChannel, and real-time sync scenarios.
