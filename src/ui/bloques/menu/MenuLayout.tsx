import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { theme } from '@compartido/theme';

type MenuLayoutProps = {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  main: React.ReactNode;
  floating?: React.ReactNode;
  sidebarOpen: boolean;
  isMobile: boolean;
  onDismissSidebar?: () => void;
};

const SIDEBAR_WIDTH = 260;

export function MenuLayout({
  header,
  sidebar,
  main,
  floating,
  sidebarOpen,
  isMobile,
  onDismissSidebar,
}: MenuLayoutProps) {
  const showSidebar = !isMobile || sidebarOpen;

  return (
    <View style={styles.root}>
      {header}

      <View style={styles.body}>
        {showSidebar && (
          <View style={[styles.sidebarContainer, isMobile && styles.sidebarFloating]}>
            {sidebar}
          </View>
        )}

        <View style={styles.mainContainer}>{main}</View>
      </View>

      {isMobile && sidebarOpen && (
        <Pressable
          style={styles.overlay}
          onPress={onDismissSidebar}
          android_ripple={{ color: 'transparent' }}
        />
      )}

      {floating}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarContainer: {
    width: SIDEBAR_WIDTH,
    backgroundColor: theme.colors.surfaceDark,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  sidebarFloating: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 12,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: SIDEBAR_WIDTH,
    right: 0,
    backgroundColor: 'rgba(9, 13, 23, 0.5)',
  },
});
