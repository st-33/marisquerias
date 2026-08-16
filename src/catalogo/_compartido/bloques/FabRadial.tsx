'use no memo';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemedColors } from '../../../compartido/hooks/useThemedColors';
import type { FabConfig, FabItem } from '../../../plataforma/base/tipos/contratos';
import { ejecutarAccionFab } from './fabAction';

const BUBBLE_SIZE = 64;
const MINI_BUBBLE_SIZE = 50;

interface BubbleProps {
  item: FabItem;
  index: number;
  total: number;
  isOpen: SharedValue<number>;
  onPress: (item: FabItem) => void;
  position: 'top-right' | 'bottom-right';
  bubbleColor: string;
}

const Bubble: React.FC<BubbleProps> = ({
  item,
  index,
  total,
  isOpen,
  onPress,
  position,
  bubbleColor,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const angle =
      position === 'top-right'
        ? (Math.PI / 2) * (index / Math.max(total - 1, 1)) + Math.PI
        : (Math.PI / 2) * (index / Math.max(total - 1, 1)) + Math.PI / 2;

    const radius = 70; // Menos exagerado
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);

    const delay = index * 25; // Más veloz la cascada

    return {
      transform: [
        {
          scale: withDelay(
            delay,
            withTiming(isOpen.value, { duration: 250, easing: Easing.out(Easing.quad) })
          ),
        },
        {
          translateX: withDelay(
            delay,
            withTiming(isOpen.value * x, { duration: 250, easing: Easing.out(Easing.quad) })
          ),
        },
        {
          translateY: withDelay(
            delay,
            withTiming(isOpen.value * y, { duration: 250, easing: Easing.out(Easing.quad) })
          ),
        },
      ],
      opacity: withDelay(delay, withTiming(isOpen.value, { duration: 200 })),
    };
  });

  return (
    <Animated.View
      style={[staticStyles.miniBubbleContainer, { backgroundColor: bubbleColor }, animatedStyle]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        onPress={() => onPress(item)}
        style={({ pressed }) => [staticStyles.fill, { opacity: pressed ? 0.82 : 1 }]}
      >
        {item.icon}
      </Pressable>
    </Animated.View>
  );
};

const FabRadial: React.FC<FabConfig> = ({ items, initialKey, position = 'bottom-right' }) => {
  const COLORS = useThemedColors();
  const [activeKey, setActiveKey] = useState(initialKey ?? items[0]?.key);

  useEffect(() => {
    const nextKey = initialKey ?? items[0]?.key;
    setActiveKey((current) => (current === nextKey ? current : nextKey));
  }, [initialKey, items]);

  const isOpen = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Latido suave, lento y difuminado (escalado leve)
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulse]);

  const { mainItem, childItems } = useMemo(() => {
    const main = items.find((item) => item.key === activeKey) ?? items[0];
    const children = items.filter((item) => item.key !== activeKey);
    return { mainItem: main, childItems: children };
  }, [items, activeKey]);

  const toggleMenu = () => {
    isOpen.value = withTiming(isOpen.value === 0 ? 1 : 0, {
      duration: 250,
      easing: Easing.out(Easing.quad),
    });
  };

  const handleChildPress = (item: FabItem) => {
    setActiveKey(item.key);
    ejecutarAccionFab(item);
    isOpen.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
  };

  const animatedMainBubbleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: isOpen.value > 0 ? 1 : pulse.value }],
    };
  });

  const themedStyles = useMemo(
    () => ({
      mainBubble: {
        ...staticStyles.mainBubbleContainer,
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
      },
      miniBubbleColor: COLORS.bg.tertiary,
    }),
    [COLORS]
  );

  if (!mainItem) {
    return null;
  }

  return (
    <View
      style={[
        staticStyles.container,
        staticStyles[position as 'top-right' | 'bottom-right' | 'bottom-left'],
      ]}
      pointerEvents="box-none"
    >
      {childItems.map((item, index) => (
        <Bubble
          key={item.key}
          item={item}
          index={index}
          total={childItems.length}
          isOpen={isOpen}
          onPress={handleChildPress}
          position={position as 'top-right' | 'bottom-right'}
          bubbleColor={themedStyles.miniBubbleColor}
        />
      ))}
      <Animated.View style={[themedStyles.mainBubble, animatedMainBubbleStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mainItem.label}
          onPress={() => {
            if (childItems.length > 0) {
              toggleMenu();
            } else {
              ejecutarAccionFab(mainItem);
            }
          }}
          onLongPress={mainItem.onLongPress}
          style={({ pressed }) => [staticStyles.fill, { opacity: pressed ? 0.82 : 1 }]}
        >
          {mainItem.icon}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const staticStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  'top-right': {
    top: 60,
    right: 20,
  },
  'bottom-right': {
    bottom: 90,
    right: 25,
  },
  'bottom-left': {
    bottom: 90,
    left: 25,
  },
  mainBubbleContainer: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10,
  },
  fill: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BUBBLE_SIZE / 2,
  },
  miniBubbleContainer: {
    position: 'absolute',
    width: MINI_BUBBLE_SIZE,
    height: MINI_BUBBLE_SIZE,
    borderRadius: MINI_BUBBLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 9,
  },
});

export default FabRadial;
