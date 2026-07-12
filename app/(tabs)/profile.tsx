import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { MenuList } from '@/components/profile/MenuList';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsRow } from '@/components/profile/StatsRow';
import { colors } from '@/constants/colors';
import { mockMenuItems, mockProfile, mockProfileStats } from '@/data/mock';
import { useAppData } from '@/lib/appData';
import { calculateUserGrade } from '@/lib/userGrade';

export default function ProfileScreen() {
  const router = useRouter();
  const { courses } = useAppData();
  const grade = useMemo(() => calculateUserGrade(mockProfile.name, courses), [courses]);

  const handleMenuItemPress = (id: string) => {
    if (id === 'menu-log') {
      router.push('/run-log');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ProfileHeader
        name={mockProfile.name}
        initial={mockProfile.initial}
        joinedLabel={mockProfile.joinedLabel}
        gradeLevel={grade.level}
      />
      <StatsRow stats={mockProfileStats} />
      <MenuList items={mockMenuItems} onItemPress={handleMenuItemPress} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 24,
  },
});
