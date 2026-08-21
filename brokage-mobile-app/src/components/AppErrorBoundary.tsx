import React, { type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_NAME } from '../config/appConfig';
import { logger } from '../lib/logger';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  children: ReactNode;
  onRecover: () => void;
};

type State = { hasError: boolean };

/**
 * Catches render errors in child trees so the app can show a recovery screen
 * instead of a blank native crash.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('AppErrorBoundary', error.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap} accessibilityRole="alert">
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            {APP_NAME} hit an unexpected error. You can try again — if the problem
            continues, restart the app.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={() => this.props.onRecover()}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
            <Text style={styles.btnLabel}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: 80,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  body: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  btn: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    borderRadius: layout.radius.md,
    backgroundColor: colors.primary,
  },
  btnPressed: { opacity: 0.92 },
  btnLabel: {
    ...typography.headline,
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
