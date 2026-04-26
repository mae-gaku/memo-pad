import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors } from '../theme/tokens';

type Props = { width: number; height?: number };

/**
 * Ring-bound notepad top. Open circles = wire-binding holes.
 * Blends into the desk surface so the pad reads as a real bound block.
 */
export function BinderStrip({ width, height = 22 }: Props) {
  const ringR = 3.25;
  const spacing = 24;
  const count = Math.max(7, Math.floor((width - 16) / spacing));
  const totalSpan = (count - 1) * spacing;
  const startX = (width - totalSpan) / 2;
  const cy = height / 2;

  return (
    <View style={[styles.wrap, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height}>
        {/* Hairline at the bottom as separator from paper */}
        <Line
          x1={0}
          y1={height - 0.5}
          x2={width}
          y2={height - 0.5}
          stroke={colors.borderStrong}
          strokeWidth={1}
        />
        {/* Ring holes */}
        {Array.from({ length: count }).map((_, i) => (
          <Circle
            key={i}
            cx={startX + i * spacing}
            cy={cy}
            r={ringR}
            stroke={colors.inkMuted}
            strokeWidth={1.25}
            fill={colors.surface}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
  },
});
