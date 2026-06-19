import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { ms } from '../../lib/utils/metrics';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorBoundaryContent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

const ErrorBoundaryContent: React.FC<{
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}> = ({ error, errorInfo, onReset }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Something went wrong
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          An unexpected error occurred. Please try again or restart the app.
        </Text>

        {error && (
          <ScrollView style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              {error.toString()}
            </Text>
            {errorInfo && (
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                {errorInfo.componentStack}
              </Text>
            )}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onReset}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ms(20),
  },
  content: {
    width: '100%',
    maxWidth: 400,
    borderRadius: ms(16),
    padding: ms(24),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(4) },
    shadowOpacity: 0.1,
    shadowRadius: ms(8),
    elevation: 4,
  },
  title: {
    fontSize: ms(20),
    fontWeight: 'bold',
    marginBottom: ms(12),
    textAlign: 'center',
  },
  message: {
    fontSize: ms(14),
    marginBottom: ms(20),
    textAlign: 'center',
    lineHeight: ms(20),
  },
  errorContainer: {
    width: '100%',
    maxHeight: ms(150),
    marginBottom: ms(20),
    padding: ms(12),
    borderRadius: ms(8),
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  errorText: {
    fontSize: ms(12),
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: ms(16),
  },
  button: {
    paddingHorizontal: ms(24),
    paddingVertical: ms(12),
    borderRadius: ms(8),
    minWidth: ms(120),
  },
  buttonText: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '600',
    textAlign: 'center',
  },
});