import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';
import { WebIcon } from '../components/WebIcon';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminDashboard() {
  const { colors, isDark } = useTheme();

  const adminCards = [
    {
      title: "Fare Manager",
      description: "Manage route fares, update pricing logic, and oversee fare history.",
      icon: "cash-outline",
      route: "/fare-manager",
      gradient: ["#10b981", "#059669"]
    },
    {
      title: "Pulse Manager",
      description: "Monitor real-time system health, API status, and performance metrics.",
      icon: "pulse-outline",
      route: "/pulse-manager",
      gradient: ["#3b82f6", "#2563eb"]
    },
    {
      title: "Contributions Manager",
      description: "Review and approve user-submitted fares, routes, and missing stops.",
      icon: "people-outline",
      route: "/contributions-manager",
      gradient: ["#8b5cf6", "#6d28d9"]
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <WebIcon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Admin Dashboard</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Manage your system configurations, oversee community contributions, and monitor overall performance.
        </Text>

        <View style={styles.grid}>
          {adminCards.map((card, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.card, { backgroundColor: colors.surface }]}
              activeOpacity={0.8}
              onPress={() => router.push(card.route as any)}
            >
              <LinearGradient
                colors={card.gradient as [string, string]}
                style={styles.iconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <WebIcon name={card.icon} size={28} color="#fff" />
              </LinearGradient>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{card.title}</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{card.description}</Text>
              
              <View style={[styles.actionRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <Text style={{ color: card.gradient[0], fontWeight: '600' }}>Manage</Text>
                <WebIcon name="chevron-forward" size={16} color={card.gradient[0]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)'
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    marginLeft: -8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  grid: {
    gap: 20,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  }
});
