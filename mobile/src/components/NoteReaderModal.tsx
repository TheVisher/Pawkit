import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { GlassTheme } from '../theme/glass';
import type { CardModel } from '../types';

interface NoteReaderModalProps {
  visible: boolean;
  note: CardModel | null;
  onClose: () => void;
  onEdit?: () => void;
}

export function NoteReaderModal({ visible, note, onClose, onEdit }: NoteReaderModalProps) {
  if (!note) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Glass morphism background */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.glassOverlay} />
          </BlurView>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.glassBackground]} />
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {note.title || 'Untitled Note'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={GlassTheme.colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.readerContent}>
            <Markdown style={markdownStyles}>
              {note.content || '*No content*'}
            </Markdown>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            {/* Metadata */}
            <View style={styles.metadata}>
              <Text style={styles.metadataText}>
                Created {new Date(note.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </Text>
              {note.updatedAt && note.updatedAt !== note.createdAt && (
                <Text style={styles.metadataText}>
                  Updated {new Date(note.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </Text>
              )}
            </View>

            {/* Edit Button */}
            <TouchableOpacity style={styles.editButton} onPress={onEdit}>
              <MaterialCommunityIcons
                name="pencil"
                size={20}
                color={GlassTheme.colors.purple[400]}
              />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GlassTheme.colors.background,
  },
  glassOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 15, 0.95)',
  },
  glassBackground: {
    backgroundColor: 'rgba(10, 10, 15, 0.98)',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: GlassTheme.colors.border.subtle,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: GlassTheme.colors.text.primary,
    marginRight: 16,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 24,
  },
  readerContent: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: GlassTheme.colors.border.subtle,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(10, 10, 15, 0.5)',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metadata: {
    flex: 1,
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: GlassTheme.colors.text.muted,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: GlassTheme.colors.purple[400],
  },
});

// Markdown styles optimized for full-screen reading
const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 17,
    lineHeight: 28,
    color: GlassTheme.colors.text.primary,
  },
  heading1: {
    fontSize: 32,
    fontWeight: '700',
    color: GlassTheme.colors.text.primary,
    marginTop: 24,
    marginBottom: 16,
    lineHeight: 40,
  },
  heading2: {
    fontSize: 26,
    fontWeight: '600',
    color: GlassTheme.colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
    lineHeight: 34,
  },
  heading3: {
    fontSize: 22,
    fontWeight: '600',
    color: GlassTheme.colors.text.primary,
    marginTop: 16,
    marginBottom: 10,
    lineHeight: 30,
  },
  heading4: {
    fontSize: 19,
    fontWeight: '600',
    color: GlassTheme.colors.text.primary,
    marginTop: 14,
    marginBottom: 8,
    lineHeight: 26,
  },
  heading5: {
    fontSize: 17,
    fontWeight: '600',
    color: GlassTheme.colors.text.primary,
    marginTop: 12,
    marginBottom: 6,
    lineHeight: 24,
  },
  heading6: {
    fontSize: 16,
    fontWeight: '600',
    color: GlassTheme.colors.text.secondary,
    marginTop: 10,
    marginBottom: 6,
    lineHeight: 22,
  },
  paragraph: {
    fontSize: 17,
    lineHeight: 28,
    color: GlassTheme.colors.text.primary,
    marginBottom: 16,
  },
  strong: {
    fontWeight: '700',
    color: GlassTheme.colors.text.primary,
  },
  em: {
    fontStyle: 'italic',
    color: GlassTheme.colors.text.primary,
  },
  link: {
    color: GlassTheme.colors.purple[400],
    textDecorationLine: 'underline',
  },
  blockquote: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: GlassTheme.colors.purple[400],
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 12,
    borderRadius: 4,
  },
  code_inline: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    color: GlassTheme.colors.purple[300],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  code_block: {
    backgroundColor: 'rgba(10, 10, 15, 0.6)',
    padding: 16,
    borderRadius: 8,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
  },
  fence: {
    backgroundColor: 'rgba(10, 10, 15, 0.6)',
    padding: 16,
    borderRadius: 8,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
    fontSize: 15,
    lineHeight: 24,
    color: GlassTheme.colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bullet_list: {
    marginVertical: 8,
  },
  ordered_list: {
    marginVertical: 8,
  },
  list_item: {
    flexDirection: 'row',
    marginVertical: 4,
    fontSize: 17,
    lineHeight: 28,
    color: GlassTheme.colors.text.primary,
  },
  bullet_list_icon: {
    color: GlassTheme.colors.purple[400],
    marginRight: 8,
    fontSize: 17,
    lineHeight: 28,
  },
  ordered_list_icon: {
    color: GlassTheme.colors.purple[400],
    marginRight: 8,
    fontSize: 17,
    lineHeight: 28,
  },
  hr: {
    height: 1,
    backgroundColor: GlassTheme.colors.border.subtle,
    marginVertical: 20,
  },
  table: {
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
    borderRadius: 8,
    marginVertical: 12,
  },
  thead: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  tbody: {},
  th: {
    padding: 12,
    fontWeight: '600',
    color: GlassTheme.colors.text.primary,
    fontSize: 16,
  },
  tr: {
    borderBottomWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
  },
  td: {
    padding: 12,
    color: GlassTheme.colors.text.secondary,
    fontSize: 16,
  },
});
