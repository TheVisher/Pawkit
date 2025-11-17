"use client";

import { useEffect, useState } from "react";
import { useDataStore } from "@/lib/stores/data-store";
import { CardModel } from "@/lib/types";
import { Tag, Edit2, Trash2, Merge, Search } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useToastStore } from "@/lib/stores/toast-store";
import { useViewSettingsStore } from "@/lib/hooks/view-settings-store";

interface TagInfo {
  name: string;
  count: number;
  cards: CardModel[];
  color?: string;
}

export default function TagsPage() {
  const { cards, collections } = useDataStore();
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<TagInfo | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [deleteConfirmTag, setDeleteConfirmTag] = useState<TagInfo | null>(null);
  const router = useRouter();
  const toast = useToastStore();

  useEffect(() => {
    // Build a set of private collection SLUGS for fast lookup (cards store slugs, not IDs)
    const privateCollectionSlugs = new Set<string>();
    const getAllPrivateSlugs = (nodes: any[]): void => {
      for (const node of nodes) {
        if (node.isPrivate) {
          privateCollectionSlugs.add(node.slug);
        }
        if (node.children && node.children.length > 0) {
          getAllPrivateSlugs(node.children);
        }
      }
    };
    getAllPrivateSlugs(collections);

    // Extract all tags from cards and count usage (excluding private cards)
    const tagMap = new Map<string, CardModel[]>();

    cards.forEach((card) => {
      // Skip deleted cards
      if (card.deleted === true) {
        return;
      }

      // Skip cards that are in private collections (including 'the-den')
      const isInPrivateCollection = card.collections?.some(collectionSlug =>
        privateCollectionSlugs.has(collectionSlug)
      );
      if (isInPrivateCollection) {
        return; // Skip this card
      }

      if (card.tags && card.tags.length > 0) {
        card.tags.forEach((tag) => {
          let tagCards = tagMap.get(tag);
          if (!tagCards) {
            tagCards = [];
            tagMap.set(tag, tagCards);
          }
          tagCards.push(card);
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
  }, [cards, collections]);

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
      toast.success(`Renamed "${oldName}" to "${newName}" across ${tag.cards.length} cards`);
    } catch (err) {
      toast.error("Failed to rename tag");
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    const tag = tags.find((t) => t.name === tagName);
    if (!tag) return;

    // Show custom confirm modal instead of browser confirm
    setDeleteConfirmTag(tag);
  };

  const confirmDeleteTag = async () => {
    if (!deleteConfirmTag) return;

    try {
      const tagToDelete = deleteConfirmTag.name;

      // FIRST: Clear this tag from any active filters to prevent filtering issues
      const { getSettings, updateSettings } = useViewSettingsStore.getState();
      const viewSettings = getSettings('tags');
      if (viewSettings && viewSettings.viewSpecific) {
        const selectedTags = (viewSettings.viewSpecific.selectedTags as string[]) || [];
        if (selectedTags.includes(tagToDelete)) {
          const updatedTags = selectedTags.filter(t => t !== tagToDelete);
          await updateSettings('tags', {
            viewSpecific: {
              ...viewSettings.viewSpecific,
              selectedTags: updatedTags
            }
          });
        }
      }

      // SECOND: Remove tag from all cards
      const { updateCard } = useDataStore.getState();
      for (const card of deleteConfirmTag.cards) {
        const updatedTags = card.tags?.filter((t) => t !== tagToDelete) || [];
        await updateCard(card.id, { tags: updatedTags });
      }

      setSelectedTag(null);
      setDeleteConfirmTag(null);
      toast.success(`Deleted tag "${tagToDelete}" from ${deleteConfirmTag.cards.length} cards`);
    } catch (err) {
      toast.error("Failed to delete tag");
      setDeleteConfirmTag(null);
    }
  };

  const handleViewCards = (tag: TagInfo) => {
    router.push(`/library?tag=${encodeURIComponent(tag.name)}`);
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
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmTag && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDeleteConfirmTag(null)}
        >
          <div
            className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl border border-subtle"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-foreground mb-4">Delete Tag?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete the tag <span className="text-accent font-medium">#{deleteConfirmTag.name}</span>? This will remove it from {deleteConfirmTag.count} {deleteConfirmTag.count === 1 ? 'card' : 'cards'}.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmTag(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTag}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
