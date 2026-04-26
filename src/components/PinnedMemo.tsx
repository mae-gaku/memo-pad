import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Pin } from './Pin';
import { TornMemo } from './TornMemo';
import type { Memo, Priority } from '../store/memos';
import { haptic } from '../utils/haptics';
import { colors } from '../theme/tokens';

type Props = {
  memo: Memo;
  boardWidth: number;
  boardHeight: number;
  memoWidth: number;
  memoHeight: number;
  selected: boolean;
  onMove: (x: number, y: number) => void;
  onActivate: () => void;
};

function priorityPin(p: Priority): string {
  if (p === 'high') return colors.priorityHigh;
  if (p === 'mid') return colors.priorityMid;
  return colors.pin;
}

function priorityPaper(p: Priority): string {
  if (p === 'high') return colors.priorityHighPaper;
  if (p === 'mid') return colors.priorityMidPaper;
  return colors.paper;
}

export function PinnedMemo({
  memo,
  boardWidth,
  boardHeight,
  memoWidth,
  memoHeight,
  selected,
  onMove,
  onActivate,
}: Props) {
  const maxX = Math.max(1, boardWidth - memoWidth);
  const maxY = Math.max(1, boardHeight - memoHeight);
  const initialX = memo.x * maxX;
  const initialY = memo.y * maxY;

  const posX = useSharedValue(initialX);
  const posY = useSharedValue(initialY);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const scale = useSharedValue(1);
  const tilt = useSharedValue(memo.rotation);
  const lifted = useSharedValue(0);

  useEffect(() => {
    posX.value = initialX;
    posY.value = initialY;
  }, [initialX, initialY, posX, posY]);

  // Gentle highlight when selected (menu open)
  const selectGlow = useSharedValue(0);
  useEffect(() => {
    selectGlow.value = withTiming(selected ? 1 : 0, { duration: 180 });
  }, [selected, selectGlow]);

  const commitMove = useCallback(
    (nx: number, ny: number) => {
      onMove(nx, ny);
    },
    [onMove]
  );

  const commitActivate = useCallback(() => {
    haptic.selection();
    onActivate();
  }, [onActivate]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(6)
        .onStart(() => {
          'worklet';
          startX.value = posX.value;
          startY.value = posY.value;
          lifted.value = 1;
          scale.value = withSpring(1.05, { damping: 16, stiffness: 260 });
          scheduleOnRN(haptic.light);
        })
        .onUpdate((e) => {
          'worklet';
          posX.value = startX.value + e.translationX;
          posY.value = startY.value + e.translationY;
        })
        .onEnd(() => {
          'worklet';
          const fx = Math.max(0, Math.min(maxX, posX.value));
          const fy = Math.max(0, Math.min(maxY, posY.value));
          posX.value = withSpring(fx, { damping: 22, stiffness: 240 });
          posY.value = withSpring(fy, { damping: 22, stiffness: 240 });
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
          lifted.value = 0;
          scheduleOnRN(commitMove, fx / maxX, fy / maxY);
        }),
    [commitMove, lifted, maxX, maxY, posX, posY, scale, startX, startY]
  );

  const longPress = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(300)
        .maxDistance(12)
        .onStart(() => {
          'worklet';
          scheduleOnRN(commitActivate);
        }),
    [commitActivate]
  );

  const gesture = useMemo(() => Gesture.Race(longPress, pan), [longPress, pan]);

  const animatedStyle = useAnimatedStyle(() => ({
    left: posX.value,
    top: posY.value,
    transform: [
      { rotate: `${tilt.value}deg` },
      { scale: scale.value * (1 + selectGlow.value * 0.03) },
    ],
    zIndex: lifted.value || selectGlow.value > 0.5 ? 20 : 1,
    elevation: lifted.value ? 8 : 3,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: selectGlow.value,
  }));

  const pinColor = priorityPin(memo.priority);
  const paperColor = priorityPaper(memo.priority);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.wrap,
          { width: memoWidth, height: memoHeight },
          animatedStyle,
        ]}
      >
        <TornMemo
          width={memoWidth}
          height={memoHeight}
          text={memo.text}
          seed={memo.seed}
          paperColor={paperColor}
        />
        <Animated.View style={[styles.selectRing, ringStyle]} pointerEvents="none" />
        <View style={styles.pinWrap} pointerEvents="none">
          <Pin size={8} color={pinColor} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
  pinWrap: {
    position: 'absolute',
    top: -2,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -4,
  },
  selectRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 3,
  },
});
