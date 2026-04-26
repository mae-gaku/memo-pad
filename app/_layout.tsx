import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { View, ActivityIndicator } from 'react-native';
import { MemoProvider } from '../src/store/memos';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  const [loaded] = useFonts({
    Caveat_400Regular,
    Caveat_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MemoProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.paper },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="pad" options={{ animation: 'fade' }} />
            <Stack.Screen name="board" options={{ animation: 'slide_from_bottom' }} />
          </Stack>
        </MemoProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
