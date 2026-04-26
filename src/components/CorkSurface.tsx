import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';

type Props = { width: number; height: number };

/**
 * Minimal tech board surface. Replaces the cork texture with a subtle
 * dotted grid on a cool neutral background (Notion / Ollama style).
 */
export function CorkSurface({ width, height }: Props) {
  const dot = 20;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.board }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="dots" x={0} y={0} width={dot} height={dot} patternUnits="userSpaceOnUse">
            <Circle cx={dot / 2} cy={dot / 2} r={1} fill={colors.boardDot} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#dots)" />
      </Svg>
    </View>
  );
}
