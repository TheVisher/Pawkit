import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Image,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThreePanelLayout } from '../components/ThreePanelLayout';
import { GlassCard } from '../components/GlassCard';
import { CardDetailModal } from '../components/CardDetailModal';
import { MasonryGrid } from '../components/MasonryGrid';
import { Omnibar } from '../components/Omnibar';
import { cardsApi, pawkitsApi } from '../api/client';
import type { CardModel, CollectionNode } from '../types';
import { GlassTheme } from '../theme/glass';
import { fetchMetadata } from '../lib/metadata';
import { LeftPanel } from '../components/LeftPanel';
import { RightPanel } from '../components/RightPanel';
import { NoteReaderModal } from '../components/NoteReaderModal';
import * as LocalStorage from '../lib/local-storage';
import * as SyncService from '../lib/sync-service';
import { supabase } from '../config/supabase';
import { findDailyNoteForDate, generateDailyNoteTitle, generateDailyNoteContent } from '../lib/daily-notes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_SPACING = GlassTheme.spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - COLUMN_SPACING * 3) / 2;

interface CardWithDimensions extends CardModel {
  imageHeight?: number;
}

type RootStackParamList = {
  BookmarksList: { collection?: string } | undefined;
  BookmarkDetail: { id: string };
  AddBookmark: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookmarksList'>;

type SortOption = 'date' | 'title' | 'domain';
type ViewType = 'masonry' | 'grid' | 'list' | 'compact';

export default function BookmarksListScreen() {
  const [cards, setCards] = useState<CardWithDimensions[]>([]);
  const [collections, setCollections] = useState<CollectionNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [viewType, setViewType] = useState<ViewType>('masonry');
  const [selectedCard, setSelectedCard] = useState<CardModel | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [readerVisible, setReaderVisible] = useState(false);
  const [readerNote, setReaderNote] = useState<CardModel | null>(null);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();

  const collection = (route.params as { collection?: string })?.collection;

  // Filter cards based on search query
  const filteredCards = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return cards;
    }

    const queryLower = searchQuery.toLowerCase();
    return cards.filter(card => {
      // Search across: title, url, description, tags, domain
      const searchableText = [
        card.title,
        card.url,
        card.description,
        card.domain,
        card.notes,
        ...(card.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(queryLower);
    });
  }, [cards, searchQuery]);

  // Load image dimensions for proper masonry layout
  const loadImageDimensions = async (imageUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      Image.getSize(
        imageUrl,
        (width, height) => {
          // Calculate height maintaining aspect ratio for card width
          const imageHeight = (height / width) * CARD_WIDTH;
          resolve(imageHeight);
        },
        () => {
          // Default height if image fails to load
          resolve(CARD_WIDTH); // Square fallback
        }
      );
    });
  };

  // Initialize storage and load from local first
  const initializeAndLoadLocal = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Initialize local storage for this user
      LocalStorage.initStorage(user.id);

      // Check for corrupted collections data and clear if found
      const testCards = await LocalStorage.getAllCards();
      if (testCards.length > 0) {
        const firstCardWithCollections = testCards.find(c => c.collections && c.collections.length > 0);
        if (firstCardWithCollections) {
          const firstCollection = firstCardWithCollections.collections[0];
          // Check if collection is corrupted (starts with [ or ")
          if (typeof firstCollection === 'string' && (firstCollection.startsWith('[') || firstCollection.startsWith('"'))) {
            // Detected corrupted collections data - clear and re-sync
            await LocalStorage.clearAll();
            // Re-initialize after clearing
            LocalStorage.initStorage(user.id);
          }
        }
      }

      // Load from local storage FIRST (instant)
      const localCards = await LocalStorage.getAllCards();
      const localCollections = await LocalStorage.getAllCollections();

      // Apply filtering and sorting (collection param is now a slug, not a name)
      let filteredCards = collection
        ? localCards.filter(c => c.collections?.includes(collection))
        : localCards;

      filteredCards = sortCards(filteredCards, sortBy);

      // Load image dimensions
      const cardsWithDimensions = await Promise.all(
        filteredCards.map(async (card) => {
          if (card.image) {
            const imageHeight = await loadImageDimensions(card.image);
            return { ...card, imageHeight };
          }
          return card;
        })
      );

      setCards(cardsWithDimensions);
      setCollections(localCollections);
      setLoading(false);

      // Then sync in background
      backgroundSync();
    } catch (error) {
      console.error('Error loading local data:', error);
      setLoading(false);
    }
  };

  // Background sync with server
  const backgroundSync = async () => {
    try {
      const result = await SyncService.sync();

      if (result.success) {
        // Reload from local storage (which now has merged server data)
        const localCards = await LocalStorage.getAllCards();
        const localCollections = await LocalStorage.getAllCollections();

        // Apply filtering and sorting (collection param is now a slug)
        let filteredCards = collection
          ? localCards.filter(c => c.collections?.includes(collection))
          : localCards;

        filteredCards = sortCards(filteredCards, sortBy);

        // Load image dimensions for new cards
        const cardsWithDimensions = await Promise.all(
          filteredCards.map(async (card) => {
            if (card.image && !card.imageHeight) {
              const imageHeight = await loadImageDimensions(card.image);
              return { ...card, imageHeight };
            }
            return card;
          })
        );

        setCards(cardsWithDimensions);
        setCollections(localCollections);
      }
    } catch (error) {
      // Silently fail - user can manually refresh
    }
  };

  const loadCards = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      // Force sync from server when refreshing
      await backgroundSync();
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Collections are now loaded with cards from local storage

  const sortCards = (items: CardModel[], sortOption: SortOption): CardModel[] => {
    const sorted = [...items];
    switch (sortOption) {
      case 'title':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'domain':
        return sorted.sort((a, b) => (a.domain || '').localeCompare(b.domain || ''));
      case 'date':
      default:
        return sorted.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  };

  // Load from local storage on mount
  useEffect(() => {
    initializeAndLoadLocal();
  }, []);

  // Reload when collection or sort changes
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        // Reload from local storage with new filters
        (async () => {
          const localCards = await LocalStorage.getAllCards();

          // Filter by collection slug (collection param is now a slug)
          let filteredCards = collection
            ? localCards.filter(c => c.collections?.includes(collection))
            : localCards;

          filteredCards = sortCards(filteredCards, sortBy);
          setCards(filteredCards as CardWithDimensions[]);
        })();
      }
    }, [collection, sortBy, loading])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCards(true);
  };

  const handleCardPress = (card: CardModel) => {
    setSelectedCard(card);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // Delete from server
      await cardsApi.delete(id);

      // Delete from local storage
      await LocalStorage.deleteCard(id);

      // Update UI
      setCards(cards.filter(c => c.id !== id));
      setModalVisible(false);
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const handleQuickAdd = async (url: string) => {
    try {
      // 1. Create bookmark immediately with PENDING status
      const newCard = await cardsApi.create({
        url,
        type: 'url',
      });

      // 2. Save to local storage IMMEDIATELY (local-first)
      await LocalStorage.saveCard(newCard);

      // 3. Add to list with placeholder image height
      const cardWithDimensions = { ...newCard, imageHeight: CARD_WIDTH };
      setCards([cardWithDimensions, ...cards]);

      // 3. Fetch metadata in background (don't await to avoid blocking UI)
      fetchMetadata(url)
        .then(async (metadata) => {
          if (!metadata) {
            // Update status to READY even without metadata
            await cardsApi.update(newCard.id, { status: 'READY' });
            return;
          }

          // 4. Update card in Supabase with metadata
          const updatedCard = await cardsApi.update(newCard.id, {
            title: metadata.title || url,
            description: metadata.description,
            image: metadata.image,
            status: 'READY',
          });

          // 5. Fetch image dimensions if metadata contains an image
          let imageHeight = CARD_WIDTH;
          if (metadata.image) {
            imageHeight = await loadImageDimensions(metadata.image);
          }

          // 6. Save updated card to local storage
          await LocalStorage.saveCard({ ...updatedCard, imageHeight });

          // 7. Update card in list with metadata and image dimensions
          setCards(prevCards =>
            prevCards.map(c =>
              c.id === newCard.id ? { ...updatedCard, imageHeight } : c
            )
          );
        })
        .catch(async (error) => {
          console.error('[Bookmark] Error fetching metadata:', error);
          // Mark as ERROR in database
          await cardsApi.update(newCard.id, { status: 'ERROR' });
          // Update local storage
          const errorCard = { ...newCard, status: 'ERROR' as const };
          await LocalStorage.saveCard(errorCard);
          // Card still exists with URL, just no rich metadata
        });
    } catch (error) {
      console.error('[Bookmark] Error creating bookmark:', error);
    }
  };

  // Render masonry card (current layout - dynamic height)
  const renderMasonryCard = (item: CardWithDimensions) => {
    const imageHeight = item.imageHeight || CARD_WIDTH;

    return (
      <GlassCard onPress={() => handleCardPress(item)} style={styles.card}>
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={[styles.cardImage, { height: imageHeight }]}
            resizeMode="cover"
          />
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title || item.url}
          </Text>
          {item.domain && (
            <View style={styles.domainPillContainer}>
              <View style={styles.domainPill}>
                <MaterialCommunityIcons name="web" size={10} color={GlassTheme.colors.text.muted} />
                <Text style={styles.domainText} numberOfLines={1}>{item.domain}</Text>
              </View>
            </View>
          )}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>#{item.tags[0]}</Text>
            </View>
          )}
        </View>
      </GlassCard>
    );
  };

  // Render grid card (fixed square aspect ratio)
  const renderGridCard = (item: CardWithDimensions) => {
    return (
      <GlassCard onPress={() => handleCardPress(item)} style={styles.card}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={[styles.cardImage, { height: CARD_WIDTH }]} // Square
            resizeMode="cover"
          />
        ) : (
          // Placeholder for cards without images (notes, URLs without thumbnails)
          <View style={[styles.cardPlaceholder, { height: CARD_WIDTH }]}>
            <MaterialCommunityIcons
              name={item.type === 'md-note' ? 'note-text-outline' : 'link-variant'}
              size={48}
              color={GlassTheme.colors.purple[400]}
              style={{ opacity: 0.3 }}
            />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title || item.url}
          </Text>
        </View>
      </GlassCard>
    );
  };

  // Render list card (horizontal layout)
  const renderListCard = (item: CardWithDimensions) => {
    return (
      <GlassCard onPress={() => handleCardPress(item)} style={styles.listCard}>
        <View style={styles.listCardContent}>
          {item.image && (
            <Image
              source={{ uri: item.image }}
              style={styles.listCardImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.listCardInfo}>
            <Text style={styles.listCardTitle} numberOfLines={2}>
              {item.title || item.url}
            </Text>
            {item.domain && (
              <Text style={styles.listCardDomain} numberOfLines={1}>
                {item.domain}
              </Text>
            )}
            {item.description && (
              <Text style={styles.listCardDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
      </GlassCard>
    );
  };

  // Render compact card (minimal, no images)
  const renderCompactCard = (item: CardWithDimensions) => {
    return (
      <GlassCard onPress={() => handleCardPress(item)} style={styles.compactCard}>
        <View style={styles.compactCardContent}>
          <Text style={styles.compactCardTitle} numberOfLines={1}>
            {item.title || item.url}
          </Text>
          {item.domain && (
            <Text style={styles.compactCardDomain} numberOfLines={1}>
              {item.domain}
            </Text>
          )}
        </View>
      </GlassCard>
    );
  };

  // Main renderCard function - delegates based on viewType
  const renderCard = (item: CardWithDimensions, index: number) => {
    switch (viewType) {
      case 'grid':
        return renderGridCard(item);
      case 'list':
        return renderListCard(item);
      case 'compact':
        return renderCompactCard(item);
      case 'masonry':
      default:
        return renderMasonryCard(item);
    }
  };

  // Handle Today's Note - create or open
  const handleTodaysNote = async () => {
    try {
      const today = new Date();
      const existingNote = findDailyNoteForDate(cards, today);

      if (existingNote) {
        // Open existing note
        const noteCard = cards.find(c => c.id === existingNote.id);
        if (noteCard) {
          setSelectedCard(noteCard);
          setModalVisible(true);
        }
      } else {
        // Create new daily note
        const title = generateDailyNoteTitle(today);
        const content = generateDailyNoteContent(today);

        const newNote = await cardsApi.create({
          type: 'md-note',
          title,
          content,
          url: '', // Empty URL for notes
          tags: ['daily'],
          collections: [],
        });

        // Save to local storage
        await LocalStorage.saveCard(newNote);

        // Add to cards list and open
        const updatedCards = [newNote, ...cards];
        setCards(updatedCards as CardWithDimensions[]);
        setSelectedCard(newNote);
        setModalVisible(true);
      }
    } catch (error) {
      // Silently fail - user will see no note was created
    }
  };

  // Handle toggle pin/unpin for notes
  const handleTogglePin = async (noteId: string) => {
    try {
      const card = cards.find(c => c.id === noteId);
      if (!card) return;

      const newPinnedStatus = !card.pinned;

      // Update on server
      await cardsApi.update(noteId, { pinned: newPinnedStatus });

      // Update local storage
      const updatedCard = { ...card, pinned: newPinnedStatus };
      await LocalStorage.saveCard(updatedCard);

      // Update UI
      setCards(cards.map(c => c.id === noteId ? updatedCard as CardWithDimensions : c));
    } catch (error) {
      // Silently fail - pin state may be out of sync
    }
  };

  // Handle opening a note by ID
  const handleOpenNote = (noteId: string) => {
    const note = cards.find(c => c.id === noteId);
    if (note) {
      setSelectedCard(note);
      setModalVisible(true);
    }
  };

  // Handle opening reader mode
  const handleReaderMode = (card: CardModel) => {
    setReaderNote(card);
    setReaderVisible(true);
    setModalVisible(false);
  };

  // Handle edit note (placeholder for future implementation)
  const handleEditNote = () => {
    Alert.alert(
      'Edit Note',
      'Note editing coming soon! For now, you can edit notes on the web app.',
      [{ text: 'OK' }]
    );
  };

  // Compute sorted notes for LeftPanel (pinned first, then recent)
  const sortedNotes = React.useMemo(() => {
    const notes = cards.filter(c => c.type === 'md-note' && !c.deleted);

    const sorted = [
      ...notes.filter(n => n.pinned),  // Pinned first
      ...notes.filter(n => !n.pinned).sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )  // Then recent
    ].slice(0, 5);  // Limit to 5 notes

    return sorted.map(note => ({
      id: note.id,
      title: note.title || 'Untitled Note',
      pinned: note.pinned
    }));
  }, [cards]);

  const renderLeftPanel = () => (
    <LeftPanel
      collections={collections}
      activeCollection={collection}
      cardCount={cards.length}
      onNavigate={(selectedCollection) => {
        navigation.navigate('BookmarksList', {
          collection: selectedCollection
        });
      }}
      onTodaysNote={handleTodaysNote}
      notes={sortedNotes}
      onOpenNote={handleOpenNote}
    />
  );

  const renderRightPanel = () => (
    <RightPanel
      sortBy={sortBy}
      onSortChange={setSortBy}
      viewType={viewType}
      onViewChange={setViewType}
    />
  );

  // Find collection name from slug (for header label)
  const getCollectionName = (slug: string | undefined): string | null => {
    if (!slug) return null;

    const findInTree = (nodes: CollectionNode[]): string | null => {
      for (const node of nodes) {
        if (node.slug === slug) return node.name;
        if (node.children) {
          const found = findInTree(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findInTree(collections);
  };

  const collectionName = getCollectionName(collection);

  if (loading && !refreshing) {
    return (
      <ThreePanelLayout>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </ThreePanelLayout>
    );
  }

  return (
    <ThreePanelLayout leftPanel={renderLeftPanel()} rightPanel={renderRightPanel()}>
      <View style={styles.container}>
        {/* Render different layouts based on viewType */}
        {(viewType === 'masonry' || viewType === 'grid') ? (
          <MasonryGrid
            data={filteredCards}
            numColumns={2}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            columnSpacing={COLUMN_SPACING}
          ListHeaderComponent={
            <View style={styles.scrollableHeader}>
              {/* Compact header with card count - scrolls with content */}
              <View style={styles.compactHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.libraryLabel}>
                    {searchQuery.trim() ? 'Search Results' : (collectionName || 'Library')}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>
                      {filteredCards.length}
                      {searchQuery.trim() && cards.length !== filteredCards.length && (
                        ` of ${cards.length}`
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GlassTheme.colors.purple[400]}
            />
          }
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { width: SCREEN_WIDTH - GlassTheme.spacing.md * 2 }]}>
              <MaterialCommunityIcons
                name="bookmark-outline"
                size={64}
                color={GlassTheme.colors.text.muted}
              />
              <Text style={styles.emptyText}>No bookmarks yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to add your first bookmark
              </Text>
            </View>
          }
        />
        ) : (
          <FlatList
            data={filteredCards}
            renderItem={({ item, index }) => renderCard(item, index)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.list,
              viewType === 'list' && styles.listView,
              viewType === 'compact' && styles.compactView
            ]}
            ListHeaderComponent={
              <View style={styles.scrollableHeader}>
                <View style={styles.compactHeader}>
                  <View style={styles.headerLeft}>
                    <Text style={styles.libraryLabel}>
                      {searchQuery.trim() ? 'Search Results' : (collectionName || 'Library')}
                    </Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>
                        {filteredCards.length}
                        {searchQuery.trim() && cards.length !== filteredCards.length && (
                          ` of ${cards.length}`
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={GlassTheme.colors.purple[400]}
              />
            }
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { width: SCREEN_WIDTH - GlassTheme.spacing.md * 2 }]}>
                <MaterialCommunityIcons
                  name="bookmark-outline"
                  size={64}
                  color={GlassTheme.colors.text.muted}
                />
                <Text style={styles.emptyText}>No bookmarks yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap the + button to add your first bookmark
                </Text>
              </View>
            }
          />
        )}

        {/* Omnibar - fixed at bottom, moves up with keyboard */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'position' : 'height'}
          keyboardVerticalOffset={110}
          style={styles.omnibarContainer}
        >
          <Omnibar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmit={handleQuickAdd}
          />
        </KeyboardAvoidingView>
      </View>

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onDelete={handleDelete}
        isPinned={selectedCard?.pinned || false}
        onTogglePin={handleTogglePin}
        onReaderMode={handleReaderMode}
      />

      {/* Note Reader Modal */}
      <NoteReaderModal
        visible={readerVisible}
        note={readerNote}
        onClose={() => setReaderVisible(false)}
        onEdit={handleEditNote}
      />
    </ThreePanelLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: GlassTheme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  scrollableHeader: {
    paddingTop: GlassTheme.spacing.md,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GlassTheme.spacing.lg,
    paddingBottom: GlassTheme.spacing.md,
  },
  omnibarContainer: {
    position: 'absolute',
    bottom: 16,
    left: '5%',
    right: '5%',
    zIndex: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GlassTheme.spacing.sm,
  },
  libraryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: GlassTheme.colors.text.primary,
  },
  countBadge: {
    paddingHorizontal: GlassTheme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: GlassTheme.colors.glass.base,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
    borderRadius: GlassTheme.borderRadius.full,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: GlassTheme.colors.text.secondary,
  },
  list: {
    padding: COLUMN_SPACING,
    paddingTop: GlassTheme.spacing.sm,
    paddingBottom: 120, // Extra space for fixed omnibar at bottom
  },
  card: {
    // Dynamic sizing based on image aspect ratio
    width: CARD_WIDTH,
  },
  cardImage: {
    width: CARD_WIDTH,
    // Height is dynamic, set inline based on aspect ratio
    borderTopLeftRadius: GlassTheme.borderRadius.xl,
    borderTopRightRadius: GlassTheme.borderRadius.xl,
    backgroundColor: GlassTheme.colors.glass.soft,
  },
  cardPlaceholder: {
    width: CARD_WIDTH,
    borderTopLeftRadius: GlassTheme.borderRadius.xl,
    borderTopRightRadius: GlassTheme.borderRadius.xl,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    padding: 12, // Match web app's 12px padding
    gap: 8,
  },
  cardTitle: {
    fontSize: 14, // Match web app
    fontWeight: '600',
    color: GlassTheme.colors.text.primary,
    lineHeight: 19, // 1.35em line height
  },
  domainPillContainer: {
    alignItems: 'center', // Center the pill horizontally
  },
  domainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
    borderRadius: GlassTheme.borderRadius.full,
  },
  domainText: {
    fontSize: 11,
    fontWeight: '500',
    color: GlassTheme.colors.text.secondary,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: GlassTheme.colors.purple.bg,
    borderWidth: 1,
    borderColor: GlassTheme.colors.purple.subtle,
    borderRadius: GlassTheme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    color: GlassTheme.colors.purple[400],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: GlassTheme.spacing.lg,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: GlassTheme.colors.text.secondary,
  },
  emptySubtext: {
    fontSize: 15,
    color: GlassTheme.colors.text.muted,
    textAlign: 'center',
    paddingHorizontal: GlassTheme.spacing.xl,
    lineHeight: 22,
  },
  panel: {
    padding: GlassTheme.spacing.xl,
    paddingTop: 60,
  },
  panelTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: GlassTheme.colors.text.primary,
    marginBottom: GlassTheme.spacing.md,
    letterSpacing: -0.5,
  },
  panelSubtext: {
    fontSize: 15,
    color: GlassTheme.colors.text.secondary,
    lineHeight: 22,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: GlassTheme.spacing.md,
    paddingHorizontal: GlassTheme.spacing.lg,
    gap: GlassTheme.spacing.md,
    borderRadius: GlassTheme.borderRadius.md,
    marginBottom: GlassTheme.spacing.xs,
  },
  collectionItemActive: {
    backgroundColor: GlassTheme.colors.purple.bg,
    borderWidth: 1,
    borderColor: GlassTheme.colors.purple.subtle,
  },
  collectionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: GlassTheme.colors.text.secondary,
  },
  collectionTextActive: {
    color: GlassTheme.colors.purple[400],
  },
  badge: {
    backgroundColor: GlassTheme.colors.glass.base,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
    borderRadius: GlassTheme.borderRadius.full,
    paddingHorizontal: GlassTheme.spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: GlassTheme.colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: GlassTheme.colors.border.subtle,
    marginVertical: GlassTheme.spacing.md,
    marginHorizontal: GlassTheme.spacing.lg,
  },
  section: {
    marginTop: GlassTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: GlassTheme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: GlassTheme.spacing.md,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GlassTheme.spacing.md,
    paddingVertical: GlassTheme.spacing.md,
    paddingHorizontal: GlassTheme.spacing.lg,
    borderRadius: GlassTheme.borderRadius.md,
    marginBottom: GlassTheme.spacing.xs,
  },
  sortOptionActive: {
    backgroundColor: GlassTheme.colors.purple.bg,
    borderWidth: 1,
    borderColor: GlassTheme.colors.purple.subtle,
  },
  sortText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: GlassTheme.colors.text.secondary,
  },
  sortTextActive: {
    color: GlassTheme.colors.purple[400],
  },
  // List view styles
  listView: {
    paddingHorizontal: GlassTheme.spacing.md,
  },
  listCard: {
    marginBottom: GlassTheme.spacing.md,
    width: '100%',
  },
  listCardContent: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  listCardImage: {
    width: 80,
    height: 80,
    borderRadius: GlassTheme.borderRadius.md,
    backgroundColor: GlassTheme.colors.glass.soft,
  },
  listCardInfo: {
    flex: 1,
    gap: 4,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: GlassTheme.colors.text.primary,
    lineHeight: 20,
  },
  listCardDomain: {
    fontSize: 12,
    color: GlassTheme.colors.text.muted,
  },
  listCardDescription: {
    fontSize: 13,
    color: GlassTheme.colors.text.secondary,
    lineHeight: 18,
  },
  // Compact view styles
  compactView: {
    paddingHorizontal: GlassTheme.spacing.md,
  },
  compactCard: {
    marginBottom: 6,
    width: '100%',
  },
  compactCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    gap: 12,
  },
  compactCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: GlassTheme.colors.text.primary,
  },
  compactCardDomain: {
    fontSize: 11,
    color: GlassTheme.colors.text.muted,
    flexShrink: 0,
  },
});
