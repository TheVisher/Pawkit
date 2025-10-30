"use client";

import { useEffect, useState } from 'react';

export default function CheckIndexedDBPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkIndexedDB() {
      try {
        // Open IndexedDB
        const request = indexedDB.open('pawkit-db', 1);

        request.onerror = () => {
          setError('Failed to open IndexedDB');
          setLoading(false);
        };

        request.onsuccess = (event: any) => {
          const db = event.target.result;

          // Check if cards store exists
          if (!db.objectStoreNames.contains('cards')) {
            setError('No cards store found in IndexedDB');
            setLoading(false);
            return;
          }

          // Get all cards from IndexedDB
          const transaction = db.transaction(['cards'], 'readonly');
          const store = transaction.objectStore('cards');
          const getAllRequest = store.getAll();

          getAllRequest.onsuccess = () => {
            const allCards = getAllRequest.result;

            // Filter for notes only
            const noteCards = allCards.filter((card: any) =>
              card.type === 'md-note' || card.type === 'text-note'
            );

            console.log('All cards in IndexedDB:', allCards.length);
            console.log('Note cards found:', noteCards.length);
            console.log('Notes:', noteCards);

            setNotes(noteCards);
            setLoading(false);
          };

          getAllRequest.onerror = () => {
            setError('Failed to read from IndexedDB');
            setLoading(false);
          };
        };
      } catch (err) {
        setError('Error accessing IndexedDB: ' + String(err));
        setLoading(false);
      }
    }

    checkIndexedDB();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Checking IndexedDB for Notes...</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">IndexedDB Notes Check</h1>

      <div className="mb-6 p-4 bg-blue-100 rounded">
        <p className="font-semibold">Found {notes.length} notes in IndexedDB</p>
      </div>

      {notes.length === 0 ? (
        <p className="text-gray-600">No notes found in local IndexedDB.</p>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Notes in Local Storage:</h2>
          {notes.map((note, index) => (
            <div key={note.id || index} className="border p-4 rounded bg-white">
              <div className="mb-2">
                <span className="font-semibold">ID:</span> {note.id}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Type:</span> {note.type}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Title:</span> {note.title || 'Untitled'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Created:</span> {note.createdAt ? new Date(note.createdAt).toLocaleString() : 'Unknown'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Content Preview:</span>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-sm overflow-auto max-h-32">
                  {note.content?.substring(0, 200) || note.notes?.substring(0, 200) || 'No content'}
                </pre>
              </div>
              <div className="text-xs text-gray-500">
                Full card data: {JSON.stringify(note, null, 2).substring(0, 300)}...
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-100 rounded">
        <h3 className="font-semibold mb-2">Next Steps:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>If notes are found here, they can be re-synced to the server</li>
          <li>Open browser console to see detailed logs</li>
          <li>Take screenshots of this page for reference</li>
        </ul>
      </div>
    </div>
  );
}
