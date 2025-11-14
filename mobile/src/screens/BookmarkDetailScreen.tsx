import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  Image,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Chip,
  useTheme,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { cardsApi } from '../api/client';
import type { CardModel } from '../types';

type RootStackParamList = {
  BookmarkDetail: { id: string };
  BookmarksList: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookmarkDetail'>;

export default function BookmarkDetailScreen() {
  const [card, setCard] = useState<CardModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinning, setPinning] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const theme = useTheme();

  const cardId = (route.params as { id: string }).id;

  useEffect(() => {
    loadCard();
  }, [cardId]);

  const loadCard = async () => {
    try {
      setLoading(true);
      const data = await cardsApi.get(cardId);
      setCard(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load bookmark details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUrl = async () => {
    if (card?.url) {
      const supported = await Linking.canOpenURL(card.url);
      if (supported) {
        await Linking.openURL(card.url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    }
  };

  const handleTogglePin = async () => {
    if (!card) return;

    setPinning(true);
    try {
      const updated = await cardsApi.togglePin(card.id, !card.pinned);
      setCard(updated);
    } catch (error) {
      Alert.alert('Error', 'Failed to update bookmark');
    } finally {
      setPinning(false);
    }
  };

  const handleDelete = async () => {
    if (!card) return;

    Alert.alert(
      'Delete Bookmark',
      'Are you sure you want to delete this bookmark?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await cardsApi.delete(card.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bookmark');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!card) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        {card.image && (
          <Card.Cover source={{ uri: card.image }} style={styles.coverImage} />
        )}

        <Card.Content>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="headlineSmall" style={styles.title}>
                {card.title || card.url}
              </Text>
              {card.domain && (
                <Text variant="bodyMedium" style={styles.domain}>
                  {card.domain}
                </Text>
              )}
            </View>
            <IconButton
              icon={card.pinned ? 'pin' : 'pin-outline'}
              size={24}
              onPress={handleTogglePin}
              disabled={pinning}
            />
          </View>

          {card.description && (
            <Text variant="bodyMedium" style={styles.description}>
              {card.description}
            </Text>
          )}

          {card.notes && (
            <View style={styles.notesContainer}>
              <Text variant="titleSmall" style={styles.notesTitle}>
                Notes
              </Text>
              <Text variant="bodyMedium">{card.notes}</Text>
            </View>
          )}

          {card.tags && card.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text variant="titleSmall" style={styles.tagsTitle}>
                Tags
              </Text>
              <View style={styles.tags}>
                {card.tags.map((tag) => (
                  <Chip key={tag} style={styles.tag}>
                    {tag}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          <View style={styles.metadata}>
            <Text variant="bodySmall" style={styles.metadataText}>
              Created: {new Date(card.createdAt).toLocaleDateString()}
            </Text>
            {card.updatedAt !== card.createdAt && (
              <Text variant="bodySmall" style={styles.metadataText}>
                Updated: {new Date(card.updatedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </Card.Content>

        <Card.Actions>
          <Button mode="outlined" onPress={handleDelete} textColor={theme.colors.error}>
            Delete
          </Button>
          <Button mode="contained" onPress={handleOpenUrl}>
            Open URL
          </Button>
        </Card.Actions>
      </Card>
    </ScrollView>
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
  card: {
    margin: 16,
  },
  coverImage: {
    height: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  domain: {
    color: '#666',
  },
  description: {
    marginBottom: 16,
    lineHeight: 22,
  },
  notesContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  notesTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  tagsContainer: {
    marginBottom: 16,
  },
  tagsTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    marginRight: 0,
  },
  metadata: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  metadataText: {
    color: '#999',
    marginBottom: 4,
  },
});
