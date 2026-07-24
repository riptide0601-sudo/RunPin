import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

interface SettingToggleRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function SettingToggleRow({ icon, label, description, value, onValueChange }: SettingToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Ionicons name={icon} size={18} color={colors.ink} />
        <View style={styles.textWrap}>
          <Text style={styles.label}>{label}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceAlt, true: colors.ink }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
