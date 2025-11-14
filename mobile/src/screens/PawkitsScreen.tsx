import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  useTheme,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { pawkitsApi } from '../api/client';
import type { CollectionNode } from '../types';

type RootStackParamList = {
  BookmarksList: { collection?: string } | undefined;
  Pawkits: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Pawkits'>;

// Flatten the tree structure for easier rendering
function flattenCollections(nodes: CollectionNode[]): CollectionNode[] {
  const result: CollectionNode[] = [];

  function traverse(nodes: CollectionNode[], depth = 0) {
    for (const node of nodes) {
      result.push({ ...node, depth } as any);
      if (node.children && node.children.length > 0) {
        traverse(node.children, depth + 1);
      }
    }
  }

  traverse(nodes);
  return result;
}

export default function PawkitsScreen() {
  const [collections, setCollections] = useState<CollectionNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();

  const loadCollections = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const response = await pawkitsApi.list();
      const flatCollections = flattenCollections(response.tree);
      // Filter out deleted collections
      setCollections(flatCollections.filter((c) => !c.deleted));
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCollections();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCollections(true);
  };

  const handleCollectionPress = (collection: CollectionNode) => {
    navigation.navigate('BookmarksList', { collection: collection.slug });
  };

  const renderCollection = ({ item }: { item: CollectionNode & { depth?: number } }) => {
    const depth = item.depth || 0;
    const paddingLeft = 16 + depth * 24;

    return (
      <TouchableOpacity
        onPress={() => handleCollectionPress(item)}
        activeOpacity={0.7}
      >
        <Card style={styles.card}>
          <Card.Content style={{ paddingLeft }}>
            <View style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <IconButton
                  icon="folder"
                  size={24}
                  iconColor={item.pinned ? theme.colors.primary : '#666'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  variant="titleMedium"
                  style={[styles.collectionName, item.pinned && styles.pinnedText]}
                >
                  {item.name}
                </Text>
                {item.isSystem && (
                  <Text variant="bodySmall" style={styles.systemBadge}>
                    System Collection
                  </Text>
                )}
                {item.isPrivate && (
                  <Text variant="bodySmall" style={styles.privateBadge}>
                    Private
                  </Text>
                )}
              </View>
              <IconButton icon="chevron-right" size={24} />
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={collections}
        renderItem={renderCollection}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.headerText}>
              Pawkits
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtext}>
              Tap a pawkit to filter your bookmarks
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No pawkits yet
            </Text>
          </View>
        }
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
  list: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerText: {
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtext: {
    color: '#666',
  },
  card: {
    marginBottom: 8,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  collectionName: {
    fontWeight: '500',
  },
  pinnedText: {
    fontWeight: '600',
  },
  systemBadge: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  privateBadge: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#666',
  },
});
