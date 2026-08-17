import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

const TRACK = "#fff5f2";
const PILL = "#d72400";

const webPillTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "left, width",
        transitionDuration: "220ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      } as ViewStyle)
    : {};

export const segmentedTextTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "color",
        transitionDuration: "180ms",
        transitionTimingFunction: "ease-out",
      } as TextStyle)
    : {};

export type SegmentedToggleItem<T extends string> = {
  value: T;
  render: (selected: boolean) => ReactNode;
  accessibilityLabel?: string;
};

export function SegmentedToggleBar<T extends string>({
  selected,
  onSelect,
  items,
  itemStyle,
  trackStyle,
  pillHeight = 37.5,
}: {
  selected: T;
  onSelect: (value: T) => void;
  items: Array<SegmentedToggleItem<T>>;
  itemStyle?: ViewStyle;
  trackStyle?: ViewStyle;
  pillHeight?: number;
}) {
  const layouts = useRef<Partial<Record<T, { x: number; width: number }>>>({});
  const [pill, setPill] = useState({ x: 4, width: 0, visible: false });
  const left = useRef(new Animated.Value(4)).current;
  const width = useRef(new Animated.Value(0)).current;
  const measured = useRef(false);

  function movePill(next: { x: number; width: number }) {
    if (Platform.OS === "web") {
      setPill({ ...next, visible: true });
      return;
    }

    if (!measured.current) {
      left.setValue(next.x);
      width.setValue(next.width);
      measured.current = true;
      setPill({ ...next, visible: true });
      return;
    }

    Animated.parallel([
      Animated.timing(left, {
        toValue: next.x,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(width, {
        toValue: next.width,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
    setPill({ ...next, visible: true });
  }

  useEffect(() => {
    const layout = layouts.current[selected];
    if (layout) {
      movePill(layout);
    }
  }, [selected]);

  return (
    <View
      style={[
        {
          backgroundColor: TRACK,
          borderRadius: 99,
          padding: 4,
          flexDirection: "row",
          alignItems: "center",
          position: "relative",
          alignSelf: "flex-start",
        },
        trackStyle,
      ]}
    >
      {Platform.OS === "web" ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: pill.x,
            top: 4,
            width: pill.width,
            height: pillHeight,
            borderRadius: 99,
            backgroundColor: PILL,
            opacity: pill.visible ? 1 : 0,
            shadowColor: PILL,
            shadowOpacity: 0.25,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            ...webPillTransition,
          }}
        />
      ) : (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left,
            top: 4,
            width,
            height: pillHeight,
            borderRadius: 99,
            backgroundColor: PILL,
            opacity: pill.visible ? 1 : 0,
            shadowColor: PILL,
            shadowOpacity: 0.25,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
          }}
        />
      )}
      {items.map((item) => {
        const isSelected = item.value === selected;

        return (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={item.accessibilityLabel}
            onPress={() => onSelect(item.value)}
            onLayout={(event) => {
              const { x, width: itemWidth } = event.nativeEvent.layout;
              layouts.current[item.value] = { x, width: itemWidth };
              if (item.value === selected) {
                movePill({ x, width: itemWidth });
              }
            }}
            style={[
              {
                paddingVertical: 9,
                paddingHorizontal: 16,
                borderRadius: 99,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                zIndex: 1,
              },
              itemStyle,
            ]}
          >
            {item.render(isSelected)}
          </Pressable>
        );
      })}
    </View>
  );
}
