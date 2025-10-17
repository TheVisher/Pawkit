'use client';

import { useEffect, useState } from 'react';
import { localStorage } from '@/lib/services/local-storage';
import { Button } from '@/components/ui/button';

export default function TestLocalStoragePage() {
  const [stats, setStats] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await localStorage.init();
        setInitialized(true);
        addLog('✅ Local storage initialized');

        const s = await localStorage.getStats();
        setStats(s);
        addLog(`📊 Stats loaded: ${JSON.stringify(s)}`);

        const c = await localStorage.getAllCards();
        setCards(c);
        addLog(`📦 Loaded ${c.length} cards`);
      } catch (error) {
        addLog(`❌ Error: ${error}`);
      }
    };

    init();
  }, []);

  const handleAddTestCard = async () => {
    try {
      const testCard: any = {
        id: `test-${Date.now()}`,
        url: `https://example.com/test-${Date.now()}`,
        title: 'Test Card from Local Storage',
        notes: 'This is saved directly to IndexedDB!',
        content: null,
        type: 'url',
        status: 'PENDING',
        collections: [],
        tags: ['test', 'local-first'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'test-user',
        deleted: false,
        deletedAt: null,
        pinned: false,
        domain: 'example.com',
        image: null,
        description: null,
        articleContent: null,
        metadata: undefined,
        inDen: false,
        encryptedContent: null,
        scheduledDate: null,
      };

      await localStorage.saveCard(testCard, { localOnly: true });
      addLog(`✅ Card saved: ${testCard.id}`);

      // Refresh data
      const c = await localStorage.getAllCards();
      setCards(c);

      const s = await localStorage.getStats();
      setStats(s);

      addLog(`📦 Total cards: ${c.length}`);
    } catch (error) {
      addLog(`❌ Error saving card: ${error}`);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const allCards = await localStorage.getAllCards();
      for (const card of allCards) {
        await localStorage.deleteCard(card.id);
      }

      setCards([]);
      const s = await localStorage.getStats();
      setStats(s);

      addLog(`🗑️ Deleted all ${allCards.length} cards`);
    } catch (error) {
      addLog(`❌ Error deleting: ${error}`);
    }
  };

  const handleExport = async () => {
    try {
      const data = await localStorage.exportAllData();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `local-storage-test-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addLog(`📤 Exported ${data.cards.length} cards`);
    } catch (error) {
      addLog(`❌ Error exporting: ${error}`);
    }
  };

  const handleRefresh = async () => {
    try {
      const c = await localStorage.getAllCards();
      setCards(c);

      const s = await localStorage.getStats();
      setStats(s);

      addLog(`🔄 Refreshed: ${c.length} cards`);
    } catch (error) {
      addLog(`❌ Error refreshing: ${error}`);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      addLog(`📥 Reading file: ${file.name}`);

      const text = await file.text();
      const data = JSON.parse(text);

      addLog(`📥 Importing ${data.cards?.length || 0} cards...`);

      await localStorage.importData(data);

      // Refresh UI
      const c = await localStorage.getAllCards();
      setCards(c);

      const s = await localStorage.getStats();
      setStats(s);

      addLog(`✅ Imported ${data.cards?.length || 0} cards successfully!`);
    } catch (error) {
      addLog(`❌ Error importing: ${error}`);
    }
  };

  if (!initialized) {
    return (
      <div className="p-8">
        <div className="text-center">⏳ Initializing local storage...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Local Storage Layer 2 Test</h1>
        <p className="text-gray-400">
          Test the local-first IndexedDB storage layer
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Stats Panel */}
        <div className="border border-gray-800 rounded-lg p-6 bg-gray-950">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            📊 Storage Stats
          </h2>
          {stats ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Cards:</span>
                <span className="font-mono">{stats.totalCards}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Modified Cards:</span>
                <span className="font-mono text-yellow-400">{stats.modifiedCards}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Collections:</span>
                <span className="font-mono">{stats.totalCollections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Sync:</span>
                <span className="font-mono text-xs">
                  {stats.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Loading...</p>
          )}
        </div>

        {/* Actions Panel */}
        <div className="border border-gray-800 rounded-lg p-6 bg-gray-950">
          <h2 className="text-xl font-bold mb-4">🎮 Actions</h2>
          <div className="space-y-2">
            <Button onClick={handleAddTestCard} className="w-full">
              ➕ Add Test Card
            </Button>
            <Button onClick={handleRefresh} variant="outline" className="w-full">
              🔄 Refresh Data
            </Button>
            <Button onClick={handleExport} variant="outline" className="w-full">
              📤 Export Data
            </Button>
            <label className="w-full">
              <Button variant="outline" className="w-full cursor-pointer" asChild>
                <span>📥 Import Data</span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <Button onClick={handleDeleteAll} variant="destructive" className="w-full">
              🗑️ Delete All Cards
            </Button>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="border border-gray-800 rounded-lg p-6 bg-gray-950 mb-6">
        <h2 className="text-xl font-bold mb-4">📦 Cards in IndexedDB ({cards.length})</h2>
        {cards.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No cards yet. Click &quot;Add Test Card&quot; to create one.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {cards.map((card) => (
              <div
                key={card.id}
                className="border border-gray-700 rounded p-3 bg-gray-900 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{card.title || 'Untitled'}</h3>
                    <p className="text-xs text-gray-400 truncate">{card.url}</p>
                    {card.notes && (
                      <p className="text-xs text-gray-500 mt-1">{card.notes}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 ml-2">
                    {card.id.startsWith('temp-') && (
                      <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded">
                        Local Only
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-2 text-xs text-gray-500">
                  {card.tags?.map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 bg-purple-900/30 text-purple-400 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="border border-gray-800 rounded-lg p-6 bg-gray-950">
        <h2 className="text-xl font-bold mb-4">📝 Activity Log</h2>
        <div className="bg-black rounded p-4 font-mono text-xs max-h-64 overflow-y-auto">
          {log.length === 0 ? (
            <p className="text-gray-600">No activity yet...</p>
          ) : (
            log.map((entry, i) => (
              <div key={i} className="text-gray-300 mb-1">
                {entry}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 border border-blue-800 rounded-lg p-6 bg-blue-950/20">
        <h3 className="font-bold mb-2">🧪 Testing Instructions:</h3>
        <ol className="space-y-2 text-sm text-gray-300">
          <li>1. Click &quot;Add Test Card&quot; to save a card to IndexedDB</li>
          <li>2. Check the stats update (total cards should increase)</li>
          <li>3. Open DevTools → Application → IndexedDB → pawkit-local-storage → cards</li>
          <li>4. <strong>Refresh this page (F5)</strong> - cards should still be here!</li>
          <li>5. Click &quot;Export Data&quot; to download a JSON backup</li>
          <li>6. Click &quot;Delete All&quot; then check IndexedDB (should be empty)</li>
        </ol>
      </div>
    </div>
  );
}
