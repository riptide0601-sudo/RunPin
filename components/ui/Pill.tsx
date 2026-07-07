import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type ViewStyle } from 'react-native';

import { colors } from '@/constants/colors';

interface PillProps {
  label: string;
  variant?: 'filled' | 'outline' | 'subtle';
  icon?: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Pill({ label, variant = 'subtle', icon, onPress, disabled, style }: PillProps) {
  if (!onPress) {
    return (
      <View
        style={[
          styles.base,
          variant === 'filled' && styles.filled,
          variant === 'outline' && styles.outline,
          variant === 'subtle' && styles.subtle,
          disabled && styles.disabled,
          style,
        ]}
      >
        {icon}
        <Text style={[styles.label, variant === 'filled' && styles.labelInverse]}>{label}</Text>
      </View>
    );
  }

  return (
    <Pressable
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'filled' && styles.filled,
        variant === 'outline' && styles.outline,
        variant === 'subtle' && styles.subtle,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.label, variant === 'filled' && styles.labelInverse]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.7,
  },
  filled: {
    backgroundColor: colors.ink,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  subtle: {
    backgroundColor: colors.surfaceAlt,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  labelInverse: {
    color: colors.textInverse,
  },
});
