import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Line, Path, Rect, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../src/theme/tokens';
import { useMemos } from '../src/store/memos';
import { jaggedEdgePath } from '../src/utils/jagged';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace' });

// Mirrors icon composition: a torn memo sheet with perforation dots,
// writing lines, a pin-dot accent, and the mono wordmark inside.
const SHEET_SEED = 7;
const SHEET_W = 240;
const SHEET_H = 300;
const TEAR_DEPTH = 6;
const TEAR_SEGMENTS = 18;

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const { hydrated } = useMemos();

  const sheetOpacity = useSharedValue(0);
  const sheetY = useSharedValue(14);
  const perfReveal = useSharedValue(0);
  const line1 = useSharedValue(0);
  const line2 = useSharedValue(0);
  const line3 = useSharedValue(0);
  const pin = useSharedValue(0);
  const wordmark = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const dotPulse = useSharedValue(0);
  const caret = useSharedValue(1);

  useEffect(() => {
    sheetOpacity.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    sheetY.value = withTiming(0, { duration: 560, easing: Easing.out(Easing.cubic) });
    perfReveal.value = withDelay(240, withTiming(1, { duration: 520 }));
    line1.value = withDelay(520, withTiming(1, { duration: 320 }));
    line2.value = withDelay(640, withTiming(1, { duration: 320 }));
    line3.value = withDelay(760, withTiming(1, { duration: 320 }));
    pin.value = withDelay(900, withTiming(1, { duration: 360, easing: Easing.out(Easing.back(2)) }));
    wordmark.value = withDelay(1000, withTiming(1, { duration: 420 }));
    ctaOpacity.value = withDelay(1180, withTiming(1, { duration: 420 }));
    dotPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    caret.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 520, easing: Easing.linear }),
          withTiming(1, { duration: 520, easing: Easing.linear })
        ),
        -1,
        false
      )
    );
  }, [sheetOpacity, sheetY, perfReveal, line1, line2, line3, pin, wordmark, ctaOpacity, dotPulse, caret]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value }],
  }));

  const perfStyle = useAnimatedStyle(() => ({ opacity: perfReveal.value }));

  const line1Style = useAnimatedStyle(() => ({
    opacity: line1.value,
    transform: [{ scaleX: 0.5 + line1.value * 0.5 }],
  }));
  const line2Style = useAnimatedStyle(() => ({
    opacity: line2.value,
    transform: [{ scaleX: 0.5 + line2.value * 0.5 }],
  }));
  const line3Style = useAnimatedStyle(() => ({
    opacity: line3.value,
    transform: [{ scaleX: 0.5 + line3.value * 0.5 }],
  }));

  const pinStyle = useAnimatedStyle(() => ({
    opacity: pin.value,
    transform: [{ scale: 0.4 + pin.value * 0.6 }],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: (1 - wordmark.value) * 4 }],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: (1 - ctaOpacity.value) * 6 }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + dotPulse.value * 0.65,
    transform: [{ scale: 0.9 + dotPulse.value * 0.25 }],
  }));
  const dotHaloStyle = useAnimatedStyle(() => ({
    opacity: (1 - dotPulse.value) * 0.45,
    transform: [{ scale: 0.9 + dotPulse.value * 1.6 }],
  }));

  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  const enter = () => {
    if (!hydrated) return;
    router.replace('/pad');
  };

  const tornPath = useMemo(
    () =>
      jaggedEdgePath({
        width: SHEET_W,
        height: SHEET_H,
        tearDepth: TEAR_DEPTH,
        segments: TEAR_SEGMENTS,
        seed: SHEET_SEED,
      }),
    []
  );

  return (
    <Pressable onPress={enter} style={styles.screen}>
      <GridBackground width={W} height={H} />

      <CornerTicks insetTop={insets.top + 20} insetBottom={insets.bottom + 20} />

      {/* Top meta row */}
      <View style={[styles.topMeta, { top: insets.top + 18 }]}>
        <View style={styles.statusRow}>
          <View style={styles.dotWrap}>
            <Animated.View style={[styles.dotHalo, dotHaloStyle]} />
            <Animated.View style={[styles.dot, dotStyle]} />
          </View>
          <Text style={styles.metaMono}>READY</Text>
        </View>
        <Text style={styles.metaMono}>NO_001 / 2026.04</Text>
      </View>

      {/* Center: torn memo sheet */}
      <View style={styles.center}>
        <Animated.View style={sheetStyle}>
          {/* Perforation dots above sheet */}
          <Animated.View style={[styles.perfRow, perfStyle]} pointerEvents="none">
            {Array.from({ length: 7 }).map((_, i) => (
              <View key={i} style={styles.perfDot} />
            ))}
          </Animated.View>

          {/* Sheet */}
          <View style={{ width: SHEET_W, height: SHEET_H }}>
            <Svg width={SHEET_W} height={SHEET_H} viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}>
              {/* Very faint inner grid */}
              {Array.from({ length: Math.floor(SHEET_W / 22) }).map((_, i) => (
                <Line
                  key={`gv${i}`}
                  x1={(i + 1) * 22}
                  y1={12}
                  x2={(i + 1) * 22}
                  y2={SHEET_H - 4}
                  stroke={colors.grid}
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: Math.floor(SHEET_H / 22) }).map((_, i) => (
                <Line
                  key={`gh${i}`}
                  x1={0}
                  y1={(i + 1) * 22}
                  x2={SHEET_W}
                  y2={(i + 1) * 22}
                  stroke={colors.grid}
                  strokeWidth={1}
                />
              ))}
              {/* Torn sheet outline (stroke only so grid shows through) */}
              <Path
                d={tornPath}
                fill={colors.paper}
                stroke={colors.borderStrong}
                strokeWidth={1}
                strokeLinejoin="round"
              />
              {/* Subtle redraw of grid clipped inside the sheet would need clip;
                  keeping global grid for simplicity since paper is white on white. */}
              <Rect
                x={0}
                y={SHEET_H - 1}
                width={SHEET_W}
                height={1}
                fill={colors.borderStrong}
              />
              {/* Decorative micro ticks in sheet corners (tech feel) */}
              <Circle cx={10} cy={SHEET_H - 10} r={1.2} fill={colors.inkGhost} />
              <Circle cx={SHEET_W - 10} cy={SHEET_H - 10} r={1.2} fill={colors.inkGhost} />
            </Svg>

            {/* Pin dot accent (top-right inside sheet) */}
            <Animated.View
              style={[
                styles.pinDot,
                { top: 46, right: 20 },
                pinStyle,
              ]}
              pointerEvents="none"
            />

            {/* Writing lines */}
            <View style={styles.lines} pointerEvents="none">
              <Animated.View style={[styles.line, { width: 170 }, line1Style]} />
              <Animated.View style={[styles.line, { width: 140, marginTop: 18 }, line2Style]} />
              <Animated.View style={[styles.line, { width: 90, marginTop: 18 }, line3Style]} />
            </View>

            {/* Wordmark (inside sheet) */}
            <Animated.View style={[styles.wordmarkWrap, wordmarkStyle]} pointerEvents="none">
              <View style={styles.wordmarkRule} />
              <Text style={styles.wordmark}>memo · pad</Text>
              <View style={[styles.wordmarkRule, { marginTop: 6 }]} />
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      {/* CTA */}
      <Animated.View style={[styles.cta, { bottom: insets.bottom + 64 }, ctaStyle]}>
        <View style={styles.ctaLine}>
          <Text style={styles.ctaPrompt}>$</Text>
          <Text style={styles.ctaText}>tap to begin</Text>
          <Animated.Text style={[styles.caret, caretStyle]}>▌</Animated.Text>
        </View>
        <Text style={styles.ctaHint}>tear · pin · archive</Text>
      </Animated.View>

      {/* Bottom meta */}
      <View style={[styles.bottomMeta, { bottom: insets.bottom + 18, width: W }]}>
        <Text style={styles.metaMonoDim}>v1.0.0 · build 2026.04.19</Text>
      </View>
    </Pressable>
  );
}

