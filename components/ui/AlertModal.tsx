import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';

interface AlertModalAction {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outline' | 'subtle' | 'graySolid';
}

interface AlertModalProps {
  visible: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  primaryAction: AlertModalAction;
  secondaryAction?: AlertModalAction;
  onRequestClose?: () => void;
}

export function AlertModal({
  visible,
  icon,
  title,
  message,
  primaryAction,
  secondaryAction,
  onRequestClose,
}: AlertModalProps) {
  const accentColor = colors.ink;
  const primaryVariant = primaryAction.variant ?? 'filled';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onRequestClose} />
        <View style={styles.card}>
          {icon ? (
            <View style={[styles.iconWrap, { backgroundColor: `${accentColor}1A` }]}>
              <Ionicons name={icon} size={26} color={accentColor} />
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            {secondaryAction ? (
              <Pill
                label={secondaryAction.label}
                variant={secondaryAction.variant ?? 'outline'}
                onPress={secondaryAction.onPress}
                style={styles.actionButton}
              />
            ) : null}
            <Pill
              label={primaryAction.label}
              variant={primaryVariant}
              onPress={primaryAction.onPress}
              style={
                primaryVariant === 'filled'
                  ? { ...styles.actionButton, backgroundColor: accentColor }
                  : styles.actionButton
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
  },
});
