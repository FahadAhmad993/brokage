/**
 * WhatsApp-style "swipe a message to the right to reply".
 *
 * Built on PanResponder (not react-native-gesture-handler's Swipeable) so it
 * needs no extra root-view wiring, and it only claims a gesture that is
 * clearly horizontal — vertical list scrolling and the bubble's own
 * tap / long-press keep working untouched.
 */
import { Reply } from 'lucide-react-native';
import React, { useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';

const TRIGGER_DISTANCE = 56;
const MAX_DRAG = 76;

type Props = {
  children: React.ReactNode;
  onReply: () => void;
  disabled?: boolean;
};

export function SwipeToReply({ children, onReply, disabled }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const firedRef = useRef(false);
  const onReplyRef = useRef(onReply);
  onReplyRef.current = onReply;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          g.dx > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderGrant: () => {
          firedRef.current = false;
        },
        onPanResponderMove: (_e, g) => {
          const dx = Math.max(0, Math.min(g.dx, MAX_DRAG));
          translateX.setValue(dx);
          if (dx >= TRIGGER_DISTANCE && !firedRef.current) {
            firedRef.current = true;
            onReplyRef.current();
          }
        },
        onPanResponderRelease: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [translateX],
  );

  if (disabled) {
    return <>{children}</>;
  }

  const iconOpacity = translateX.interpolate({
    inputRange: [0, 24, TRIGGER_DISTANCE],
    outputRange: [0, 0.4, 1],
    extrapolate: 'clamp',
  });

  return (
    <View>
      <Animated.View style={[styles.iconWrap, { opacity: iconOpacity }]} pointerEvents="none">
        <View style={styles.iconCircle}>
          <Reply color={colors.textSecondary} size={16} strokeWidth={2.2} />
        </View>
      </Animated.View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
});
