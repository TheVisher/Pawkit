import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

interface MasonryGridProps<T> {
  data: T[];
  numColumns?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  contentContainerStyle?: any;
  columnSpacing?: number;
  refreshControl?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  ListHeaderComponent?: React.ReactElement;
}

export function MasonryGrid<T>({
  data,
  numColumns = 2,
  renderItem,
  keyExtractor,
  contentContainerStyle,
  columnSpacing = 16,
  refreshControl,
  ListEmptyComponent,
  ListHeaderComponent,
}: MasonryGridProps<T>) {
  // Distribute items across columns to balance heights
  const distributeItems = () => {
    const columns: { items: T[]; indices: number[] }[] = Array.from(
      { length: numColumns },
      () => ({ items: [], indices: [] })
    );

    const tempHeights = new Array(numColumns).fill(0);

    data.forEach((item, index) => {
      // Find column with minimum height
      const minHeightIndex = tempHeights.indexOf(Math.min(...tempHeights));

      columns[minHeightIndex].items.push(item);
      columns[minHeightIndex].indices.push(index);

      // Estimate height increase (will be refined by actual render)
      // This is a rough estimate - actual heights determined by content
      tempHeights[minHeightIndex] += 200; // Base estimate
    });

    return columns;
  };

  const columns = distributeItems();

  if (data.length === 0 && ListEmptyComponent) {
    return (
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        refreshControl={refreshControl}
      >
        {ListHeaderComponent}
        {ListEmptyComponent}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {ListHeaderComponent}
      <View style={styles.columnsContainer}>
        {columns.map((column, columnIndex) => (
          <View
            key={columnIndex}
            style={[
              styles.column,
              {
                flex: 1,
                marginLeft: columnIndex === 0 ? 0 : columnSpacing / 2,
                marginRight: columnIndex === numColumns - 1 ? 0 : columnSpacing / 2,
              },
            ]}
          >
            {column.items.map((item, itemIndex) => {
              const originalIndex = column.indices[itemIndex];
              return (
                <View key={keyExtractor(item, originalIndex)} style={styles.item}>
                  {renderItem(item, originalIndex)}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flexDirection: 'column',
  },
  item: {
    marginBottom: 16,
  },
});
