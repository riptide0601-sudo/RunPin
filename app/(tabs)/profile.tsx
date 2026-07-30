import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { MenuList } from '@/components/profile/MenuList';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsRow } from '@/components/profile/StatsRow';
import { SubscriptionBanner } from '@/components/profile/SubscriptionBanner';
import { AlertModal } from '@/components/ui/AlertModal';
import { Pill } from '@/components/ui/Pill';
import { SubscribeModal } from '@/components/ui/SubscribeModal';
import { colors } from '@/constants/colors';
import { mockMenuItems, mockProfile } from '@/data/mock';
import { FREE_PROPOSAL_LIMIT, useAppData } from '@/lib/appData';
import { useAuth } from '@/lib/auth';
import { formatPaceLabel } from '@/lib/format';
import { calculateUserGrade } from '@/lib/userGrade';
import { seedParkCloseAccountData } from '@/lib/seedMockAccountData';
import type { ProfileStats } from '@/types';

export default function ProfileScreen() {
  const router = useRouter();
  const { courses, runLogs, profilePhotoBase64, isSubscribed, remainingProposals, subscribe } = useAppData();
  const { user, initializing, signOut } = useAuth();

  const gradeLevel = useMemo(() => calculateUserGrade(user?.uid, courses).level, [user?.uid, courses]);

  const stats: ProfileStats = useMemo(() => {
    const totalDistanceKm = runLogs.reduce((sum, log) => sum + log.distanceKm, 0);
    const averagePaceSecPerKm =
      runLogs.length > 0 ? runLogs.reduce((sum, log) => sum + log.paceSecPerKm, 0) / runLogs.length : 0;
    const uploadedCourseCount = user ? courses.filter((course) => course.uploaderId === user.uid).length : 0;

    return {
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      myPaceLabel: averagePaceSecPerKm > 0 ? formatPaceLabel(averagePaceSecPerKm) : '-',
      uploadedCourseCount,
      // 커뮤니티 매칭이 아직 mock 시뮬레이션이라 실제 매칭 기록이 없음 -> "준비중" 표시.
      runMatesCount: null,
    };
  }, [runLogs, courses, user]);

  const [subscribeModalVisible, setSubscribeModalVisible] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // 개발용: 파클로즈 계정도 다른 계정과 동일하게 100% 실데이터로 계산하기로 하면서, 시연용
  // 데이터가 필요해 실제 Firestore에 코스/러닝기록을 심어야 한다. 이 버튼은 파클로즈 계정으로
  // 로그인했고 아직 코스를 하나도 안 올린 상태에서만 보이고, 한 번 심으면 다시 안 보인다.
  const showSeedButton = __DEV__ && user?.displayName === mockProfile.name && stats.uploadedCourseCount === 0;

  const handleSeedMockData = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      await seedParkCloseAccountData(user.uid);
    } catch (error) {
      if (__DEV__) {
        console.error('[profile] 샘플 데이터 시드 실패', error);
      }
      Alert.alert('시드하지 못했어요', '잠시 후 다시 시도해주세요');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleProfilePress = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('사진 접근 권한이 필요해요', '설정에서 사진 보관함 접근을 허용해주세요');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    router.push({
      pathname: '/avatar-crop',
      params: { uri: asset.uri, width: String(asset.width), height: String(asset.height) },
    });
  };

  const handleLogout = () => {
    setLogoutConfirmVisible(false);
    signOut();
  };

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
      case 'menu-logout':
        setLogoutConfirmVisible(true);
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
        gradeLevel={gradeLevel}
        photoBase64={profilePhotoBase64}
        onPress={handleProfilePress}
      />
      <StatsRow stats={stats} />
      {showSeedButton ? (
        <View style={styles.devSeedWrapper}>
          <Pill
            label={isSeeding ? '샘플 데이터 채우는 중...' : '[개발용] 파클로즈 샘플 데이터 채우기'}
            variant="outline"
            disabled={isSeeding}
            onPress={handleSeedMockData}
            style={styles.devSeedButton}
          />
        </View>
      ) : null}
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
  devSeedWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  devSeedButton: {
    justifyContent: 'center',
  },
});
