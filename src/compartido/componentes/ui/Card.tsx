import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../../temas/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export const Card = ({ children, style }: CardProps) => {
  const { theme, isElite } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: isElite ? theme.colors.borderLight : 'transparent',
          borderWidth: isElite ? 1 : 0,
          shadowColor: theme.colors.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
