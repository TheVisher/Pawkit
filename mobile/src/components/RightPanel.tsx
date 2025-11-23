import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
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
    new Set(['sort', 'view', 'display'])
  );
  const [cardSize, setCardSize] = useState(75);
  const [cardSpacing, setCardSpacing] = useState(16);
  const [cardPadding, setCardPadding] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [serverSync, setServerSync] = useState(true);

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
        {/* TODAY'S TASKS */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('tasks')}
          >
            <Text style={styles.sectionTitle}>TODAY'S TASKS</Text>
            <View style={styles.headerRight}>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>0</Text>
              </View>
              <MaterialCommunityIcons
                name={
                  expandedSections.has('tasks')
                    ? 'chevron-down'
                    : 'chevron-right'
                }
                size={16}
                color={GlassTheme.colors.text.muted}
              />
            </View>
          </TouchableOpacity>

          {expandedSections.has('tasks') && (
            <View style={styles.sectionContent}>
              <Text style={styles.emptyText}>No tasks for today</Text>
            </View>
          )}
        </View>

        {/* TAGS */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('tags')}
          >
            <Text style={styles.sectionTitle}>TAGS</Text>
            <MaterialCommunityIcons
              name={
                expandedSections.has('tags')
                  ? 'chevron-down'
                  : 'chevron-right'
              }
              size={16}
              color={GlassTheme.colors.text.muted}
            />
          </TouchableOpacity>

          {expandedSections.has('tags') && (
            <View style={styles.sectionContent}>
              <Text style={styles.emptyText}>No tags yet</Text>
            </View>
          )}
        </View>

        {/* CONTENT TYPE */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('content-type')}
          >
            <Text style={styles.sectionTitle}>CONTENT TYPE</Text>
            <MaterialCommunityIcons
              name={
                expandedSections.has('content-type')
                  ? 'chevron-down'
                  : 'chevron-right'
              }
              size={16}
              color={GlassTheme.colors.text.muted}
            />
          </TouchableOpacity>

          {expandedSections.has('content-type') && (
            <View style={styles.sectionContent}>
              <TouchableOpacity style={styles.filterOption}>
                <Text style={styles.filterText}>All Types</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

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

        {/* DISPLAY */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('display')}
          >
            <Text style={styles.sectionTitle}>DISPLAY</Text>
            <MaterialCommunityIcons
              name={
                expandedSections.has('display')
                  ? 'chevron-down'
                  : 'chevron-right'
              }
              size={16}
              color={GlassTheme.colors.text.muted}
            />
          </TouchableOpacity>

          {expandedSections.has('display') && (
            <View style={styles.sectionContent}>
              {/* Card Size */}
              <View style={styles.sliderControl}>
                <Text style={styles.controlLabel}>Card Size</Text>
                <Text style={styles.controlValue}>{cardSize}%</Text>
              </View>

              {/* Card Spacing */}
              <View style={styles.sliderControl}>
                <Text style={styles.controlLabel}>Card Spacing</Text>
                <Text style={styles.controlValue}>{cardSpacing}px</Text>
              </View>

              {/* Card Padding */}
              <View style={styles.sliderControl}>
                <Text style={styles.controlLabel}>Card Padding</Text>
                <Text style={styles.controlValue}>{cardPadding}%</Text>
              </View>

              {/* Show Thumbnails Toggle */}
              <View style={styles.toggleControl}>
                <Text style={styles.controlLabel}>Show Thumbnails</Text>
                <Switch
                  value={showThumbnails}
                  onValueChange={setShowThumbnails}
                  trackColor={{
                    false: '#2a2a3a',
                    true: GlassTheme.colors.purple[500],
                  }}
                  thumbColor={showThumbnails ? '#fff' : '#999'}
                />
              </View>
            </View>
          )}
        </View>

        {/* Spacer for bottom content */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom status */}
      <View style={styles.bottomStatus}>
        <View style={styles.statusDivider} />

        <View style={styles.statusRow}>
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Server Sync</Text>
          <Switch
            value={serverSync}
            onValueChange={setServerSync}
            trackColor={{
              false: '#2a2a3a',
              true: GlassTheme.colors.purple[500],
            }}
            thumbColor={serverSync ? '#fff' : '#999'}
            style={styles.syncSwitch}
          />
        </View>

        <View style={styles.statusRow}>
          <MaterialCommunityIcons
            name="check-circle"
            size={14}
            color={GlassTheme.colors.green}
          />
          <Text style={[styles.statusText, { marginLeft: 6 }]}>
            All changes saved
          </Text>
        </View>

        <TouchableOpacity style={styles.syncButton}>
          <MaterialCommunityIcons
            name="sync"
            size={16}
            color={GlassTheme.colors.purple[400]}
          />
          <Text style={styles.syncButtonText}>Sync now</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 120,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    color: GlassTheme.colors.purple[400],
    fontWeight: '600',
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
  sliderControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  toggleControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  controlLabel: {
    fontSize: 14,
    color: GlassTheme.colors.text.secondary,
  },
  controlValue: {
    fontSize: 13,
    color: GlassTheme.colors.text.muted,
    fontWeight: '500',
  },
  bottomStatus: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 10, 15, 0.95)',
    padding: 10,
  },
  statusDivider: {
    height: 1,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GlassTheme.colors.green,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 13,
    color: GlassTheme.colors.text.secondary,
    flex: 1,
  },
  statusText: {
    fontSize: 13,
    color: GlassTheme.colors.text.secondary,
  },
  syncSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    marginTop: 8,
  },
  syncButtonText: {
    fontSize: 13,
    color: GlassTheme.colors.purple[400],
    fontWeight: '500',
    marginLeft: 6,
  },
});
