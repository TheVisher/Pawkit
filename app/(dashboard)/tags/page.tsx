"use client";

import { useEffect, useState } from "react";
import { useDataStore } from "@/lib/stores/data-store";
import { CardModel } from "@/lib/types";
import { Tag, Edit2, Trash2, Merge, Search } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";

interface TagInfo {
  name: string;
  count: number;
  cards: CardModel[];
  color?: string;
}

export default function TagsPage() {
  const { cards } = useDataStore();
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<TagInfo | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const router = useRouter();
  const { toasts, dismissToast, success, error } = useToast();

  useEffect(() => {
    // Extract all tags from cards and count usage
    const tagMap = new Map<string, CardModel[]>();

    cards.forEach((card) => {
      if (card.tags && card.tags.length > 0) {
        card.tags.forEach((tag) => {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, []);
          }
          tagMap.get(tag)!.push(card);
        });
      }
    });

    const tagInfos: TagInfo[] = Array.from(tagMap.entries())
      .map(([name, cards]) => ({
        name,
        count: cards.length,
        cards,
      }))
      .sort((a, b) => b.count - a.count);

    setTags(tagInfos);
  }, [cards]);

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRenameTag = async (oldName: string, newName: string) => {
    if (!newName || newName === oldName) {
      setEditingTag(null);
      return;
    }

    const tag = tags.find((t) => t.name === oldName);
    if (!tag) return;

    try {
      // Update all cards with this tag
      const { updateCard } = useDataStore.getState();
      for (const card of tag.cards) {
        const updatedTags = card.tags?.map((t) => (t === oldName ? newName : t)) || [];
        await updateCard(card.id, { tags: updatedTags });
      }

      setEditingTag(null);
      setNewTagName("");
      success(`Renamed "${oldName}" to "${newName}" across ${tag.cards.length} cards`);
    } catch (err) {
      error("Failed to rename tag");
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    const tag = tags.find((t) => t.name === tagName);
    if (!tag) return;

    if (!confirm(`Are you sure you want to delete the tag "${tagName}"? This will remove it from ${tag.count} cards.`)) {
      return;
    }

    try {
      // Remove tag from all cards
      const { updateCard } = useDataStore.getState();
      for (const card of tag.cards) {
        const updatedTags = card.tags?.filter((t) => t !== tagName) || [];
        await updateCard(card.id, { tags: updatedTags });
      }

      setSelectedTag(null);
      success(`Deleted tag "${tagName}" from ${tag.cards.length} cards`);
    } catch (err) {
      error("Failed to delete tag");
    }
  };

  const handleViewCards = (tag: TagInfo) => {
    router.push(`/library?q=tag:${tag.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Tag className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Tag Management</h1>
            <p className="text-sm text-muted-foreground">
              {tags.length} tags across {cards.length} cards
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          type="text"
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tags Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTags.map((tag) => (
          <div
            key={tag.name}
            className="group rounded-2xl border border-subtle bg-surface p-4 transition-all hover:border-accent/50 hover:bg-surface-elevated"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                {editingTag === tag.name ? (
                  <Input
                    autoFocus
                    type="text"
                    defaultValue={tag.name}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRenameTag(tag.name, e.currentTarget.value);
                      } else if (e.key === "Escape") {
                        setEditingTag(null);
                      }
                    }}
                    onBlur={(e) => handleRenameTag(tag.name, e.currentTarget.value)}
                    className="h-8 text-lg font-semibold"
                  />
                ) : (
                  <h3 className="text-lg font-semibold text-foreground">
                    #{tag.name}
                  </h3>
                )}
                <p className="text-sm text-muted-foreground">
                  {tag.count} {tag.count === 1 ? "card" : "cards"}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => {
                    setEditingTag(tag.name);
                    setNewTagName(tag.name);
                  }}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-white/5 hover:text-foreground"
                  title="Rename tag"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteTag(tag.name)}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-white/5 hover:text-danger"
                  title="Delete tag"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <GlowButton
                onClick={() => handleViewCards(tag)}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                View Cards
              </GlowButton>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTags.length === 0 && (
        <div className="rounded-2xl border border-subtle bg-surface p-12 text-center">
          <Tag className="mx-auto mb-4 h-12 w-12 text-muted" />
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {searchQuery ? "No tags found" : "No tags yet"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? `No tags match "${searchQuery}"`
              : "Start adding #tags to your cards to organize them"}
          </p>
        </div>
      )}

      {/* Help Text */}
      <div className="rounded-xl border border-white/5 bg-white/5 p-4">
        <h4 className="mb-2 font-semibold text-foreground">About Tags</h4>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Tags are automatically extracted when you use #hashtags in card titles or notes</li>
          <li>• Click &quot;View Cards&quot; to see all cards with a specific tag</li>
          <li>• Rename a tag to update it across all cards</li>
          <li>• Delete a tag to remove it from all cards</li>
        </ul>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
