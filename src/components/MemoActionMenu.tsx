import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors, fonts, radii, shadows } from '../theme/tokens';
import type { Memo, Priority } from '../store/memos';

type Props = {
  memo: Memo;
  boardWidth: number;
  boardHeight: number;
  memoWidth: number;
  memoHeight: number;
  onSetPriority: (p: Priority) => void;
  onTrash: () => void;
};

const MENU_W = 196;
const MENU_H = 48;
const GAP = 10;

function swatchFill(p: Priority): string {
  if (p === 'high') return colors.priorityHigh;
  if (p === 'mid') return colors.priorityMid;
  return colors.paper;
}

export function MemoActionMenu({
  memo,
  boardWidth,
  boardHeight,
  memoWidth,
  memoHeight,
  onSetPriority,
  onTrash,
}: Props) {
  const maxX = Math.max(1, boardWidth - memoWidth);
  const maxY = Math.max(1, boardHeight - memoHeight);
  const memoLeft = memo.x * maxX;
  const memoTop = memo.y * maxY;
  const memoCenterX = memoLeft + memoWidth / 2;
  const memoBottom = memoTop + memoHeight;

  const spaceBelow = boardHeight - memoBottom;
  const placeBelow = spaceBelow >= MENU_H + GAP + 8;
  const top = placeBelow ? memoBottom + GAP : Math.max(8, memoTop - MENU_H - GAP);
  const left = Math.max(
    8,
    Math.min(boardWidth - MENU_W - 8, memoCenterX - MENU_W / 2)
  );

  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      exiting={FadeOut.duration(100)}
      style={[styles.menu, { top, left, width: MENU_W, height: MENU_H }]}
    >
      <View style={styles.swatchRow}>
        {(['none', 'mid', 'high'] as const).map((p) => {
          const active = memo.priority === p;
          return (
            <Pressable
              key={p}
              onPress={() => onSetPriority(p)}
              style={[styles.swatchHit, active && styles.swatchHitActive]}
              hitSlop={4}
            >
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: swatchFill(p),
                    borderColor: p === 'none' ? colors.borderStrong : 'transparent',
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.divider} />
      <Pressable onPress={onTrash} style={styles.trash} hitSlop={6}>
        <Text style={styles.trashText}>DELETE</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    ...shadows.paper,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatchHit: {
    padding: 4,
    borderRadius: 999,
  },
  swatchHitActive: {
    backgroundColor: colors.surface,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },
  trash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  trashText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.priorityHigh,
  },
});
