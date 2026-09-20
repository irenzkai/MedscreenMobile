import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { BorderRadius } from '../../constants/theme';

export interface ScrollShortcutButtonProps {
  scrollViewRef: React.RefObject<ScrollView | null>;
  contentOffsetY: number;
  contentHeight: number;
  layoutHeight: number;
  style?: StyleProp<ViewStyle>;
}

export function useScrollShortcut() {
  const [contentOffsetY, setContentOffsetY] = React.useState(0);
  const [contentHeight, setContentHeight] = React.useState(0);
  const [layoutHeight, setLayoutHeight] = React.useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setContentOffsetY(event.nativeEvent.contentOffset.y);
    setContentHeight(event.nativeEvent.contentSize.height);
    setLayoutHeight(event.nativeEvent.layoutMeasurement.height);
  };

  return {
    contentOffsetY,
    contentHeight,
    layoutHeight,
    handleScroll,
  };
}

export const ScrollShortcutButton: React.FC<ScrollShortcutButtonProps> = ({
  scrollViewRef,
  contentOffsetY,
  contentHeight,
  layoutHeight,
  style,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Only render if the screen is actually scrollable (content exceeds viewport by at least 80px)
  const isScrollable = contentHeight > layoutHeight + 80;
  if (!isScrollable) return null;

  // If scrolled down past 180px, show "Go to Top"; otherwise show "Go to Bottom"
  const isNearTop = contentOffsetY < 180;

  const handlePress = () => {
    if (isNearTop) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } else {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // Safe bottom offset that clears the Android navigation bar and wizard buttons
  const dynamicBottom = Math.max(insets.bottom + 85, 96);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={[
        styles.floatingButton,
        {
          backgroundColor: theme.brandDark,
          borderColor: theme.borderSecondary,
          bottom: dynamicBottom,
        },
        style,
      ]}>
      <Ionicons
        name={isNearTop ? 'arrow-down' : 'arrow-up'}
        size={18}
        color={theme.brandAccent}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 18,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.75, // Subtle but easily readable
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
});