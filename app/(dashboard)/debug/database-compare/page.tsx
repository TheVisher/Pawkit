"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { localDb } from "@/lib/services/local-storage";
import { CardDTO } from "@/lib/server/cards";

interface DatabaseStats {
  server: {
    total: number;
    active: number;
    deleted: number;
    cards: CardDTO[];
  };
  local: {
    total: number;
    active: number;
    deleted: number;
    cards: CardDTO[];
  };
  lastSync: number | null;
  differences: {
    onlyServer: string[];
    onlyLocal: string[];
    deletionMismatch: Array<{ id: string; serverDeleted: boolean; localDeleted: boolean }>;
  };
}

export default function DatabaseComparePage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resolving, setResolving] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Fetch from server (including deleted cards)
      const serverRes = await fetch('/api/cards?limit=10000&includeDeleted=true');
      const serverData = await serverRes.json();
      const serverCards: CardDTO[] = serverData.items || [];

      // Fetch from local IndexedDB (including deleted cards)
      await localDb.init();
      const localCards = await localDb.getAllCards(true); // includeDeleted: true

      // Get last sync timestamp
      const lastSyncStats = await localDb.getStats();
      const lastSync = lastSyncStats.lastSync;

      // Calculate stats
      const serverActive = serverCards.filter(c => !c.deleted);
      const serverDeleted = serverCards.filter(c => c.deleted);
      const localActive = localCards.filter(c => !c.deleted);
      const localDeleted = localCards.filter(c => c.deleted);

      // Find differences
      const serverIds = new Set(serverCards.map(c => c.id));
      const localIds = new Set(localCards.map(c => c.id));

      const onlyServer = serverCards
        .filter(c => !localIds.has(c.id))
        .map(c => c.id);

      const onlyLocal = localCards
        .filter(c => !serverIds.has(c.id))
        .map(c => c.id);

      // Find deletion mismatches
      const deletionMismatch: Array<{ id: string; serverDeleted: boolean; localDeleted: boolean }> = [];
      for (const serverCard of serverCards) {
        const localCard = localCards.find(c => c.id === serverCard.id);
        if (localCard && serverCard.deleted !== localCard.deleted) {
          deletionMismatch.push({
            id: serverCard.id,
            serverDeleted: serverCard.deleted,
            localDeleted: localCard.deleted,
          });
        }
      }

      setStats({
        server: {
          total: serverCards.length,
          active: serverActive.length,
          deleted: serverDeleted.length,
          cards: serverCards,
        },
        local: {
          total: localCards.length,
          active: localActive.length,
          deleted: localDeleted.length,
          cards: localCards,
        },
        lastSync,
        differences: {
          onlyServer,
          onlyLocal,
          deletionMismatch,
        },
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      alert('Failed to load database stats. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const forceFullSync = async () => {
    if (!confirm('This will CLEAR all local data and re-download from server. Continue?')) {
      return;
    }

    setSyncing(true);
    try {
      console.log('[ForceSync] Starting full sync from server...');

      // Clear local IndexedDB
      await localDb.init();
      await localDb.clear();
      console.log('[ForceSync] ✅ Cleared local IndexedDB');

      // Fetch ALL cards from server (including deleted)
      const serverRes = await fetch('/api/cards?limit=10000&includeDeleted=true');
      const serverData = await serverRes.json();
      const serverCards: CardDTO[] = serverData.items || [];
      console.log('[ForceSync] 📥 Fetched', serverCards.length, 'cards from server');

      // Save all cards to local IndexedDB
      for (const card of serverCards) {
        await localDb.saveCard(card, { fromServer: true });
      }
      console.log('[ForceSync] ✅ Saved all cards to local IndexedDB');

      // Fetch all collections from server
      const collectionsRes = await fetch('/api/pawkits');
      const collectionsData = await collectionsRes.json();
      const collections = collectionsData.tree || [];
      console.log('[ForceSync] 📥 Fetched collections from server');

      // Flatten and save collections
      const flattenCollections = (nodes: any[]): any[] => {
        const result: any[] = [];
        for (const node of nodes) {
          const { children, ...nodeWithoutChildren } = node;
          result.push({ ...nodeWithoutChildren, children: [] });
          if (children && children.length > 0) {
            result.push(...flattenCollections(children));
          }
        }
        return result;
      };

      const flatCollections = flattenCollections(collections);
      for (const collection of flatCollections) {
        await localDb.saveCollection(collection, { fromServer: true });
      }
      console.log('[ForceSync] ✅ Saved all collections to local IndexedDB');

      // Update last sync time
      await localDb.setLastSyncTime(Date.now());
      console.log('[ForceSync] ✅ Updated last sync time');

      alert('Force sync complete! Reload the page to see changes.');

      // Reload stats
      await loadStats();
    } catch (error) {
      console.error('[ForceSync] Failed:', error);
      alert('Force sync failed. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  const resolveMismatches = async () => {
    if (!confirm('This will fix deletion mismatches by treating the server as the source of truth. Continue?')) {
      return;
    }

    setResolving(true);
    try {
      console.log('[ResolveMismatches] Starting resolution...');

      // Fetch from server (including deleted cards)
      const serverRes = await fetch('/api/cards?limit=10000&includeDeleted=true');
      const serverData = await serverRes.json();
      const serverCards: CardDTO[] = serverData.items || [];

      // Fetch from local IndexedDB (including deleted cards)
      await localDb.init();
      const localCards = await localDb.getAllCards(true);

      // Build a map for quick lookup
      const serverCardMap = new Map(serverCards.map(c => [c.id, c]));

      let fixedCount = 0;

      // Find and fix mismatches where server=active but local=deleted
      for (const localCard of localCards) {
        const serverCard = serverCardMap.get(localCard.id);

        if (serverCard && serverCard.deleted !== localCard.deleted) {
          // Server is the source of truth - update local to match server
          if (!serverCard.deleted && localCard.deleted) {
            // Server says active, local says deleted - restore locally
            console.log('[ResolveMismatches] Restoring card locally:', {
              id: localCard.id,
              title: localCard.title,
              serverDeleted: serverCard.deleted,
              localDeleted: localCard.deleted
            });

            const restoredCard = {
              ...localCard,
              deleted: false,
              deletedAt: null,
              updatedAt: serverCard.updatedAt, // Use server's timestamp
            };

            await localDb.saveCard(restoredCard, { fromServer: true });
            fixedCount++;
          } else if (serverCard.deleted && !localCard.deleted) {
            // Server says deleted, local says active - delete locally
            console.log('[ResolveMismatches] Deleting card locally:', {
              id: localCard.id,
              title: localCard.title,
              serverDeleted: serverCard.deleted,
              localDeleted: localCard.deleted
            });

            const deletedCard = {
              ...localCard,
              deleted: true,
              deletedAt: serverCard.deletedAt || new Date().toISOString(),
              updatedAt: serverCard.updatedAt,
            };

            await localDb.saveCard(deletedCard, { fromServer: true });
            fixedCount++;
          }
        }
      }

      console.log('[ResolveMismatches] ✅ Fixed', fixedCount, 'mismatches');
      alert(`Fixed ${fixedCount} deletion mismatches. Refreshing comparison...`);

      // Reload stats
      await loadStats();
    } catch (error) {
      console.error('[ResolveMismatches] Failed:', error);
      alert('Failed to resolve mismatches. Check console for details.');
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <p className="text-center">Loading database stats...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-8">
        <p className="text-center">Failed to load stats</p>
      </div>
    );
  }

  const lastSyncDate = stats.lastSync ? new Date(stats.lastSync) : null;

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Comparison</h1>
          <p className="text-muted-foreground">Compare Supabase vs Local IndexedDB</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={loadStats} variant="outline" disabled={loading}>
            Refresh
          </Button>
          <Button onClick={resolveMismatches} variant="default" disabled={resolving || !stats || stats.differences.deletionMismatch.length === 0}>
            {resolving ? 'Resolving...' : 'Resolve Mismatches'}
          </Button>
          <Button onClick={forceFullSync} variant="destructive" disabled={syncing}>
            {syncing ? 'Syncing...' : 'Force Full Sync'}
          </Button>
        </div>
      </div>

      {lastSyncDate && (
        <Card>
          <CardHeader>
            <CardTitle>Last Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{lastSyncDate.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              {Math.round((Date.now() - stats.lastSync!) / 1000)} seconds ago
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Supabase (Server)</CardTitle>
            <CardDescription>Data on the server</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Total Cards:</span>
              <span>{stats.server.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Active Cards:</span>
              <span className="text-green-600">{stats.server.active}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Deleted Cards:</span>
              <span className="text-red-600">{stats.server.deleted}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IndexedDB (Local)</CardTitle>
            <CardDescription>Data in your browser</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Total Cards:</span>
              <span>{stats.local.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Active Cards:</span>
              <span className="text-green-600">{stats.local.active}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Deleted Cards:</span>
              <span className="text-red-600">{stats.local.deleted}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.differences.onlyServer.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle>Only on Server ({stats.differences.onlyServer.length})</CardTitle>
            <CardDescription>Cards that exist on server but not locally</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {stats.differences.onlyServer.map(id => {
                const card = stats.server.cards.find(c => c.id === id);
                return (
                  <div key={id} className="text-sm font-mono flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                    <span>{id}</span>
                    <span className="text-xs text-muted-foreground">{card?.title || 'No title'}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.differences.onlyLocal.length > 0 && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle>Only Local ({stats.differences.onlyLocal.length})</CardTitle>
            <CardDescription>Cards that exist locally but not on server</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {stats.differences.onlyLocal.map(id => {
                const card = stats.local.cards.find(c => c.id === id);
                return (
                  <div key={id} className="text-sm font-mono flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950 rounded">
                    <span>{id}</span>
                    <span className="text-xs text-muted-foreground">{card?.title || 'No title'}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.differences.deletionMismatch.length > 0 && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle>Deletion Mismatch ({stats.differences.deletionMismatch.length})</CardTitle>
            <CardDescription>Cards with different deleted status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {stats.differences.deletionMismatch.map(({ id, serverDeleted, localDeleted }) => {
                const card = stats.server.cards.find(c => c.id === id) || stats.local.cards.find(c => c.id === id);
                return (
                  <div key={id} className="text-sm font-mono space-y-1 p-2 bg-red-50 dark:bg-red-950 rounded">
                    <div className="flex items-center justify-between">
                      <span>{id}</span>
                      <span className="text-xs text-muted-foreground">{card?.title || 'No title'}</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span>Server: {serverDeleted ? '❌ DELETED' : '✅ Active'}</span>
                      <span>Local: {localDeleted ? '❌ DELETED' : '✅ Active'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.differences.onlyServer.length === 0 &&
       stats.differences.onlyLocal.length === 0 &&
       stats.differences.deletionMismatch.length === 0 && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle>✅ Perfect Sync</CardTitle>
            <CardDescription>Server and local databases are in sync</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
