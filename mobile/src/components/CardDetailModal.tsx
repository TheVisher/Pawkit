import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Animated,
  PanResponder,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { GlassTheme } from '../theme/glass';
import type { CardModel } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85;

interface CardDetailModalProps {
  card: CardModel | null;
  visible: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  isPinned?: boolean;
  onTogglePin?: (id: string) => void;
  onReaderMode?: (card: CardModel) => void;
}

export function CardDetailModal({
  card,
  visible,
  onClose,
  onDelete,
  isPinned = false,
  onTogglePin,
  onReaderMode,
}: CardDetailModalProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [isScrolling, setIsScrolling] = useState(false);

  // Animate modal in/out
  React.useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Pan responder for swipe down to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Don't capture if user is scrolling content
        if (isScrolling) return false;
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleOpenUrl = () => {
    if (!card) return;

    if (card.type === 'md-note') {
      // Open full-screen reader mode for markdown notes
      if (onReaderMode) {
        onReaderMode(card);
      }
    } else if (card.url) {
      Linking.openURL(card.url);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Bookmark',
      'Are you sure you want to delete this bookmark?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (card && onDelete) {
              onDelete(card.id);
              onClose();
            }
          },
        },
      ]
    );
  };

  if (!card) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.backdropAndroid]} />
        )}
      </TouchableOpacity>

      {/* Modal content */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Glass background */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.glassOverlay} />
          </BlurView>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.glassBackground]} />
        )}

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Large thumbnail */}
          {card.image && (
            <Image source={{ uri: card.image }} style={styles.image} />
          )}

          {/* Title */}
          <Text style={styles.title}>{card.title || card.url}</Text>

          {/* Domain */}
          {card.domain && (
            <View style={styles.domainContainer}>
              <MaterialCommunityIcons
                name="web"
                size={16}
                color={GlassTheme.colors.text.muted}
              />
              <Text style={styles.domain}>{card.domain}</Text>
            </View>
          )}

          {/* URL / Note Link */}
          {card.type === 'url' && (
            <TouchableOpacity style={styles.urlContainer} onPress={handleOpenUrl}>
              <MaterialCommunityIcons
                name="open-in-new"
                size={16}
                color={GlassTheme.colors.purple[400]}
              />
              <Text style={styles.url} numberOfLines={1}>
                {card.url}
              </Text>
            </TouchableOpacity>
          )}

          {/* Description */}
          {card.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{card.description}</Text>
            </View>
          )}

          {/* Markdown Content (for md-note type) */}
          {card.type === 'md-note' && card.content && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Content</Text>
              <ScrollView
                style={styles.markdownScrollView}
                nestedScrollEnabled={true}
                scrollEnabled={true}
                showsVerticalScrollIndicator={true}
                onScrollBeginDrag={() => setIsScrolling(true)}
                onScrollEndDrag={() => setIsScrolling(false)}
                onMomentumScrollBegin={() => setIsScrolling(true)}
                onMomentumScrollEnd={() => setIsScrolling(false)}
              >
                <Markdown style={markdownStyles}>{card.content}</Markdown>
              </ScrollView>
            </View>
          )}

          {/* Notes (for url type quick notes) */}
          {card.type === 'url' && card.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notes}>{card.notes}</Text>
            </View>
          )}

          {/* Tags */}
          {card.tags && card.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {card.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Metadata - Compact single line */}
          <Text style={styles.metadataText}>
            Created {new Date(card.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
            {card.updatedAt && card.updatedAt !== card.createdAt && (
              <Text>
                {' • '}Updated {new Date(card.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            )}
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleOpenUrl}>
              <MaterialCommunityIcons
                name={card.type === 'md-note' ? 'file-document-outline' : 'open-in-new'}
                size={20}
                color={GlassTheme.colors.purple[400]}
              />
              <Text style={styles.actionButtonText}>
                {card.type === 'md-note' ? 'Reader Mode' : 'Open Link'}
              </Text>
            </TouchableOpacity>

            {/* Pin button - only for notes */}
            {card.type === 'md-note' && onTogglePin && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onTogglePin(card.id)}
              >
                <MaterialCommunityIcons
                  name={isPinned ? 'pin' : 'pin-outline'}
                  size={20}
                  color={isPinned ? GlassTheme.colors.purple[400] : GlassTheme.colors.text.secondary}
                />
                <Text style={styles.actionButtonText}>
                  {isPinned ? 'Unpin' : 'Pin'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color="#ef4444"
              />
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// Markdown styles matching glass morphism theme
const markdownStyles = StyleSheet.create({
  body: {
    color: GlassTheme.colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  heading1: {
    color: GlassTheme.colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 28,
  },
  heading2: {
    color: GlassTheme.colors.purple[400],
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    lineHeight: 24,
  },
  heading3: {
    color: GlassTheme.colors.purple[400],
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    lineHeight: 22,
  },
  heading4: {
    color: GlassTheme.colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 20,
  },
  heading5: {
    color: GlassTheme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 18,
  },
  heading6: {
    color: GlassTheme.colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 16,
  },
  strong: {
    fontWeight: '700',
    color: GlassTheme.colors.text.primary,
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: GlassTheme.colors.purple[400],
    textDecorationLine: 'underline',
  },
  blockquote: {
    backgroundColor: GlassTheme.colors.glass.soft,
    borderLeftWidth: 4,
    borderLeftColor: GlassTheme.colors.purple[400],
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: GlassTheme.colors.glass.soft,
    color: GlassTheme.colors.purple[300],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: GlassTheme.colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    padding: 12,
    borderRadius: GlassTheme.borderRadius.md,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
  },
  fence: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: GlassTheme.colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    padding: 12,
    borderRadius: GlassTheme.borderRadius.md,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
  },
  list_item: {
    color: GlassTheme.colors.text.secondary,
    marginVertical: 4,
  },
  bullet_list: {
    marginVertical: 8,
  },
  ordered_list: {
    marginVertical: 8,
  },
  bullet_list_icon: {
    color: GlassTheme.colors.purple[400],
    fontSize: 14,
    marginLeft: 10,
    marginRight: 10,
  },
  ordered_list_icon: {
    color: GlassTheme.colors.purple[400],
    fontSize: 14,
    marginLeft: 10,
    marginRight: 10,
  },
  hr: {
    backgroundColor: GlassTheme.colors.border.subtle,
    height: 1,
    marginVertical: 16,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
    color: GlassTheme.colors.text.secondary,
    lineHeight: 20,
  },
  table: {
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
    borderRadius: GlassTheme.borderRadius.md,
    marginVertical: 8,
  },
  thead: {
    backgroundColor: GlassTheme.colors.glass.soft,
  },
  tbody: {},
  th: {
    color: GlassTheme.colors.text.primary,
    fontWeight: '600',
    padding: 8,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
  },
  tr: {
    borderBottomWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
  },
  td: {
    color: GlassTheme.colors.text.secondary,
    padding: 8,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
  },
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  backdropAndroid: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MODAL_HEIGHT,
    borderTopLeftRadius: GlassTheme.borderRadius.xl,
    borderTopRightRadius: GlassTheme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: GlassTheme.colors.border.subtle,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: GlassTheme.colors.border.medium,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    zIndex: 10,
  },
  glassOverlay: {
    flex: 1,
    backgroundColor: GlassTheme.colors.glass.strong,
  },
  glassBackground: {
    backgroundColor: GlassTheme.colors.glass.strong,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: GlassTheme.spacing.xl,
    paddingTop: GlassTheme.spacing.md,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: GlassTheme.borderRadius.xl,
    backgroundColor: GlassTheme.colors.glass.soft,
    marginBottom: GlassTheme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: GlassTheme.colors.text.primary,
    marginBottom: GlassTheme.spacing.md,
    lineHeight: 32,
  },
  domainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: GlassTheme.spacing.sm,
  },
  domain: {
    fontSize: 14,
    color: GlassTheme.colors.text.muted,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: GlassTheme.spacing.md,
    backgroundColor: GlassTheme.colors.glass.base,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
    borderRadius: GlassTheme.borderRadius.md,
    marginBottom: GlassTheme.spacing.lg,
  },
  url: {
    flex: 1,
    fontSize: 14,
    color: GlassTheme.colors.purple[400],
  },
  section: {
    marginBottom: GlassTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: GlassTheme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: GlassTheme.spacing.sm,
  },
  description: {
    fontSize: 15,
    color: GlassTheme.colors.text.secondary,
    lineHeight: 22,
  },
  notes: {
    fontSize: 15,
    color: GlassTheme.colors.text.secondary,
    lineHeight: 22,
  },
  markdownScrollView: {
    maxHeight: 400,
    backgroundColor: GlassTheme.colors.glass.base,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
    borderRadius: GlassTheme.borderRadius.md,
    padding: GlassTheme.spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GlassTheme.spacing.sm,
  },
  tag: {
    paddingHorizontal: GlassTheme.spacing.md,
    paddingVertical: 8,
    backgroundColor: GlassTheme.colors.purple.bg,
    borderWidth: 1,
    borderColor: GlassTheme.colors.purple.subtle,
    borderRadius: GlassTheme.borderRadius.full,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: GlassTheme.colors.purple[400],
  },
  metadataText: {
    fontSize: 11,
    color: GlassTheme.colors.text.muted,
    marginBottom: GlassTheme.spacing.lg,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: GlassTheme.spacing.md,
    marginBottom: GlassTheme.spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: GlassTheme.spacing.lg,
    backgroundColor: GlassTheme.colors.purple.bg,
    borderWidth: 1,
    borderColor: GlassTheme.colors.purple.subtle,
    borderRadius: GlassTheme.borderRadius.md,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: GlassTheme.colors.purple[400],
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
});
