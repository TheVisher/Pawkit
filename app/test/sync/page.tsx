'use client';

import { useState } from 'react';
import { runAllTests } from '@/lib/services/__tests__/sync-service.test';

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  passRate: number;
  results: Array<{
    name: string;
    status: 'pass' | 'fail' | 'skip';
    duration: number;
    error?: Error;
  }>;
}

export default function SyncTestPage() {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const runTests = async () => {
    setRunning(true);
    setSummary(null);
    setLogs([]);

    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    const capturedLogs: string[] = [];

    console.log = (...args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      capturedLogs.push(message);
      originalLog(...args);
    };

    console.error = (...args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      capturedLogs.push(`ERROR: ${message}`);
      originalError(...args);
    };

    try {
      const result = await runAllTests();
      setSummary(result);
    } catch (error) {
      console.error('Test suite crashed:', error);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      setLogs(capturedLogs);
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Sync Service Test Suite</h1>
          <p className="text-gray-600 mb-6">
            Comprehensive tests for sync safety, data loss prevention, and conflict resolution
          </p>

          <div className="mb-6">
            <button
              onClick={runTests}
              disabled={running}
              className={`px-6 py-3 rounded-lg font-medium ${
                running
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {running ? 'Running Tests...' : 'Run All Tests'}
            </button>
          </div>

          {summary && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Test Summary</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Total Tests</div>
                  <div className="text-2xl font-bold">{summary.total}</div>
                </div>

                <div className="bg-green-100 rounded-lg p-4">
                  <div className="text-sm text-green-600">Passed</div>
                  <div className="text-2xl font-bold text-green-700">{summary.passed}</div>
                </div>

                <div className="bg-red-100 rounded-lg p-4">
                  <div className="text-sm text-red-600">Failed</div>
                  <div className="text-2xl font-bold text-red-700">{summary.failed}</div>
                </div>

                <div className="bg-blue-100 rounded-lg p-4">
                  <div className="text-sm text-blue-600">Pass Rate</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {summary.passRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-sm text-gray-600 mb-2">Duration</div>
                <div className="text-lg font-semibold">{summary.duration}ms</div>
              </div>

              <h3 className="text-xl font-bold mb-4">Test Results</h3>
              <div className="space-y-2">
                {summary.results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      result.status === 'pass'
                        ? 'bg-green-50 border-green-500'
                        : result.status === 'fail'
                        ? 'bg-red-50 border-red-500'
                        : 'bg-gray-50 border-gray-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️'}
                          </span>
                          <span className="font-medium">{result.name}</span>
                        </div>
                        {result.error && (
                          <div className="mt-2 text-sm text-red-600 font-mono bg-red-100 p-2 rounded">
                            {result.error.message}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 ml-4">
                        {result.duration}ms
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Console Output</h2>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!running && !summary && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <h3 className="font-bold text-blue-900 mb-2">Test Coverage</h3>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Multi-tab sync coordination</li>
                <li>Network timeout handling</li>
                <li>Failed push retry</li>
                <li>Deletion conflict resolution</li>
                <li>Partial sync failure recovery</li>
                <li>Metadata quality scoring</li>
                <li>Active device preference</li>
              </ul>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Test Suite Documentation</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">1. Multi-Tab Sync Coordination</h3>
              <p className="text-gray-600">
                Validates BroadcastChannel-based cross-tab coordination. Tests that only one tab can sync at a time,
                SYNC_START/SYNC_END messages are broadcasted, and concurrent sync calls return the same promise.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">2. Network Timeout Handling</h3>
              <p className="text-gray-600">
                Validates 30-second timeout protection on network requests. Tests that timeouts are properly enforced,
                syncPromise is cleared after timeout, and sync can be retried after errors.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">3. Failed Push Retry</h3>
              <p className="text-gray-600">
                Validates that failed push operations are queued for automatic retry. Tests sync queue initialization,
                failed operations being added to queue, and queue processing on subsequent syncs.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">4. Deletion Conflict Resolution</h3>
              <p className="text-gray-600">
                Validates timestamp-based deletion conflict handling. Tests that newer deletions win over older edits,
                newer edits win over older deletions, server resurrections are detected, and stale deletions are rejected.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">5. Partial Sync Failure Recovery</h3>
              <p className="text-gray-600">
                Validates independent resource syncing and rollback mechanism. Tests that cards sync independently from
                collections, snapshots are created before pull, rollback restores data on critical failures, and network
                errors don&apos;t trigger rollback.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">6. Metadata Quality Scoring</h3>
              <p className="text-gray-600">
                Validates quality-based conflict resolution. Tests that rich metadata scores higher than empty metadata,
                URL titles don&apos;t score points, short descriptions don&apos;t score, and small metadata objects don&apos;t score.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">7. Active Device Preference</h3>
              <p className="text-gray-600">
                Validates smart active device time threshold. Tests that active device wins within 1-hour threshold,
                but server wins if significantly newer (&gt; 1 hour), overriding active device preference.
              </p>
            </div>
          </div>

          <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <h3 className="font-bold text-yellow-900 mb-2">⚠️ Important Notes</h3>
            <ul className="list-disc list-inside text-yellow-800 space-y-1">
              <li>These tests run in the browser environment with real IndexedDB and BroadcastChannel</li>
              <li>Some tests may require network connectivity to fully validate sync behavior</li>
              <li>Multi-tab tests work best when tested across multiple browser tabs</li>
              <li>Check browser console for detailed test output and debugging information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