function GridBackground({ width, height }: { width: number; height: number }) {
  const GAP = 28;
  const cols = Math.ceil(width / GAP) + 1;
  const rows = Math.ceil(height / GAP) + 1;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: cols }).map((_, i) => (
        <Line key={`v${i}`} x1={i * GAP} y1={0} x2={i * GAP} y2={height} stroke={colors.grid} strokeWidth={1} />
      ))}
      {Array.from({ length: rows }).map((_, i) => (
        <Line key={`h${i}`} x1={0} y1={i * GAP} x2={width} y2={i * GAP} stroke={colors.grid} strokeWidth={1} />
      ))}
    </Svg>
  );
}

function CornerTicks({ insetTop, insetBottom }: { insetTop: number; insetBottom: number }) {
  const size = 12;
  const stroke = 1;
  const color = colors.borderStrong;
  const common = { position: 'absolute' as const, width: size, height: size };
  return (
    <>
      <View style={[common, { top: insetTop, left: 20 }]}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: size, height: stroke, backgroundColor: color }} />
        <View style={{ position: 'absolute', left: 0, top: 0, width: stroke, height: size, backgroundColor: color }} />
      </View>
      <View style={[common, { top: insetTop, right: 20 }]}>
        <View style={{ position: 'absolute', right: 0, top: 0, width: size, height: stroke, backgroundColor: color }} />
        <View style={{ position: 'absolute', right: 0, top: 0, width: stroke, height: size, backgroundColor: color }} />
      </View>
      <View style={[common, { bottom: insetBottom, left: 20 }]}>
        <View style={{ position: 'absolute', left: 0, bottom: 0, width: size, height: stroke, backgroundColor: color }} />
        <View style={{ position: 'absolute', left: 0, bottom: 0, width: stroke, height: size, backgroundColor: color }} />
      </View>
      <View style={[common, { bottom: insetBottom, right: 20 }]}>
        <View style={{ position: 'absolute', right: 0, bottom: 0, width: size, height: stroke, backgroundColor: color }} />
        <View style={{ position: 'absolute', right: 0, bottom: 0, width: stroke, height: size, backgroundColor: color }} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topMeta: {
    position: 'absolute',
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  dotWrap: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ink,
  },
  dotHalo: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
  metaMono: {
    fontFamily: MONO,
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 1.6,
  },
  metaMonoDim: {
    fontFamily: MONO,
    fontSize: 10,
    color: colors.inkGhost,
    letterSpacing: 1.6,
  },
  bottomMeta: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  perfRow: {
    width: SHEET_W,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 22,
    marginBottom: 4,
  },
  perfDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.inkGhost,
  },
  pinDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.ink,
  },
  lines: {
    position: 'absolute',
    left: 30,
    top: 96,
  },
  line: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ink,
    transformOrigin: 'left',
  },
  wordmarkWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 38,
    alignItems: 'center',
  },
  wordmarkRule: {
    width: 40,
    height: 1,
    backgroundColor: colors.borderStrong,
    marginBottom: 6,
  },
  wordmark: {
    fontFamily: MONO,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: 3.5,
  },
  cta: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
  },
  ctaLine: { flexDirection: 'row', alignItems: 'center' },
  ctaPrompt: {
    fontFamily: MONO,
    fontSize: 13,
    color: colors.inkGhost,
    marginRight: 8,
  },
  ctaText: {
    fontFamily: MONO,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: 1.2,
  },
  caret: {
    fontFamily: MONO,
    fontSize: 13,
    color: colors.ink,
    marginLeft: 2,
  },
  ctaHint: {
    marginTop: 10,
    fontFamily: MONO,
    fontSize: 9,
    color: colors.inkGhost,
    letterSpacing: 2.5,
  },
});
