import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassTheme } from '../theme/glass';
import { formatDateSubtitle } from '../lib/daily-notes';
import type { CollectionNode } from '../types';

interface LeftPanelProps {
  collections: CollectionNode[];
  activeCollection?: string;
  cardCount: number;
  onNavigate: (collection?: string) => void;
  onTodaysNote?: () => void;
  notes?: Array<{ id: string; title: string; pinned: boolean }>;
  onOpenNote?: (noteId: string) => void;
}

export function LeftPanel({
  collections,
  activeCollection,
  cardCount,
  onNavigate,
  onTodaysNote,
  notes = [],
  onOpenNote,
}: LeftPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['pawkits'])
  );
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set()
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleCollection = (collectionId: string) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId);
    } else {
      newExpanded.add(collectionId);
    }
    setExpandedCollections(newExpanded);
  };

  const renderCollectionItem = (
    collection: CollectionNode,
    depth: number = 0
  ) => {
    const hasChildren = collection.children && collection.children.length > 0;
    const isExpanded = expandedCollections.has(collection.id);
    const isActive = activeCollection === collection.slug;

    return (
      <View key={collection.id}>
        <TouchableOpacity
          style={[
            styles.navItem,
            { paddingLeft: 16 + depth * 16 },
            isActive && styles.navItemActive,
          ]}
          onPress={() => {
            console.log('[LeftPanel] Collection tapped:', collection.name, '(slug:', collection.slug + ')');
            if (hasChildren) {
              toggleCollection(collection.id);
            }
            onNavigate(collection.slug);
          }}
        >
          <MaterialCommunityIcons
            name="folder-outline"
            size={18}
            color={
              isActive
                ? GlassTheme.colors.purple[400]
                : GlassTheme.colors.text.secondary
            }
          />
          <Text
            style={[
              styles.navText,
              isActive && styles.navTextActive,
            ]}
          >
            {collection.name}
          </Text>
          {hasChildren && (
            <MaterialCommunityIcons
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              size={16}
              color={GlassTheme.colors.text.secondary}
            />
          )}
        </TouchableOpacity>

        {hasChildren && isExpanded && (
          <View>
            {collection.children!.map((child) =>
              renderCollectionItem(child, depth + 1)
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Glass morphism background */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.glassOverlay} />
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.glassBackground]} />
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HOME Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOME</Text>

          <TouchableOpacity
            style={[
              styles.navItem,
              !activeCollection && styles.navItemActive,
            ]}
            onPress={() => onNavigate(undefined)}
          >
            <MaterialCommunityIcons
              name="view-grid"
              size={18}
              color={
                !activeCollection
                  ? GlassTheme.colors.purple[400]
                  : GlassTheme.colors.text.secondary
              }
            />
            <Text
              style={[
                styles.navText,
                !activeCollection && styles.navTextActive,
              ]}
            >
              Library
            </Text>
            {!activeCollection && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{cardCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* PAWKITS Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('pawkits')}
          >
            <Text style={styles.sectionTitle}>PAWKITS</Text>
            <MaterialCommunityIcons
              name={
                expandedSections.has('pawkits')
                  ? 'chevron-down'
                  : 'chevron-right'
              }
              size={16}
              color={GlassTheme.colors.text.muted}
            />
          </TouchableOpacity>

          {expandedSections.has('pawkits') && (
            <View>
              {collections.map((collection) =>
                renderCollectionItem(collection, 0)
              )}

              {collections.length === 0 && (
                <Text style={styles.emptyText}>No collections yet</Text>
              )}
            </View>
          )}
        </View>

        {/* NOTES Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTES</Text>

          <TouchableOpacity
            style={styles.navItem}
            onPress={onTodaysNote}
          >
            <MaterialCommunityIcons
              name="calendar-today"
              size={18}
              color={GlassTheme.colors.text.secondary}
            />
            <View style={styles.navTextContainer}>
              <Text style={styles.navText}>Today's Note</Text>
              <Text style={styles.navSubtitle}>
                {formatDateSubtitle(new Date())}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Recent & Pinned Notes */}
          {notes.length > 0 && (
            <View style={styles.notesContainer}>
              {notes.map((note) => (
                <TouchableOpacity
                  key={note.id}
                  style={styles.navItem}
                  onPress={() => onOpenNote?.(note.id)}
                >
                  <MaterialCommunityIcons
                    name={note.pinned ? "pin" : "note-outline"}
                    size={18}
                    color={
                      note.pinned
                        ? GlassTheme.colors.purple[400]
                        : GlassTheme.colors.text.secondary
                    }
                  />
                  <Text style={styles.navText} numberOfLines={1}>
                    {note.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
  },
  glassOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
  },
  glassBackground: {
    backgroundColor: 'rgba(10, 10, 15, 0.9)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 12,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: GlassTheme.colors.text.muted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  navTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  navText: {
    fontSize: 14,
    color: GlassTheme.colors.text.secondary,
    marginLeft: 12,
    flex: 1,
  },
  navTextActive: {
    color: GlassTheme.colors.purple[400],
    fontWeight: '500',
  },
  navSubtitle: {
    fontSize: 11,
    color: GlassTheme.colors.text.muted,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    color: GlassTheme.colors.purple[400],
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: GlassTheme.colors.text.muted,
    fontStyle: 'italic',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  notesContainer: {
    marginTop: 8,
  },
});
