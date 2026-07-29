import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertModal } from '@/components/ui/AlertModal';
import { Pill } from '@/components/ui/Pill';
import { RunChartMotif } from '@/components/ui/RunChartMotif';
import { colors } from '@/constants/colors';
import { useAuth } from '@/lib/auth';

type Mode = 'login' | 'signup' | 'reset';

const TITLE: Record<Mode, string> = {
  login: '로그인',
  signup: '회원가입',
  reset: '비밀번호 재설정',
};

function KakaoIcon() {
  return (
    <View style={styles.kakaoIconWrap}>
      <Ionicons name="chatbubble" size={11} color="#3C1E1E" />
    </View>
  );
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 최상위 강제 로그인 게이트: 뒤로가기로 빠져나갈 수 없어야 함.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  // 평소엔 콘텐츠가 화면에 딱 맞아 스크롤이 필요 없다. 키보드가 콘텐츠를 가릴 때만
  // 스크롤을 허용해서 입력창까지 밀어 올릴 수 있게 한다.
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        router.replace('/');
      } else if (mode === 'signup') {
        await signUp(email.trim(), password, displayName);
        setPassword('');
        setShowSignupSuccess(true);
      } else {
        await resetPassword(email.trim());
        setShowResetSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 발생했어요. 잠시 후 다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    email.trim().length > 0 &&
    (mode === 'reset' || password.length > 0) &&
    (mode !== 'signup' || displayName.trim().length > 0) &&
    !submitting;

  const submitLabel = submitting
    ? '처리 중...'
    : mode === 'login'
      ? '로그인'
      : mode === 'signup'
        ? '회원가입'
        : '재설정 링크 보내기';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        scrollEnabled={keyboardVisible}
      >
        <View style={[styles.brandSection, { paddingTop: insets.top + 64 }]}>
          <Text style={styles.wordmark}>RunPin</Text>
          <View style={styles.motifWrap}>
            <RunChartMotif />
          </View>
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.formSection, { paddingBottom: insets.bottom + 4 }]}>
            <View style={styles.header}>
              <View style={styles.backButtonSlot}>
                {mode !== 'login' ? (
                  <Pressable hitSlop={8} onPress={() => switchMode('login')}>
                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.title}>{TITLE[mode]}</Text>
            </View>

            <View style={styles.form}>
              {mode === 'signup' ? (
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="닉네임"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                  returnKeyType="next"
                  maxLength={20}
                />
              ) : null}
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="이메일"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType={mode === 'reset' ? 'done' : 'next'}
                onSubmitEditing={mode === 'reset' ? handleSubmit : undefined}
              />
              {mode !== 'reset' ? (
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="비밀번호 (6자 이상)"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                  autoComplete="password"
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              ) : null}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pill
              label={submitLabel}
              variant="filled"
              size="lg"
              disabled={!canSubmit}
              onPress={handleSubmit}
              style={styles.submitButton}
              labelStyle={styles.submitButtonLabel}
            />

            {mode === 'login' ? (
              <View style={styles.linkRow}>
                <View style={styles.linkSlotLeft}>
                  <Pressable
                    hitSlop={8}
                    android_ripple={{ color: 'transparent' }}
                    onPress={() => switchMode('reset')}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text style={styles.linkText}>비밀번호 찾기</Text>
                  </Pressable>
                </View>
                <Text style={styles.linkDot}>·</Text>
                <View style={styles.linkSlotRight}>
                  <Pressable
                    hitSlop={8}
                    android_ripple={{ color: 'transparent' }}
                    onPress={() => switchMode('signup')}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text style={styles.linkText}>회원가입</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {mode !== 'reset' ? (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>또는</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Pill의 disabled 기본 opacity(0.5)가 과하게 흐려 보여 여기서만 덜 흐리게 덮어씀 */}
                <Pill
                  label="Google로 계속하기 (준비 중)"
                  variant="outline"
                  size="lg"
                  disabled
                  icon={<Ionicons name="logo-google" size={16} color={colors.text} />}
                  style={{ ...styles.submitButton, opacity: 0.65 }}
                  labelStyle={styles.submitButtonLabel}
                />
                <Pill
                  label="카카오로 계속하기 (준비 중)"
                  variant="outline"
                  size="lg"
                  disabled
                  icon={<KakaoIcon />}
                  style={{ ...styles.submitButton, opacity: 0.65 }}
                  labelStyle={styles.submitButtonLabel}
                />
                <Pill
                  label="Apple로 계속하기 (준비 중)"
                  variant="outline"
                  size="lg"
                  disabled
                  icon={<Ionicons name="logo-apple" size={18} color={colors.text} />}
                  style={{ ...styles.submitButton, opacity: 0.65 }}
                  labelStyle={styles.submitButtonLabel}
                />
              </>
            ) : null}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>

      <AlertModal
        visible={showSignupSuccess}
        title="회원가입이 완료됐어요"
        message="로그인해주세요."
        primaryAction={{
          label: '확인',
          onPress: () => {
            setShowSignupSuccess(false);
            setMode('login');
          },
        }}
        onRequestClose={() => setShowSignupSuccess(false)}
      />

      <AlertModal
        visible={showResetSuccess}
        title="재설정 메일을 보냈어요"
        message="이메일함을 확인해주세요."
        primaryAction={{
          label: '확인',
          onPress: () => {
            setShowResetSuccess(false);
            setMode('login');
          },
        }}
        onRequestClose={() => setShowResetSuccess(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  scrollContent: {
    flexGrow: 1,
  },
  brandSection: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    paddingBottom: 76,
    paddingHorizontal: 32,
  },
  wordmark: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: colors.textInverse,
  },
  motifWrap: {
    width: '100%',
    marginTop: 44,
  },
  formSection: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginTop: -24,
    paddingTop: 32,
    paddingHorizontal: 24,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // 모드별로 뒤로가기 아이콘 유무가 갈려도 타이틀 시작 x좌표가 항상 같도록 자리(슬롯) 고정폭 확보.
  backButtonSlot: {
    width: 22,
    height: 22,
    marginLeft: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  form: {
    gap: 10,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  errorText: {
    fontSize: 13,
    color: colors.like,
    marginTop: -12,
  },
  submitButton: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  submitButtonLabel: {
    textAlign: 'center',
    flex: 1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
  },
  // 두 텍스트 길이가 달라도 점(·)이 행의 정중앙에 오도록 양쪽에 동일한 flex:1 슬롯을 둠.
  linkSlotLeft: {
    flex: 1,
    alignItems: 'flex-end',
  },
  linkSlotRight: {
    flex: 1,
    alignItems: 'flex-start',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  linkDot: {
    fontSize: 13,
    color: colors.textMuted,
    marginHorizontal: 28,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  kakaoIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FEE500',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
