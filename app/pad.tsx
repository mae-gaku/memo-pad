import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  Pressable,
  Platform,
  Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleOnRN } from 'react-native-worklets';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { colors, fonts, fontSizes, radii, shadows } from '../src/theme/tokens';
import { GridPaper } from '../src/components/GridPaper';
import { BinderStrip } from '../src/components/BinderStrip';
import { useMemos } from '../src/store/memos';
import { haptic } from '../src/utils/haptics';
import { jaggedEdgePath, seedFromString } from '../src/utils/jagged';

const PAPER_PADDING_H = 22;
const PAPER_PADDING_V = 22;
const MEMO_MAX_CHARS = 200;
const COUNTER_SHOW_AT = 0.65; // show when >=65% of limit used
const ONBOARD_KEY = '@memo-pad/onboarded';
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace' });

// Static require so Metro bundles the asset.
const TEAR_SOUND = require('../assets/tear.wav');

export default function NotepadScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { pin, memos } = useMemos();
  const player = useAudioPlayer(TEAR_SOUND);

  const [text, setText] = useState('');
  const [tearingSeed, setTearingSeed] = useState<number | null>(null);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARD_KEY)
      .then((v) => setOnboarded(v === '1'))
      .catch(() => setOnboarded(false));
  }, []);

  const dismissOnboarding = useCallback(() => {
    setOnboarded(true);
    AsyncStorage.setItem(ONBOARD_KEY, '1').catch(() => {});
  }, []);

  const showOnboarding = onboarded === false && memos.length === 0;

  const paperW = Math.min(W - 40, 440);
  const paperH = Math.min(H - insets.top - insets.bottom - 160, 620);
  const binderH = 20;
  // Proportional tear threshold. Touch platforms get a shorter, more forgiving
  // pull since the finger covers the sheet and full-arm drags feel awkward.
  const isTouch = Platform.OS === 'ios' || Platform.OS === 'android';
  const tearThreshold = isTouch
    ? -Math.max(52, Math.min(96, paperH * 0.13))
    : -Math.max(72, Math.min(130, paperH * 0.18));

  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const settling = useRef(false);
  const hasText = useSharedValue(false);

  useEffect(() => {
    hasText.value = text.trim().length > 0;
  }, [text, hasText]);

  useEffect(() => {
    if (onboarded === false && memos.length > 0) {
      dismissOnboarding();
    }
  }, [memos.length, onboarded, dismissOnboarding]);

  const jaggedPath = useMemo(() => {
    if (tearingSeed === null) return undefined;
    return jaggedEdgePath({
      width: paperW,
      height: paperH,
      tearDepth: 6,
      segments: 22,
      seed: tearingSeed,
    });
  }, [paperH, paperW, tearingSeed]);

  const playTearSound = useCallback(() => {
    try {
      player.seekTo(0);
      player.play();
    } catch {}
  }, [player]);

  const commitTear = useCallback(() => {
    if (!text.trim()) return;
    const seed = seedFromString(text + Date.now());
    setTearingSeed(seed);
    pin({ text: text.trim(), seed });
    playTearSound();
    haptic.success();
  }, [text, pin, playTearSound]);

  const afterTear = useCallback(() => {
    setText('');
    setTearingSeed(null);
    translateY.value = 0;
    rotation.value = 0;
    opacity.value = 1;
    settling.current = false;
  }, [opacity, rotation, translateY]);

  const onThresholdReached = useCallback(() => {
    haptic.medium();
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-4, 9999])
        .failOffsetX([-140, 140])
        .onStart(() => {
          'worklet';
          if (settling.current) return;
          scheduleOnRN(Keyboard.dismiss);
        })
        .onUpdate((e) => {
          'worklet';
          if (settling.current) return;
          const dy = Math.min(0, e.translationY);
          translateY.value = dy;
          rotation.value = interpolate(dy, [0, -300], [0, -6]);
          if (dy < tearThreshold && dy > tearThreshold - 4) {
            scheduleOnRN(onThresholdReached);
          }
        })
        .onEnd((e) => {
          'worklet';
          if (settling.current) return;
          if (e.translationY < tearThreshold) {
            if (!hasText.value) {
              translateY.value = withSequence(
                withTiming(-18, { duration: 90 }),
                withTiming(6, { duration: 90 }),
                withSpring(0, { damping: 14, stiffness: 260 })
              );
              rotation.value = withSequence(
                withTiming(-2, { duration: 90 }),
                withTiming(2, { duration: 90 }),
                withSpring(0, { damping: 14, stiffness: 260 })
              );
              scheduleOnRN(haptic.warning);
              return;
            }
            settling.current = true;
            scheduleOnRN(commitTear);
            translateY.value = withTiming(-H, {
              duration: 520,
              easing: Easing.out(Easing.cubic),
            });
            rotation.value = withTiming(-10, { duration: 520 });
            opacity.value = withTiming(0, { duration: 520 }, (finished) => {
              if (finished) scheduleOnRN(afterTear);
            });
          } else {
            translateY.value = withSpring(0, { damping: 18, stiffness: 160 });
            rotation.value = withSpring(0, { damping: 18, stiffness: 160 });
          }
        }),
    [H, tearThreshold, commitTear, afterTear, onThresholdReached, opacity, rotation, translateY]
  );

  const paperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const hintStyle = useAnimatedStyle(() => {
    const v = Math.min(1, Math.abs(translateY.value) / Math.abs(tearThreshold));
    return { opacity: 1 - v };
  });

  const tearHintStyle = useAnimatedStyle(() => {
    const v = Math.min(1, Math.abs(translateY.value) / Math.abs(tearThreshold));
    return { opacity: v };
  });

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Top-right: minimal board link */}
        <Pressable
          onPress={() => router.push('/board')}
          style={[styles.cornerBtn, { top: insets.top + 10, right: 18 }]}
          hitSlop={12}
        >
          <Text style={styles.cornerBtnText}>
            {memos.length > 0 ? `${memos.length}` : '—'} ↗
          </Text>
        </Pressable>

        <View style={styles.padWrap} pointerEvents="box-none">
          {/* Binder */}
          <View style={{ width: paperW }}>
            <BinderStrip width={paperW} height={binderH} />
          </View>

          {/* Paper area: stacked sheets behind + top animated sheet */}
          <View style={[styles.paperArea, { width: paperW, height: paperH, marginTop: -1 }]}>
            <View
              style={[
                styles.stackSheet,
                { width: paperW, height: paperH, left: 5, top: 4, opacity: 0.45 },
              ]}
            />
            <View
              style={[
                styles.stackSheet,
                { width: paperW, height: paperH, left: 2.5, top: 2, opacity: 0.75 },
              ]}
            />

            <Animated.View
              style={[styles.paper, { width: paperW, height: paperH }, paperStyle]}
            >
              <GridPaper width={paperW} height={paperH} topJaggedPath={jaggedPath} />
              <View
                style={[
                  styles.paperInner,
                  { paddingHorizontal: PAPER_PADDING_H, paddingVertical: PAPER_PADDING_V },
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="ここに書く"
                  placeholderTextColor={colors.inkGhost}
                  value={text}
                  onChangeText={setText}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                  selectionColor={colors.ink}
                  editable={tearingSeed === null}
                  maxLength={MEMO_MAX_CHARS}
                />
              </View>
              {text.length >= MEMO_MAX_CHARS * COUNTER_SHOW_AT ? (
                <View pointerEvents="none" style={styles.counter}>
                  <Text
                    style={[
                      styles.counterText,
                      text.length >= MEMO_MAX_CHARS && styles.counterTextMax,
                    ]}
                  >
                    {MEMO_MAX_CHARS - text.length}
                  </Text>
                </View>
              ) : null}
              <Animated.View pointerEvents="none" style={[styles.tearHint, tearHintStyle]}>
                <Text style={styles.tearHintText}>RELEASE TO TEAR</Text>
              </Animated.View>
            </Animated.View>
          </View>
        </View>

        {showOnboarding ? (
          <OnboardingCoach
            bottom={insets.bottom + 20}
            onDismiss={dismissOnboarding}
          />
        ) : (
          <Animated.View
            style={[styles.hintWrap, { bottom: insets.bottom + 24 }, hintStyle]}
            pointerEvents="none"
          >
            <Text style={styles.hintText}>↑ DRAG UP TO TEAR</Text>
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

function OnboardingCoach({ bottom, onDismiss }: { bottom: number; onDismiss: () => void }) {
  const arrow = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
    arrow.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [arrow, fade]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: (1 - fade.value) * 8 }],
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -arrow.value * 10 }],
    opacity: 0.45 + arrow.value * 0.55,
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.coachWrap, { bottom }, wrapStyle]}
    >
      <Animated.Text style={[styles.coachArrow, arrowStyle]}>↑</Animated.Text>
      <Text style={styles.coachTitle}>書いて、上にドラッグ</Text>
      <View style={styles.coachSteps}>
        <CoachStep n="01" label="write" />
        <CoachStep n="02" label="drag up" />
        <CoachStep n="03" label="tear · pin" />
      </View>
      <Pressable onPress={onDismiss} hitSlop={12} style={styles.coachDismiss}>
        <Text style={styles.coachDismissText}>GOT IT</Text>
      </Pressable>
    </Animated.View>
  );
}

