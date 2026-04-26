import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, Circle, ClipPath, Path } from 'react-native-svg';
import { colors } from '../theme/tokens';

type Props = {
  width: number;
  height: number;
  topJaggedPath?: string;
  gridSize?: number;
  /** Patternless option for the most minimal surface */
  showGrid?: boolean;
};

/**
 * White paper surface with a subtle dot grid (Rhodia-style dot pad).
 * Optional torn top edge via SVG clip.
 */
export function GridPaper({
  width,
  height,
  topJaggedPath,
  gridSize = 22,
  showGrid = true,
}: Props) {
  const clipId = 'paperClip';
  const hasClip = !!topJaggedPath;

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <Pattern
            id="dots"
            x={0}
            y={0}
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <Circle cx={gridSize / 2} cy={gridSize / 2} r={1} fill={colors.border} />
          </Pattern>
          {hasClip ? (
            <ClipPath id={clipId}>
              <Path d={topJaggedPath!} />
            </ClipPath>
          ) : null}
        </Defs>

        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={colors.paper}
          clipPath={hasClip ? `url(#${clipId})` : undefined}
        />
        {showGrid ? (
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="url(#dots)"
            clipPath={hasClip ? `url(#${clipId})` : undefined}
          />
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
