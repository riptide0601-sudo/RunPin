import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DifficultyBadge } from '@/components/ui/DifficultyBadge';
import { colors } from '@/constants/colors';
import type { Course } from '@/types';

interface CourseGroupCarouselCardProps {
  member: Course;
  width: number;
  isSelected: boolean;
  isSaved: boolean;
  onSelect: (courseId: string) => void;
  onToggleSave: (courseId: string) => void;
}

export const CourseGroupCarouselCard = memo(function CourseGroupCarouselCard({
  member,
  width,
  isSelected,
  isSaved,
  onSelect,
  onToggleSave,
}: CourseGroupCarouselCardProps) {
  return (
    <Pressable
      onPress={() => onSelect(member.id)}
      style={[styles.card, { width }, isSelected ? styles.cardSelected : undefined]}
    >
      <Text style={styles.name} numberOfLines={1}>
        {member.name}
      </Text>
      <Text style={styles.distance}>{member.distanceKm}km</Text>
      <View style={styles.metaRow}>
        <DifficultyBadge difficulty={member.difficulty} />
      </View>
      <Text style={styles.uploader} numberOfLines={1}>
        업로드: {member.uploaderName}
      </Text>
      <Pressable style={styles.bookmarkButton} onPress={() => onToggleSave(member.id)}>
        <Ionicons
          name={isSaved ? 'bookmark' : 'bookmark-outline'}
          size={13}
          color={isSaved ? colors.ink : colors.textMuted}
        />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    paddingRight: 20,
  },
  bookmarkButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(234, 234, 234, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  distance: {
    fontSize: 11,
    color: colors.textMuted,
  },
  uploader: {
    fontSize: 10,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
