"use client";

import { useState } from "react";
import { useConflictStore } from "@/lib/stores/conflict-store";
import { useDataStore } from "@/lib/stores/data-store";
import { CardModel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, X, RefreshCw, FileText, Bookmark, Globe } from "lucide-react";

type ConflictResolutionProps = {
  onResolve?: (cardId: string, resolution: 'local' | 'server' | 'merge') => void;
  className?: string;
};

export function ConflictResolution({ onResolve, className = "" }: ConflictResolutionProps) {
  const conflicts = useConflictStore((state) => state.conflicts);
  const removeConflict = useConflictStore((state) => state.removeConflict);
  const cards = useDataStore((state) => state.cards);
  const [resolving, setResolving] = useState<string | null>(null);

  const handleResolve = async (cardId: string, resolution: 'local' | 'server' | 'merge') => {
    setResolving(cardId);
    try {
      if (onResolve) {
        await onResolve(cardId, resolution);
      }
      removeConflict(cardId);
    } catch (error) {
    } finally {
      setResolving(null);
    }
  };

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-yellow-500" />
        <h3 className="font-semibold text-foreground">Conflict Resolution</h3>
        <Badge variant="secondary" className="bg-yellow-900/30 text-yellow-300">
          {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-2">
        {conflicts.map((conflict) => (
          <div
            key={conflict.cardId}
            className="p-3 rounded-lg border border-yellow-800/50 bg-yellow-900/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={14} className="text-yellow-500" />
                  <span className="font-medium text-foreground truncate">
                    {cards.find(c => c.id === conflict.cardId)?.title || 'Untitled Card'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {conflict.message}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {conflict.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(conflict.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolve(conflict.cardId, 'local')}
                  disabled={resolving === conflict.cardId}
                  className="text-xs"
                >
                  {resolving === conflict.cardId ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  Keep Local
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolve(conflict.cardId, 'server')}
                  disabled={resolving === conflict.cardId}
                  className="text-xs"
                >
                  <RefreshCw size={12} />
                  Use Server
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolve(conflict.cardId, 'merge')}
                  disabled={resolving === conflict.cardId}
                  className="text-xs"
                >
                  <RefreshCw size={12} />
                  Merge
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeConflict(conflict.cardId)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ConflictResolutionModalProps = {
  cardId: string;
  localCard: CardModel;
  serverCard: CardModel;
  onResolve: (resolution: 'local' | 'server' | 'merge', mergedCard?: CardModel) => void;
  onClose: () => void;
};

export function ConflictResolutionModal({
  cardId,
  localCard,
  serverCard,
  onResolve,
  onClose
}: ConflictResolutionModalProps) {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'server' | 'merge'>('local');
  const [mergedContent, setMergedContent] = useState('');

  const handleMerge = () => {
    if (selectedResolution === 'merge') {
      const mergedCard = {
        ...localCard,
        content: mergedContent,
        updatedAt: new Date().toISOString(),
      };
      onResolve('merge', mergedCard);
    } else {
      onResolve(selectedResolution);
    }
  };

  const getCardIcon = (card: CardModel) => {
    if (card.type === 'md-note' || card.type === 'text-note') {
      return <FileText size={16} className="text-purple-400" />;
    } else if (card.type === 'url') {
      return <Bookmark size={16} className="text-blue-400" />;
    } else {
      return <Globe size={16} className="text-green-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg border border-subtle shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-yellow-500" />
            <h2 className="text-xl font-semibold text-foreground">Resolve Conflict</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="text-sm text-muted-foreground">
            This card was modified on another device. Choose how to resolve the conflict:
          </div>

          {/* Resolution Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded border border-subtle cursor-pointer hover:bg-surface-soft">
              <input
                type="radio"
                name="resolution"
                value="local"
                checked={selectedResolution === 'local'}
                onChange={(e) => setSelectedResolution(e.target.value as 'local')}
                className="text-accent"
              />
              <div className="flex-1">
                <div className="font-medium text-foreground">Keep Local Version</div>
                <div className="text-sm text-muted-foreground">
                  Use your local changes and discard server changes
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded border border-subtle cursor-pointer hover:bg-surface-soft">
              <input
                type="radio"
                name="resolution"
                value="server"
                checked={selectedResolution === 'server'}
                onChange={(e) => setSelectedResolution(e.target.value as 'server')}
                className="text-accent"
              />
              <div className="flex-1">
                <div className="font-medium text-foreground">Use Server Version</div>
                <div className="text-sm text-muted-foreground">
                  Discard your local changes and use server version
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded border border-subtle cursor-pointer hover:bg-surface-soft">
              <input
                type="radio"
                name="resolution"
                value="merge"
                checked={selectedResolution === 'merge'}
                onChange={(e) => setSelectedResolution(e.target.value as 'merge')}
                className="text-accent"
              />
              <div className="flex-1">
                <div className="font-medium text-foreground">Merge Changes</div>
                <div className="text-sm text-muted-foreground">
                  Manually merge both versions
                </div>
              </div>
            </label>
          </div>

          {/* Merge Editor */}
          {selectedResolution === 'merge' && (
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Merge Content</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getCardIcon(localCard)}
                    <span className="text-sm font-medium text-foreground">Local Version</span>
                  </div>
                  <textarea
                    value={localCard.content || ''}
                    readOnly
                    className="w-full h-32 p-3 bg-surface-muted border border-subtle rounded text-sm font-mono resize-none"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getCardIcon(serverCard)}
                    <span className="text-sm font-medium text-foreground">Server Version</span>
                  </div>
                  <textarea
                    value={serverCard.content || ''}
                    readOnly
                    className="w-full h-32 p-3 bg-surface-muted border border-subtle rounded text-sm font-mono resize-none"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-foreground">Merged Version</span>
                </div>
                <textarea
                  value={mergedContent}
                  onChange={(e) => setMergedContent(e.target.value)}
                  placeholder="Edit the merged content here..."
                  className="w-full h-32 p-3 bg-surface border border-subtle rounded text-sm font-mono resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-subtle">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleMerge}>
            Resolve Conflict
          </Button>
        </div>
      </div>
    </div>
  );
}
