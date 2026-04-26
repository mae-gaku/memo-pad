import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, Pattern, Line, Rect, ClipPath } from 'react-native-svg';
import { colors, fonts, fontSizes, shadows } from '../theme/tokens';
import { jaggedEdgePath } from '../utils/jagged';

type Props = {
  width: number;
  height: number;
  text: string;
  seed: number;
  fontSize?: number;
  paperColor?: string;
};

/**
 * A torn-off memo displayed on the board. Clean white paper with jagged top edge.
 */
export function TornMemo({
  width,
  height,
  text,
  seed,
  fontSize = fontSizes.memo,
  paperColor = colors.paper,
}: Props) {
  const path = jaggedEdgePath({ width, height, tearDepth: 5, segments: 18, seed });

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <Pattern
            id={`g-${seed}`}
            x={0}
            y={0}
            width={22}
            height={22}
            patternUnits="userSpaceOnUse"
          >
            <Line x1={0} y1={0} x2={22} y2={0} stroke={colors.grid} strokeWidth={1} />
            <Line x1={0} y1={0} x2={0} y2={22} stroke={colors.grid} strokeWidth={1} />
          </Pattern>
          <ClipPath id={`c-${seed}`}>
            <Path d={path} />
          </ClipPath>
        </Defs>
        <Path d={path} fill={paperColor} />
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={`url(#g-${seed})`}
          clipPath={`url(#c-${seed})`}
        />
        <Path d={path} fill="none" stroke={colors.paperEdge} strokeWidth={0.75} />
      </Svg>
      <View style={styles.textWrap} pointerEvents="none">
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize,
            color: colors.ink,
            lineHeight: fontSize * 1.4,
          }}
          numberOfLines={Math.max(3, Math.floor(height / (fontSize * 1.5)))}
          ellipsizeMode="tail"
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...shadows.memo,
    backgroundColor: 'transparent',
  },
  textWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 18,
    bottom: 12,
  },
});
