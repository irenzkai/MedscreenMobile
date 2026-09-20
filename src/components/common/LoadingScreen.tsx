import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Infinite flickering pulse from 0% to 100% opacity
    const flickerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    flickerAnimation.start();

    return () => flickerAnimation.stop();
  }, [opacityAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: opacityAnim }]}>
        {/* Medscreen Circular Clipped Logo */}
        <View style={styles.logoCircle}>
          <Image
            source={require('../../../assets/images/logo.jpg')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>

        {/* Brand Name Title */}
        <Text style={styles.brandTitle}>
          MED<Text style={styles.brandAccent}>SCREEN</Text>
        </Text>

        {message ? (
          <Text style={styles.messageText}>
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
    backgroundColor: '#FFFFFF', // Pure white background
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2.5,
    borderColor: '#19D38C',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    color: '#1C232D',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  brandAccent: {
    color: '#19D38C',
  },
  messageText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
});