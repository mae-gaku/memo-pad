import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';

type Props = {
  size?: number;
  color?: string;
};

/**
 * Minimal pin: a small dot. Color is used to convey priority.
 */
export function Pin({ size = 8, color = colors.pin }: Props) {
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 0.5} fill={color} />
      <Circle
        cx={size / 2 - size * 0.18}
        cy={size / 2 - size * 0.18}
        r={size * 0.12}
        fill={colors.pinShine}
        opacity={0.6}
      />
    </Svg>
  );
}
