import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useThemedColors } from '../../compartido/hooks/useThemedColors';
import type { FabConfig, FabItem } from '../../sistema/tipos/contratos';
import { ejecutarAccionFab } from './fabAction';

const BUBBLE_SIZE = 64;
const MINI_BUBBLE_SIZE = 48;

type FabPosition = 'top-right' | 'bottom-right' | 'bottom-left';

interface BubbleProps {
  item: FabItem;
  index: number;
  total: number;
  isOpen: SharedValue<number>;
  onPress: (item: FabItem) => void;
  position: FabPosition;
  bubbleColor: string;
  borderColor: string;
}

const Bubble: React.FC<BubbleProps> = ({
  item,
  index,
  total,
  isOpen,
  onPress,
  position,
  bubbleColor,
  borderColor,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const angle =
      position === 'top-right'
        ? (Math.PI / 2) * (index / Math.max(total - 1, 1)) + Math.PI
        : (Math.PI / 2) * (index / Math.max(total - 1, 1)) + Math.PI / 2;

    const radius = 88;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    const delay = index * 28;

    return {
      transform: [
        {
          scale: withDelay(
            delay,
            withTiming(isOpen.value, { duration: 190, easing: Easing.out(Easing.quad) })
          ),
        },
        {
          translateX: withDelay(
            delay,
            withTiming(isOpen.value * x, { duration: 220, easing: Easing.out(Easing.cubic) })
          ),
        },
        {
          translateY: withDelay(
            delay,
            withTiming(isOpen.value * y, { duration: 220, easing: Easing.out(Easing.cubic) })
          ),
        },
      ],
      opacity: withDelay(delay, withTiming(isOpen.value, { duration: 160 })),
    };
  });

  return (
    <Animated.View
      style={[
        staticStyles.miniBubbleContainer,
        { backgroundColor: bubbleColor, borderColor },
        animatedStyle,
      ]}
    >
      <View style={[staticStyles.bubbleLabel, position === 'bottom-left' ? staticStyles.bubbleLabelRight : staticStyles.bubbleLabelLeft, { pointerEvents: 'none' }]}>
        <Text numberOfLines={1} style={staticStyles.bubbleLabelText}>{item.label}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        onPress={() => onPress(item)}
        style={({ pressed }) => [staticStyles.fill, { opacity: pressed ? 0.78 : 1 }]}
      >
        {item.icon}
      </Pressable>
    </Animated.View>
  );
};

const FabRadial: React.FC<FabConfig> = ({ items, initialKey, position = 'bottom-right' }) => {
  const COLORS = useThemedColors();
  const [activeKey, setActiveKey] = useState(initialKey ?? items[0]?.key);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isOpen = useSharedValue(0);

  const { mainItem, childItems } = useMemo(() => {
    const main = items.find((item) => item.key === activeKey) ?? items[0];
    const children = items.filter((item) => item.key !== activeKey);
    return { mainItem: main, childItems: children };
  }, [items, activeKey]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    isOpen.value = withTiming(0, { duration: 170, easing: Easing.out(Easing.quad) });
  };

  const toggleMenu = () => {
    const next = !isMenuOpen;
    setIsMenuOpen(next);
    isOpen.value = withTiming(next ? 1 : 0, {
      duration: next ? 220 : 170,
      easing: Easing.out(Easing.quad),
    });
  };

  const handleChildPress = (item: FabItem) => {
    setActiveKey(item.key);
    ejecutarAccionFab(item);
    closeMenu();
  };

  const animatedMainBubbleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withTiming(isOpen.value > 0 ? 1.03 : 1, {
          duration: 160,
          easing: Easing.out(Easing.quad),
        }),
      },
    ],
  }));

  const themedStyles = useMemo(
    () => ({
      mainBubble: {
        ...staticStyles.mainBubbleContainer,
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
      },
      miniBubbleColor: COLORS.bg.tertiary,
      borderColor: COLORS.bg.elevated,
    }),
    [COLORS]
  );

  if (!mainItem) return null;

  return (
    <View
      collapsable={false}
      style={[staticStyles.layer, { pointerEvents: isMenuOpen ? 'auto' : 'box-none' }]}
    >
      {isMenuOpen && (
        <Pressable
          accessibilityLabel="Cerrar acciones"
          accessibilityRole="button"
          onPress={closeMenu}
          style={staticStyles.backdrop}
        />
      )}
      <View style={[staticStyles.container, staticStyles[position], { pointerEvents: 'box-none' }]}>
        {childItems.map((item, index) => (
          <Bubble
            key={item.key}
            item={item}
            index={index}
            total={childItems.length}
            isOpen={isOpen}
            onPress={handleChildPress}
            position={position}
            bubbleColor={themedStyles.miniBubbleColor}
            borderColor={themedStyles.borderColor}
          />
        ))}
        <Animated.View style={[themedStyles.mainBubble, animatedMainBubbleStyle]}>
          <View style={[staticStyles.mainOrbit, { borderColor: `${COLORS.primary}70`, pointerEvents: 'none' }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mainItem.label}
            accessibilityState={{ expanded: isMenuOpen }}
            onPress={() => {
              if (childItems.length > 0) toggleMenu();
              else ejecutarAccionFab(mainItem);
            }}
            onLongPress={mainItem.onLongPress}
            style={({ pressed }) => [staticStyles.fill, { opacity: pressed ? 0.78 : 1 }]}
          >
            <View style={staticStyles.mainIconWell}>{mainItem.icon}</View>
          </Pressable>
          {isMenuOpen && <View style={[staticStyles.openIndicator, { backgroundColor: COLORS.success, pointerEvents: 'none' }]} />}
        </Animated.View>
      </View>
    </View>
  );
};

const staticStyles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 7, 12, 0.52)',
  },
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
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
    elevation: 8,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
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
    borderWidth: 1,
    elevation: 5,
    zIndex: 9,
  },
  bubbleLabel: {
    backgroundColor: 'rgba(8, 12, 19, 0.92)',
    borderColor: 'rgba(224, 233, 246, 0.15)',
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    position: 'absolute',
    top: 7,
  },
  bubbleLabelLeft: { right: MINI_BUBBLE_SIZE + 9 },
  bubbleLabelRight: { left: MINI_BUBBLE_SIZE + 9 },
  bubbleLabelText: { color: '#EDF2F8', fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  mainOrbit: {
    borderRadius: BUBBLE_SIZE / 2 + 7,
    borderWidth: 1,
    bottom: -7,
    left: -7,
    position: 'absolute',
    right: -7,
    top: -7,
  },
  mainIconWell: { alignItems: 'center', justifyContent: 'center' },
  openIndicator: { borderColor: '#0A0D14', borderRadius: 6, borderWidth: 2, height: 10, position: 'absolute', right: 5, top: 5, width: 10 },
});

export default FabRadial;
