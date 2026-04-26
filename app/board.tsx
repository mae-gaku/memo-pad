import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Platform } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CorkSurface } from '../src/components/CorkSurface';
import { PinnedMemo } from '../src/components/PinnedMemo';
import { MemoActionMenu } from '../src/components/MemoActionMenu';
import { useMemos } from '../src/store/memos';
import { colors, fonts, fontSizes, radii, spacing } from '../src/theme/tokens';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace' });

const MEMO_W = 140;
const MEMO_H = 150;

export default function BoardScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { memos, move, setPriority, trash, undoTrash, canUndo } = useMemos();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const headerH = 56 + insets.top;
  const boardW = W;
  const boardH = H - headerH;

  const selectedMemo = memos.find((m) => m.id === selectedId) ?? null;

  return (
    <View style={styles.screen}>
      <CorkSurface width={boardW} height={H} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, height: headerH }]}>
        <Pressable onPress={() => router.back()} hitSlop={16} style={styles.back}>
          <Text style={styles.backText}>← PAD</Text>
        </Pressable>
        <Text style={styles.title}>
          WALL · <Text style={styles.count}>{memos.length}</Text>
        </Text>
        <Text style={styles.hint}>HOLD FOR ACTIONS</Text>
      </View>

      {/* Board */}
      <View style={[styles.board, { width: boardW, height: boardH, top: headerH }]}>
        {memos.length === 0 ? (
          <EmptyBoard onGoPad={() => router.back()} />
        ) : (
          memos.map((m) => (
            <PinnedMemo
              key={m.id}
              memo={m}
              boardWidth={boardW}
              boardHeight={boardH}
              memoWidth={MEMO_W}
              memoHeight={MEMO_H}
              selected={selectedId === m.id}
              onMove={(x, y) => move(m.id, x, y)}
              onActivate={() => setSelectedId(m.id)}
            />
          ))
        )}

        {selectedMemo ? (
          <>
            <Pressable
              style={styles.backdrop}
              onPress={() => setSelectedId(null)}
            />
            <MemoActionMenu
              memo={selectedMemo}
              boardWidth={boardW}
              boardHeight={boardH}
              memoWidth={MEMO_W}
              memoHeight={MEMO_H}
              onSetPriority={(p) => {
                setPriority(selectedMemo.id, p);
              }}
              onTrash={() => {
                trash(selectedMemo.id);
                setSelectedId(null);
              }}
            />
          </>
        ) : null}
      </View>

      {canUndo ? (
        <Animated.View
          entering={FadeInDown.duration(180)}
          exiting={FadeOutDown.duration(140)}
          style={[styles.toast, { bottom: insets.bottom + 20 }]}
        >
          <Text style={styles.toastText}>MEMO DELETED</Text>
          <View style={styles.toastDivider} />
          <Pressable onPress={undoTrash} hitSlop={10} style={styles.toastBtn}>
            <Text style={styles.toastBtnText}>UNDO</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function EmptyBoard({ onGoPad }: { onGoPad: () => void }) {
  const tilt = useSharedValue(0);
  const fade = useSharedValue(0);
  const arrow = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    tilt.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      )
    );
    arrow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [arrow, fade, tilt]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: (1 - fade.value) * 10 }],
  }));
  const sampleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-3 + tilt.value * 1.6}deg` }],
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + arrow.value * 0.6,
    transform: [{ translateX: arrow.value * 4 }],
  }));

  return (
    <Animated.View style={[styles.empty, wrapStyle]} pointerEvents="box-none">
      <View style={styles.emptyHeader}>
        <View style={styles.emptyDot} />
        <Text style={styles.emptyMeta}>WALL · EMPTY</Text>
      </View>

      <Animated.View style={[styles.sample, sampleStyle]} pointerEvents="none">
        <View style={styles.samplePin} />
        <Text style={styles.sampleText}>ここに{'\n'}ちぎったメモが{'\n'}貼られる</Text>
      </Animated.View>

      <View style={styles.emptyCallout}>
        <Text style={styles.emptyTitle}>まだ何もピンされていない</Text>
        <Text style={styles.emptySub}>pad で書いて、上にドラッグするとちぎれる</Text>
      </View>

      <Pressable onPress={onGoPad} hitSlop={12} style={styles.emptyCta}>
        <Text style={styles.emptyCtaText}>GO TO PAD</Text>
        <Animated.Text style={[styles.emptyCtaArrow, arrowStyle]}>→</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.board,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  backText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.ink,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.title,
    color: colors.ink,
    letterSpacing: 2,
  },
  count: {
    color: colors.inkMuted,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.inkMuted,
    letterSpacing: 1.5,
  },
  board: {
    position: 'absolute',
    left: 0,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.inkGhost,
    marginRight: 8,
  },
  emptyMeta: {
    fontFamily: MONO,
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 2,
  },
  sample: {
    width: 150,
    minHeight: 150,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingTop: 26,
    paddingBottom: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  samplePin: {
    position: 'absolute',
    top: 8,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ink,
  },
  sampleText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkGhost,
    letterSpacing: 0.5,
  },
  emptyCallout: {
    marginTop: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    letterSpacing: 0.5,
  },
  emptyCta: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: colors.paper,
  },
  emptyCtaText: {
    fontFamily: MONO,
    fontSize: 11,
    color: colors.ink,
    letterSpacing: 2,
  },
  emptyCtaArrow: {
    fontFamily: MONO,
    fontSize: 12,
    color: colors.ink,
    marginLeft: 8,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -110 }],
    width: 220,
    zIndex: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  toastText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.paper,
    letterSpacing: 1.5,
  },
  toastDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.inkMuted,
    marginHorizontal: 10,
  },
  toastBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  toastBtnText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.paper,
    letterSpacing: 1.5,
  },
});
