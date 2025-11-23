import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Keyboard,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassTheme } from '../theme/glass';
import { isProbablyUrl } from '../lib/utils';

interface OmnibarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (url: string) => void;
  placeholder?: string;
}

export function Omnibar({
  value = '',
  onChangeText,
  onSubmit,
  placeholder = 'Paste a URL to save or type to search...',
}: OmnibarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = React.useRef<TextInput>(null);

  const safeValue = value || '';
  const isUrl = isProbablyUrl(safeValue);

  const handleSubmit = () => {
    if (safeValue.trim() && isUrl) {
      onSubmit(safeValue.trim());
      onChangeText('');
      Keyboard.dismiss();
    }
  };

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.omnibar}
        onPress={handleContainerPress}
        activeOpacity={1}
      >
        {/* Glass background */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.glassOverlay} />
          </BlurView>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.glassBackground]} />
        )}

        {/* Border with purple glow on focus */}
        <View
          style={[
            styles.border,
            isFocused && styles.borderFocused,
          ]}
        />

        {/* Leading icon - search or link */}
        <View style={styles.leadingIcon}>
          <MaterialCommunityIcons
            name={isUrl ? "link-variant" : "magnify"}
            size={20}
            color={GlassTheme.colors.text.muted}
          />
        </View>

        {/* Input */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={safeValue}
          onChangeText={onChangeText}
          onSubmitEditing={handleSubmit}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          returnKeyType={isUrl ? "done" : "search"}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={isUrl ? "url" : "default"}
        />

        {/* Clear button (X) when text is present */}
        {safeValue.trim().length > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={GlassTheme.colors.text.muted}
            />
          </TouchableOpacity>
        )}

        {/* Plus button - only show for URLs */}
        {isUrl && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.plusButtonActive,
            ]}
            onPress={handleSubmit}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="plus"
              size={24}
              color={GlassTheme.colors.purple[400]}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: GlassTheme.spacing.lg,
    paddingVertical: GlassTheme.spacing.md,
  },
  omnibar: {
    height: 50,
    borderRadius: GlassTheme.borderRadius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  glassOverlay: {
    flex: 1,
    backgroundColor: GlassTheme.colors.glass.base,
  },
  glassBackground: {
    backgroundColor: GlassTheme.colors.glass.strong,
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: GlassTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
    pointerEvents: 'none',
  },
  borderFocused: {
    borderColor: GlassTheme.colors.purple.subtle,
    borderWidth: 2,
    ...GlassTheme.shadows.purpleGlow,
  },
  leadingIcon: {
    width: 40,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: GlassTheme.spacing.xs,
  },
  input: {
    flex: 1,
    paddingHorizontal: GlassTheme.spacing.sm,
    fontSize: 15,
    color: GlassTheme.colors.text.primary,
    fontWeight: '500',
  },
  actionButton: {
    width: 40,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GlassTheme.spacing.xs,
  },
  plusButtonActive: {
    // Purple glow when URL is detected
    ...GlassTheme.shadows.purpleGlow,
  },
});
