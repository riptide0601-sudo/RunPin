import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { MenuList } from '@/components/profile/MenuList';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsRow } from '@/components/profile/StatsRow';
import { SubscriptionBanner } from '@/components/profile/SubscriptionBanner';
import { SubscribeModal } from '@/components/ui/SubscribeModal';
import { colors } from '@/constants/colors';
import { mockMenuItems, mockProfile, mockProfileStats } from '@/data/mock';
import { FREE_PROPOSAL_LIMIT, useAppData } from '@/lib/appData';
import { calculateUserGrade } from '@/lib/userGrade';

export default function ProfileScreen() {
  const router = useRouter();
  const { courses, isSubscribed, remainingProposals, subscribe } = useAppData();
  const grade = useMemo(() => calculateUserGrade(mockProfile.name, courses), [courses]);
  const [subscribeModalVisible, setSubscribeModalVisible] = useState(false);

  const handleMenuItemPress = (id: string) => {
    switch (id) {
      case 'menu-log':
        router.push('/run-log');
        break;
      case 'menu-saved':
        router.push('/saved-courses');
        break;
      case 'menu-notification':
        router.push('/notifications');
        break;
      case 'menu-privacy':
        router.push('/privacy');
        break;
      case 'menu-support':
        router.push('/support');
        break;
    }
  };

  const handleSubscribe = () => {
    subscribe();
    setSubscribeModalVisible(false);
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
      <SubscriptionBanner
        isSubscribed={isSubscribed}
        remaining={Math.min(remainingProposals, FREE_PROPOSAL_LIMIT)}
        limit={FREE_PROPOSAL_LIMIT}
        onPress={() => {
          if (!isSubscribed) setSubscribeModalVisible(true);
        }}
      />
      <MenuList items={mockMenuItems} onItemPress={handleMenuItemPress} />
      <SubscribeModal
        visible={subscribeModalVisible}
        title="RunPin PRO 구독"
        onSubscribe={handleSubscribe}
        onClose={() => setSubscribeModalVisible(false)}
      />
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
