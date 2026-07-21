import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { MenuList } from '@/components/profile/MenuList';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsRow } from '@/components/profile/StatsRow';
import { SubscriptionBanner } from '@/components/profile/SubscriptionBanner';
import { colors } from '@/constants/colors';
import { mockMenuItems, mockProfile, mockProfileStats } from '@/data/mock';
import { FREE_PROPOSAL_LIMIT, useAppData } from '@/lib/appData';
import { calculateUserGrade } from '@/lib/userGrade';

export default function ProfileScreen() {
  const router = useRouter();
  const { courses, isSubscribed, remainingProposals } = useAppData();
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
      <MenuList items={mockMenuItems.slice(0, 1)} onItemPress={handleMenuItemPress} />
      <SubscriptionBanner
        isSubscribed={isSubscribed}
        remaining={Math.min(remainingProposals, FREE_PROPOSAL_LIMIT)}
        limit={FREE_PROPOSAL_LIMIT}
        onPress={() => router.push('/subscription')}
      />
      <MenuList items={mockMenuItems.slice(1)} onItemPress={handleMenuItemPress} />
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
