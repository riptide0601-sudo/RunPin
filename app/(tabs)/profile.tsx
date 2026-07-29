import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { MenuList } from '@/components/profile/MenuList';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsRow } from '@/components/profile/StatsRow';
import { SubscriptionBanner } from '@/components/profile/SubscriptionBanner';
import { AlertModal } from '@/components/ui/AlertModal';
import { SubscribeModal } from '@/components/ui/SubscribeModal';
import { colors } from '@/constants/colors';
import { mockMenuItems, mockProfile, mockProfileStats } from '@/data/mock';
import { FREE_PROPOSAL_LIMIT, useAppData } from '@/lib/appData';
import { useAuth } from '@/lib/auth';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { calculateUserGrade } from '@/lib/userGrade';

export default function ProfileScreen() {
  const router = useRouter();
  const { courses, isSubscribed, remainingProposals, subscribe } = useAppData();
  const { user, initializing, signOut } = useAuth();
  const requireAuth = useRequireAuth();
  const grade = useMemo(() => calculateUserGrade(mockProfile.name, courses), [courses]);
  const [subscribeModalVisible, setSubscribeModalVisible] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const handleProfilePress = () => {
    if (user) {
      setLogoutConfirmVisible(true);
    } else {
      router.push('/auth');
    }
  };

  const handleLogout = () => {
    setLogoutConfirmVisible(false);
    signOut();
  };

  const handleMenuItemPress = (id: string) => {
    switch (id) {
      case 'menu-log':
        requireAuth(() => router.push('/run-log'));
        break;
      case 'menu-saved':
        requireAuth(() => router.push('/saved-courses'));
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
        user={user}
        initializing={initializing}
        gradeLevel={grade.level}
        onPress={handleProfilePress}
      />
      <StatsRow stats={mockProfileStats} />
      <SubscriptionBanner
        isSubscribed={isSubscribed}
        remaining={Math.min(remainingProposals, FREE_PROPOSAL_LIMIT)}
        limit={FREE_PROPOSAL_LIMIT}
        onPress={() => {
          if (isSubscribed) return;
          requireAuth(() => setSubscribeModalVisible(true));
        }}
      />
      <MenuList items={mockMenuItems} onItemPress={handleMenuItemPress} />
      <SubscribeModal
        visible={subscribeModalVisible}
        title="RunPin PRO 구독"
        onSubscribe={handleSubscribe}
        onClose={() => setSubscribeModalVisible(false)}
      />
      <AlertModal
        visible={logoutConfirmVisible}
        icon="log-out-outline"
        title="로그아웃 하시겠어요?"
        message={user?.email ?? undefined}
        primaryAction={{ label: '로그아웃', onPress: handleLogout }}
        secondaryAction={{ label: '취소', onPress: () => setLogoutConfirmVisible(false) }}
        onRequestClose={() => setLogoutConfirmVisible(false)}
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
