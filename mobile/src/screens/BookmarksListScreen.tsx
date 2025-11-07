import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  FAB,
  useTheme,
  ActivityIndicator,
  Searchbar,
} from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { cardsApi } from '../api/client';
import type { CardModel } from '../types';

type RootStackParamList = {
  BookmarksList: { collection?: string } | undefined;
  BookmarkDetail: { id: string };
  AddBookmark: undefined;
  Pawkits: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookmarksList'>;

export default function BookmarksListScreen() {
  const [cards, setCards] = useState<CardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const theme = useTheme();

  const collection = (route.params as { collection?: string })?.collection;

  const loadCards = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const params: any = {};
      if (collection) params.collection = collection;
      if (searchQuery) params.q = searchQuery;

      const response = await cardsApi.list(params);
      setCards(response.items.filter((card) => !card.deleted));
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [collection, searchQuery])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCards(true);
  };

  const renderCard = ({ item }: { item: CardModel }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('BookmarkDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.cardImage} />
            )}
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" numberOfLines={2} style={styles.cardTitle}>
                {item.title || item.url}
              </Text>
              {item.domain && (
                <Text variant="bodySmall" style={styles.cardDomain}>
                  {item.domain}
                </Text>
              )}
              {item.description && (
                <Text variant="bodySmall" numberOfLines={2} style={styles.cardDescription}>
                  {item.description}
                </Text>
              )}
            </View>
          </View>

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag) => (
                <Chip key={tag} compact style={styles.tag}>
                  {tag}
                </Chip>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search bookmarks..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No bookmarks yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Tap the + button to add your first bookmark
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AddBookmark')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchbar: {
    margin: 16,
    elevation: 2,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDomain: {
    color: '#666',
    marginBottom: 4,
  },
  cardDescription: {
    color: '#666',
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  tag: {
    height: 28,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
  },
});
