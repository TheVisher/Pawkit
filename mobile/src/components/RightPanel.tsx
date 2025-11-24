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

type SortOption = 'date' | 'modified' | 'title' | 'domain';
type ViewOption = 'grid' | 'masonry' | 'list' | 'compact';

interface RightPanelProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewType?: ViewOption;
  onViewChange?: (view: ViewOption) => void;
}

export function RightPanel({
  sortBy,
  onSortChange,
  viewType = 'masonry',
  onViewChange,
}: RightPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['sort', 'view'])
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

      {/* Top actions */}
      <View style={styles.topActions}>
        <TouchableOpacity style={styles.actionButton}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>E</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={20}
              color={GlassTheme.colors.text.secondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={20}
              color={GlassTheme.colors.text.secondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons
              name="share-variant-outline"
              size={20}
              color={GlassTheme.colors.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* SORT */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('sort')}
          >
            <Text style={styles.sectionTitle}>SORT</Text>
            <MaterialCommunityIcons
              name={
                expandedSections.has('sort')
                  ? 'chevron-down'
                  : 'chevron-right'
              }
              size={16}
              color={GlassTheme.colors.text.muted}
            />
          </TouchableOpacity>

          {expandedSections.has('sort') && (
            <View style={styles.sectionContent}>
              <TouchableOpacity
                style={[
                  styles.option,
                  sortBy === 'date' && styles.optionActive,
                ]}
                onPress={() => onSortChange('date')}
              >
                {sortBy === 'date' && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={GlassTheme.colors.purple[400]}
                    style={styles.checkIcon}
                  />
                )}
                <Text
                  style={[
                    styles.optionText,
                    sortBy === 'date' && styles.optionTextActive,
                  ]}
                >
                  Date Added
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.option,
                  sortBy === 'modified' && styles.optionActive,
                ]}
                onPress={() => onSortChange('modified')}
              >
                {sortBy === 'modified' && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={GlassTheme.colors.purple[400]}
                    style={styles.checkIcon}
                  />
                )}
                <Text
                  style={[
                    styles.optionText,
                    sortBy === 'modified' && styles.optionTextActive,
                  ]}
                >
                  Recently Modified
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.option,
                  sortBy === 'title' && styles.optionActive,
                ]}
                onPress={() => onSortChange('title')}
              >
                {sortBy === 'title' && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={GlassTheme.colors.purple[400]}
                    style={styles.checkIcon}
                  />
                )}
                <Text
                  style={[
                    styles.optionText,
                    sortBy === 'title' && styles.optionTextActive,
                  ]}
                >
                  Title A-Z
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.option,
                  sortBy === 'domain' && styles.optionActive,
                ]}
                onPress={() => onSortChange('domain')}
              >
                {sortBy === 'domain' && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={GlassTheme.colors.purple[400]}
                    style={styles.checkIcon}
                  />
                )}
                <Text
                  style={[
                    styles.optionText,
                    sortBy === 'domain' && styles.optionTextActive,
                  ]}
                >
                  Domain
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* VIEW */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('view')}
          >
            <Text style={styles.sectionTitle}>VIEW</Text>
            <MaterialCommunityIcons
              name={
                expandedSections.has('view')
                  ? 'chevron-down'
                  : 'chevron-right'
              }
              size={16}
              color={GlassTheme.colors.text.muted}
            />
          </TouchableOpacity>

          {expandedSections.has('view') && (
            <View style={styles.sectionContent}>
              <TouchableOpacity
                style={[
                  styles.option,
                  viewType === 'grid' && styles.optionActive,
                ]}
                onPress={() => onViewChange?.('grid')}
              >
                {viewType === 'grid' && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={GlassTheme.colors.purple[400]}
                    style={styles.checkIcon}
                  />
                )}
                <Text
                  style={[
                    styles.optionText,
                    viewType === 'grid' && styles.optionTextActive,
                  ]}
                >
                  Grid
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.option,
                  viewType === 'masonry' && styles.optionActive,
                ]}
                onPress={() => onViewChange?.('masonry')}
              >
                {viewType === 'masonry' && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={GlassTheme.colors.purple[400]}
                    style={styles.checkIcon}
                  />
                )}
                <Text
                  style={[
                    styles.optionText,
                    viewType === 'masonry' && styles.optionTextActive,
                  ]}
                >
                  Masonry
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.option,
                  viewType === 'list' && styles.optionActive,
                ]}
                onPress={() => onViewChange?.('list')}
              >
                {viewType === 'list' && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={GlassTheme.colors.purple[400]}
                    style={styles.checkIcon}
                  />
                )}
                <Text
                  style={[
                    styles.optionText,
                    viewType === 'list' && styles.optionTextActive,
                  ]}
                >
                  List
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.option,
                  viewType === 'compact' && styles.optionActive,
                ]}
                onPress={() => onViewChange?.('compact')}
              >
                {viewType === 'compact' && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={GlassTheme.colors.purple[400]}
                    style={styles.checkIcon}
                  />
                )}
                <Text
                  style={[
                    styles.optionText,
                    viewType === 'compact' && styles.optionTextActive,
                  ]}
                >
                  Compact
                </Text>
              </TouchableOpacity>
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
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.1)',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GlassTheme.colors.purple[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  },
  sectionContent: {
    gap: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  optionActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  checkIcon: {
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    color: GlassTheme.colors.text.secondary,
  },
  optionTextActive: {
    color: GlassTheme.colors.purple[400],
    fontWeight: '500',
  },
  filterOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterText: {
    fontSize: 14,
    color: GlassTheme.colors.text.secondary,
  },
  emptyText: {
    fontSize: 13,
    color: GlassTheme.colors.text.muted,
    fontStyle: 'italic',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
});
