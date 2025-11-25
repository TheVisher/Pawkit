import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { cardsApi } from '../api/client';

type RootStackParamList = {
  BookmarksList: undefined;
  AddBookmark: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddBookmark'>;

export default function AddBookmarkScreen() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();

  const handleSave = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    setSaving(true);
    try {
      await cardsApi.create({
        type: 'url',
        url: url.trim(),
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Bookmark added successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add bookmark';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text variant="titleLarge" style={styles.header}>
            Add New Bookmark
          </Text>

          <TextInput
            label="URL *"
            value={url}
            onChangeText={setUrl}
            placeholder="https://example.com"
            autoCapitalize="none"
            keyboardType="url"
            autoComplete="url"
            disabled={saving}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Title (optional)"
            value={title}
            onChangeText={setTitle}
            placeholder="Give it a custom title"
            disabled={saving}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add some notes..."
            multiline
            numberOfLines={4}
            disabled={saving}
            mode="outlined"
            style={styles.input}
          />

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={saving}
              style={styles.button}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              disabled={saving}
              style={styles.button}
            >
              {saving ? <ActivityIndicator color="#fff" /> : 'Save'}
            </Button>
          </View>

          <Text variant="bodySmall" style={styles.hint}>
            * The app will automatically fetch title and metadata from the URL
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  form: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
  hint: {
    marginTop: 16,
    color: '#666',
    textAlign: 'center',
  },
});
