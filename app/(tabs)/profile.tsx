import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { AvatarCropModal } from '@/components/profile/AvatarCropModal';
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
import { formatPaceLabel } from '@/lib/format';
import { calculateGradeFromCourses, calculateUserGrade } from '@/lib/userGrade';
import { saveUserPhoto } from '@/lib/userProfile';
import type { ProfileStats } from '@/types';

// 파클로즈 계정은 "임의로 한동안 사용한 유저"라는 가정 하에 등급/업로드 코스 수는 mock
// 코스 데이터로 실제 계산하고(계산식이 바뀌어도 자동으로 맞춰짐), 총거리/페이스/함께 뛴
// 러너처럼 연결된 mock 러닝 기록이 없는 값만 mockProfileStats 고정값을 그대로 쓴다
// (다른 기존 계정·신규 가입 계정은 모두 실데이터를 쓴다).
const MOCK_STATS_DISPLAY_NAME = mockProfile.name;

export default function ProfileScreen() {
  const router = useRouter();
  const { courses, runLogs, profilePhotoBase64, isSubscribed, remainingProposals, subscribe } = useAppData();
  const { user, initializing, signOut } = useAuth();
  const isMockAccount = user?.displayName === MOCK_STATS_DISPLAY_NAME;

  // 파클로즈 계정은 uploaderId가 없는 mock 코스라서 이름으로 걸러야 한다 — 실유저는 항상
  // uploaderId(uid) 기준(calculateUserGrade)이라 서로 이름이 겹칠 걱정은 없다.
  const mockAccountCourses = useMemo(
    () => (isMockAccount ? courses.filter((course) => course.uploaderName === MOCK_STATS_DISPLAY_NAME) : []),
    [isMockAccount, courses],
  );

  const gradeLevel = useMemo(() => {
    if (isMockAccount) return calculateGradeFromCourses(mockAccountCourses).level;
    return calculateUserGrade(user?.uid, courses).level;
  }, [isMockAccount, mockAccountCourses, user?.uid, courses]);

  const stats: ProfileStats = useMemo(() => {
    if (isMockAccount) {
      return { ...mockProfileStats, uploadedCourseCount: mockAccountCourses.length };
    }

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
  }, [isMockAccount, mockAccountCourses, runLogs, courses, user]);

  const [subscribeModalVisible, setSubscribeModalVisible] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [pickedImage, setPickedImage] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleProfilePress = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (isUploadingAvatar) return;

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
    setPickedImage({ uri: asset.uri, width: asset.width, height: asset.height });
    setCropModalVisible(true);
  };

  const handleCropCancel = () => {
    setCropModalVisible(false);
    setPickedImage(null);
  };

  const handleCropped = async (photoBase64: string) => {
    setCropModalVisible(false);
    setPickedImage(null);
    if (!user) return;

    setIsUploadingAvatar(true);
    try {
      await saveUserPhoto(user.uid, photoBase64);
    } catch (error) {
      if (__DEV__) {
        console.error('[profile] 프로필 사진 저장 실패', error);
      }
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해주세요');
    } finally {
      setIsUploadingAvatar(false);
    }
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
    <>
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
      {/* ScrollView 형제로 렌더링 — 스크롤 콘텐츠 내부에 두면 화면 전체를 덮는 절대 위치
          기준이 스크롤 콘텐츠 크기/위치가 되어버려 어긋날 수 있다 (AvatarCropModal.tsx 참고). */}
      <AvatarCropModal
        visible={cropModalVisible}
        imageUri={pickedImage?.uri ?? null}
        imageWidth={pickedImage?.width ?? 0}
        imageHeight={pickedImage?.height ?? 0}
        onCancel={handleCropCancel}
        onCropped={handleCropped}
      />
    </>
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
