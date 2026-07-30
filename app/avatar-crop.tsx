import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { AvatarCropScreen } from '@/components/profile/AvatarCropScreen';
import { useAuth } from '@/lib/auth';
import { saveUserPhoto } from '@/lib/userProfile';

export default function AvatarCropRoute() {
  const router = useRouter();
  const { user } = useAuth();
  const { uri, width, height } = useLocalSearchParams<{ uri: string; width: string; height: string }>();
  const [isSaving, setIsSaving] = useState(false);

  const handleCropped = async (photoBase64: string) => {
    if (!user) {
      router.back();
      return;
    }

    setIsSaving(true);
    try {
      await saveUserPhoto(user.uid, photoBase64);
      router.back();
    } catch (error) {
      if (__DEV__) {
        console.error('[avatar-crop] 프로필 사진 저장 실패', error);
      }
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해주세요');
      setIsSaving(false);
    }
  };

  return (
    <AvatarCropScreen
      imageUri={uri ?? null}
      imageWidth={Number(width) || 0}
      imageHeight={Number(height) || 0}
      busy={isSaving}
      onCancel={() => router.back()}
      onCropped={handleCropped}
    />
  );
}
