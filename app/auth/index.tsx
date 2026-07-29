import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertModal } from '@/components/ui/AlertModal';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { useAuth } from '@/lib/auth';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        router.back();
      } else {
        await signUp(email.trim(), password, displayName);
        setPassword('');
        setShowSignupSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 발생했어요. 잠시 후 다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[styles.container, { paddingTop: insets.top + 8 }]}
        onStartShouldSetResponderCapture={() => {
          Keyboard.dismiss();
          return false;
        }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{mode === 'login' ? '로그인' : '회원가입'}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.modeRow}>
            <Pill
              label="로그인"
              variant={mode === 'login' ? 'filled' : 'outline'}
              onPress={() => switchMode('login')}
              style={styles.modePill}
            />
            <Pill
              label="회원가입"
              variant={mode === 'signup' ? 'filled' : 'outline'}
              onPress={() => switchMode('signup')}
              style={styles.modePill}
            />
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
              returnKeyType="next"
            />
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
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pill
            label={submitting ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            variant="filled"
            size="lg"
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={styles.submitButton}
            labelStyle={styles.submitButtonLabel}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pill
            label="Google로 계속하기 (준비 중)"
            variant="outline"
            size="lg"
            disabled
            style={styles.submitButton}
            labelStyle={styles.submitButtonLabel}
          />
        </View>
      </View>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modePill: {
    flex: 1,
    justifyContent: 'center',
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
    marginTop: -8,
  },
  submitButton: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  submitButtonLabel: {
    textAlign: 'center',
    flex: 1,
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
});
