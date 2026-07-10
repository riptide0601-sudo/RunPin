import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardEvent,
  type KeyboardEventEasing,
} from 'react-native';

import { Card } from '@/components/ui/Card';
import { DifficultySlider } from '@/components/ui/DifficultySlider';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { generateCourseName } from '@/lib/courseName';
import { routeDistanceKm } from '@/lib/geo';
import { findNearestCourse } from '@/lib/matching';
import { RUN_SUMMARY, RUN_SUMMARY_TIME_LABEL } from '@/lib/runSummary';
import { mockProfile } from '@/data/mock';
import type { Course, LatLng } from '@/types';

type OptionId = 'matched' | 'auto' | 'custom';

const DEFAULT_DIFFICULTY: 1 | 2 | 3 | 4 | 5 = 3;

// Android keyboard events never carry a real duration/easing (Keyboard.d.ts:
// "Always set to 0 on Android" / "Always set to 'keyboard' on Android"), which is
// why KeyboardAvoidingView's internal `if (duration && easing)` check silently
// skips its LayoutAnimation there — the sheet snaps instead of sliding. We drive
// the offset ourselves so both platforms animate symmetrically on show and hide.
const FALLBACK_KEYBOARD_ANIMATION_MS = 250;
const KEYBOARD_EASING: Record<KeyboardEventEasing, (value: number) => number> = {
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInEaseOut: Easing.inOut(Easing.ease),
  linear: Easing.linear,
  keyboard: Easing.out(Easing.ease),
};

// TEMP DEBUG: remove once the double-tap-to-dismiss-keyboard cause is confirmed.
let tapSeq = 0;
const debugLog = (...args: unknown[]) => {
  if (__DEV__) console.log('[RunFinish]', ...args);
};