function CoachStep({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.coachStep}>
      <Text style={styles.coachStepN}>{n}</Text>
      <Text style={styles.coachStepLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  padWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperArea: {
    position: 'relative',
    overflow: 'visible',
  },
  stackSheet: {
    position: 'absolute',
    backgroundColor: colors.paper,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paper: {
    ...shadows.paper,
    borderRadius: radii.sm,
    backgroundColor: colors.paper,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  paperInner: {
    flex: 1,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.memo,
    color: colors.ink,
    lineHeight: fontSizes.memo * 1.5,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  counter: {
    position: 'absolute',
    bottom: 8,
    right: 12,
  },
  counterText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 1,
  },
  counterTextMax: {
    color: colors.priorityHigh,
  },
  tearHint: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
  },
  tearHintText: {
    fontFamily: fonts.medium,
    fontSize: 9,
    color: colors.inkMuted,
    letterSpacing: 2,
  },
  hintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 2,
  },
  cornerBtn: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cornerBtnText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.ink,
    letterSpacing: 1,
  },
  coachWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  coachArrow: {
    fontFamily: fonts.medium,
    fontSize: 28,
    color: colors.ink,
    marginBottom: 4,
    lineHeight: 30,
  },
  coachTitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: 1,
    marginBottom: 10,
  },
  coachSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coachStep: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  coachStepN: {
    fontFamily: MONO,
    fontSize: 9,
    color: colors.inkGhost,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  coachStepLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 1.2,
  },
  coachDismiss: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
  },
  coachDismissText: {
    fontFamily: MONO,
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 2,
  },
});
