import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type TextStyle, type ViewStyle } from 'react-native';

import { colors } from '@/constants/colors';

interface PillProps {
  label: string;
  variant?: 'filled' | 'outline' | 'subtle' | 'graySolid';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export function Pill({ label, variant = 'subtle', size = 'md', icon, onPress, disabled, style, labelStyle }: PillProps) {
  if (!onPress) {
    return (
      <View
        style={[
          styles.base,
          size === 'lg' && styles.baseLg,
          size === 'sm' && styles.baseSm,
          variant === 'filled' && styles.filled,
          variant === 'outline' && styles.outline,
          variant === 'subtle' && styles.subtle,
          variant === 'graySolid' && styles.graySolid,
          disabled && styles.disabled,
          style,
        ]}
      >
        {icon}
        <Text
          style={[
            styles.label,
            size === 'lg' && styles.labelLg,
            size === 'sm' && styles.labelSm,
            (variant === 'filled' || variant === 'graySolid') && styles.labelInverse,
            labelStyle,
          ]}
        >
          {label}
        </Text>
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
        size === 'lg' && styles.baseLg,
        size === 'sm' && styles.baseSm,
        variant === 'filled' && styles.filled,
        variant === 'outline' && styles.outline,
        variant === 'subtle' && styles.subtle,
        variant === 'graySolid' && styles.graySolid,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.label,
          size === 'lg' && styles.labelLg,
          size === 'sm' && styles.labelSm,
          (variant === 'filled' || variant === 'graySolid') && styles.labelInverse,
          labelStyle,
        ]}
      >
        {label}
      </Text>
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
  baseLg: {
    minHeight: 36,
    paddingHorizontal: 15,
    paddingVertical: 7,
  },
  baseSm: {
    minHeight: 24,
    paddingHorizontal: 9,
    paddingVertical: 3,
    gap: 3,
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
  graySolid: {
    backgroundColor: colors.inkMuted,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  labelLg: {
    fontSize: 13,
    fontWeight: '700',
  },
  labelSm: {
    fontSize: 11,
    fontWeight: '600',
  },
  labelInverse: {
    color: colors.textInverse,
  },
});
