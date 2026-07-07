import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { getRouteCenter } from '@/components/map/getRouteCenter';
import { LeafletMap } from '@/components/map/LeafletMap';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';
import { colors } from '@/constants/colors';
import type { Course } from '@/types';

interface CourseRouteModalProps {
  visible: boolean;
  course: Course | null;
  onClose: () => void;
}

export function CourseRouteModal({ visible, course, onClose }: CourseRouteModalProps) {
  if (!course) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.title}>{course.name}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>{course.distanceKm}km · 난이도</Text>
                <DifficultyBadge difficulty={course.difficulty} />
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => pressed && styles.closePressed}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <LeafletMap
            height={280}
            style={styles.map}
            center={getRouteCenter(course.coordinates)}
            route={course.coordinates}
            fitBounds
            dragging={false}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    gap: 6,
  },
  closePressed: {
    opacity: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  map: {
    borderRadius: 20,
  },
});