export interface SaveCourseResult {
  courseName: string;
  newCourse: Course | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

interface RunFinishModalProps {
  visible: boolean;
  myRoute: LatLng[];
  courses: Course[];
  onSave: (result: SaveCourseResult) => void;
  onSkip: (difficulty: 1 | 2 | 3 | 4 | 5) => void;
}

export function RunFinishModal({ visible, myRoute, courses, onSave, onSkip }: RunFinishModalProps) {
  const matchedCourse = useMemo(() => findNearestCourse(myRoute, courses), [myRoute, courses]);
  const [autoSuggestion, setAutoSuggestion] = useState(() => generateCourseName());
  const [optionId, setOptionId] = useState<OptionId>('auto');
  const [customName, setCustomName] = useState('');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(DEFAULT_DIFFICULTY);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // iOS reports real duration/easing on the "will" events, which is what lets
    // KeyboardAvoidingView's LayoutAnimation track the system curve. Android never
    // fires "will" events and always reports duration: 0 there, so we fall back to
    // "did" events plus our own fixed duration/easing to get a comparable slide.
    const showEventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEventName = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const animateTo = (toValue: number, event: KeyboardEvent) => {
      Animated.timing(keyboardOffset, {
        toValue,
        duration: event.duration > 0 ? event.duration : FALLBACK_KEYBOARD_ANIMATION_MS,
        easing: KEYBOARD_EASING[event.easing] ?? KEYBOARD_EASING.keyboard,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEventName, (event) => {
      debugLog('keyboardShow', Date.now());
      setIsKeyboardVisible(true);
      animateTo(event.endCoordinates.height, event);
    });
    const hideSub = Keyboard.addListener(hideEventName, (event) => {
      debugLog('keyboardHide', Date.now());
      setIsKeyboardVisible(false);
      animateTo(0, event);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  useEffect(() => {
    if (visible) {
      setAutoSuggestion(generateCourseName());
      setOptionId(matchedCourse ? 'matched' : 'auto');
      setCustomName('');
      setDifficulty(DEFAULT_DIFFICULTY);
    }
    // matchedCourse is intentionally excluded: it's derived from the route/courses
    // captured at the moment the modal opens, not something that should reset selection mid-flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Only the empty backdrop area above the sheet counts as "바깥" — the sheet
  // itself has non-interactive gaps (padding around the summary bar, between
  // cards) that a whole-content TouchableWithoutFeedback would also catch,
  // which would make an accidental tap inside the sheet close the modal.
  // Closing the modal and dismissing the keyboard are two separate concerns:
  // this must always close (that's what "바깥 탭" means), regardless of
  // whether a text field happened to be focused.
  const handleBackdropPress = () => {
    debugLog('backdrop press', ++tapSeq, Date.now());
    debugLog('calling Keyboard.dismiss() from backdrop', Date.now());
    Keyboard.dismiss();
    onSkip(difficulty);
  };

  const selectedName =
    optionId === 'matched' ? (matchedCourse?.name ?? '') : optionId === 'auto' ? autoSuggestion.name : customName;

  const canSave = selectedName.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;

    if (optionId === 'matched' && matchedCourse) {
      onSave({ courseName: matchedCourse.name, newCourse: null, difficulty });
      return;
    }

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      name: selectedName.trim(),
      coordinates: myRoute,
      category: optionId === 'auto' ? autoSuggestion.category : '골목길',
      difficulty,
      distanceKm: routeDistanceKm(myRoute),
      uploaderName: mockProfile.name,
      createdAt: Date.now(),
    };
    onSave({ courseName: newCourse.name, newCourse, difficulty });
  };

  const summaryItems = [
    { label: '시간', value: RUN_SUMMARY_TIME_LABEL },
    { label: '거리', value: `${RUN_SUMMARY.distanceKm}km` },
    { label: '페이스', value: RUN_SUMMARY.paceLabel },
    { label: '케이던스', value: `${RUN_SUMMARY.cadenceSpm}spm` },
    { label: '심박수', value: `${RUN_SUMMARY.avgHeartRateBpm}bpm` },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => onSkip(difficulty)}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropSpacer} onPress={handleBackdropPress} />
        <Animated.View style={{ paddingBottom: keyboardOffset }}>
          <View
            style={styles.sheet}
            // Capture fires at touch-start, before any descendant (the text
            // input, option Pressables, the difficulty slider's own
            // PanGestureHandler) gets a chance to react — this matters
            // because on Android, tapping outside a focused TextInput can
            // get consumed by the native view's own focus-clearing behavior
            // before it ever reaches the JS responder chain, which is why a
            // release-based handler on the bubble phase needed a second tap
            // to actually fire. Returning false here means this view never
            // claims the responder, so it's purely a side-effect hook: every
            // other tap (buttons, options, the slider, the input itself)
            // still behaves exactly as before.
            onStartShouldSetResponderCapture={() => {
              debugLog('sheet capture', ++tapSeq, 'kbVisible=', isKeyboardVisible, Date.now());
              if (isKeyboardVisible) {
                debugLog('calling Keyboard.dismiss() from sheet capture', Date.now());
                Keyboard.dismiss();
              }
              return false;
            }}
          >
            <View style={styles.summaryBar}>
              <View style={styles.summaryStats}>
                {summaryItems.map((item, index) => (
                  <Fragment key={item.label}>
                    {index > 0 ? <View style={styles.summaryDivider} /> : null}
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryItemLabel}>{item.label}</Text>
                      <Text style={styles.summaryItemValue}>{item.value}</Text>
                    </View>
                  </Fragment>
                ))}
              </View>
            </View>

            <Text style={styles.title}>이 코스를{'\n'}업로드할까요?</Text>

            <View style={styles.options}>
              {matchedCourse ? (
                <OptionRow selected={optionId === 'matched'} onPress={() => setOptionId('matched')} title={matchedCourse.name} />
              ) : null}

              <OptionRow selected={optionId === 'auto'} onPress={() => setOptionId('auto')} title={autoSuggestion.name} />

              <OptionRow selected={optionId === 'custom'} onPress={() => setOptionId('custom')} title="직접 입력">
                <TextInput
                  style={styles.input}
                  value={customName}
                  onChangeText={(text) => {
                    setCustomName(text);
                    setOptionId('custom');
                  }}
                  onFocus={() => debugLog('input focus', Date.now())}
                  onBlur={() => {
                    debugLog('input blur -> calling Keyboard.dismiss()', Date.now());
                    // Safety net: if blur fires after some other dismiss attempt
                    // (or the keyboard re-focuses the input before it can close),
                    // force it closed once more here.
                    Keyboard.dismiss();
                  }}
                  placeholder="코스 이름을 입력하세요"
                  placeholderTextColor={colors.textMuted}
                />
              </OptionRow>
            </View>

            <Card style={styles.difficultyCard}>
              <DifficultySlider value={difficulty} onChange={setDifficulty} />
            </Card>

            <View style={styles.actions}>
              <Pressable onPress={() => onSkip(difficulty)} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
                <Text style={styles.skipText}>나중에 할게요</Text>
              </Pressable>
              <Pill label="업로드" variant="filled" onPress={handleSave} disabled={!canSave} style={styles.saveButton} />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface OptionRowProps {
  selected: boolean;
  onPress: () => void;
  title: string;
  children?: ReactNode;
}

function OptionRow({ selected, onPress, title, children }: OptionRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={[styles.optionCard, selected ? styles.optionCardSelected : undefined]}>
        <View style={styles.optionRow}>
          <View style={[styles.radio, selected ? styles.radioSelected : undefined]}>
            {selected ? <View style={styles.radioDot} /> : null}
          </View>
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>{title}</Text>
            {children}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropSpacer: {
    flex: 1,
  },
  sheet: {
    flex: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 16,
  },
  summaryBar: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  summaryItemLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  summaryItemValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 30,
  },
  options: {
    gap: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  optionCard: {
    padding: 16,
  },
  optionCardSelected: {
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioSelected: {
    borderColor: colors.ink,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.ink,
  },
  optionTextWrap: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 14,
    color: colors.text,
  },
  difficultyCard: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    paddingHorizontal: 14,
    // DifficultySlider now pins its own content to a fixed height (58px);
    // mirror that here (58 + 12*2 padding) so this Card can't be resized by
    // an ancestor layout either, on top of the child already being fixed.
    minHeight: 82,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  saveButton: {
    paddingHorizontal: 24,
  },
});
