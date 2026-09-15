import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing } from '../../constants/theme';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const theme = useTheme();
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth infinite flickering pulse between 0% and 100% opacity
    const flickerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    flickerAnimation.start();

    return () => flickerAnimation.stop();
  }, [opacityAnim]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgMain }]}>
      <Animated.View style={[styles.content, { opacity: opacityAnim }]}>
        {/* Medscreen Circular Clipped Logo */}
        <View style={[styles.logoCircle, { borderColor: theme.brandAccent }]}>
          <Image
            source={require('../../../assets/images/logo.jpg')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>

        {/* Brand Name Title */}
        <Text style={[styles.brandTitle, { color: theme.textMain }]}>
          MED<Text style={{ color: theme.brandAccent }}>SCREEN</Text>
        </Text>

        {message ? (
          <Text style={[styles.messageText, { color: theme.textMuted }]}>
            {message}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    letterSpacing: 0.5,
  },
});