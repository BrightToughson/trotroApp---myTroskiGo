import { useTheme } from "../../../context/ThemeContext";
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { WebIcon } from "../../../components/WebIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ContributionModal from "../../../components/ContributionModal";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { ContributionService, Contribution as ContributionType } from "../../../lib/ContributionService";
import { ActivityIndicator, Alert } from "react-native";

export default function Contribution() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<"price" | "route" | "stop" | "general" | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [submissions, setSubmissions] = useState<ContributionType[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [editingContribution, setEditingContribution] = useState<ContributionType | undefined>(undefined);

  useEffect(() => {
    if (activeTab === "history" && user?.id) {
      loadHistory();
    }
  }, [activeTab, user?.id]);

  const loadHistory = async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const data = await ContributionService.fetchUserContributions(user.id);
      setSubmissions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handlePress = (id: string) => {
    setSelectedType(id as any);
    setEditingContribution(undefined);
    setModalVisible(true);
  };

  const handleEdit = (sub: ContributionType) => {
    setSelectedType(sub.type);
    setEditingContribution(sub);
    setModalVisible(true);
  };

  const handleDelete = (sub: ContributionType) => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this contribution? This action cannot be undone.")) {
        executeDelete(sub);
      }
    } else {
      Alert.alert(
        "Delete Contribution",
        "Are you sure you want to delete this contribution? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => executeDelete(sub) }
        ]
      );
    }
  };

  const executeDelete = async (sub: ContributionType) => {
    try {
      await ContributionService.deleteContribution(sub.id, sub.type);
      loadHistory();
    } catch(e: any) {
      console.error("Deletion error:", e);
      const errorMsg = e?.message || "Could not delete contribution.";
      if (Platform.OS !== 'web') {
        Alert.alert("Error", errorMsg);
      } else {
        alert(`Error: ${errorMsg}`);
      }
    }
  };

  const contributionOptions = [
    {
      id: "price",
      title: "Share Price Update",
      description: "Did you notice a change in fares? Help us keep the community informed with the latest prices.",
      iconName: "pricetag",
      color: "#10b981", // Green for money/prices
      action: () => handlePress("price"),
      actionText: "Update Fares",
    },
    {
      id: "route",
      title: "Suggest New Route",
      description: "Know a trotro route that isn't listed? Share it with us so others can find their way.",
      iconName: "map",
      color: "#8b5cf6", // Purple for routes/mapping
      action: () => handlePress("route"),
      actionText: "Add a Route",
    },
    {
      id: "stop",
      title: "Report Missing Stops",
      description: "Help us improve navigation accuracy by reporting stops or landmarks that we missed.",
      iconName: "location",
      color: "#ef4444", // Red for locations/pins
      action: () => handlePress("stop"),
      actionText: "Add a Stop",
    },
    {
      id: "general",
      title: "General Suggestions",
      description: "Have ideas on how to make myTroskiGo better? We would love to hear from you.",
      iconName: "bulb",
      color: "#f59e0b", // Yellow/Orange for ideas
      action: () => handlePress("general"),
      actionText: "Share Feedback",
    }
  ];

  return (
    <Animated.View entering={FadeInDown.duration(800).springify()} style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient 
        colors={[colors.background, isDark ? "#0f172a" : "#f0f4ff"]} 
        style={StyleSheet.absoluteFill} 
      />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Contributions</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Share your local knowledge with fellow travelers!
          </Text>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === "new" && [styles.activeTab, { backgroundColor: colors.primary }]]}
            onPress={() => setActiveTab("new")}
          >
            <Text style={[styles.tabText, { color: activeTab === "new" ? '#fff' : colors.textSecondary }]}>
              New Contribution
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === "history" && [styles.activeTab, { backgroundColor: colors.primary }]]}
            onPress={() => setActiveTab("history")}
          >
            <Text style={[styles.tabText, { color: activeTab === "history" ? '#fff' : colors.textSecondary }]}>
              My Submissions
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "new" ? (
          <View style={styles.cardsContainer}>
            {contributionOptions.map((option, index) => (
              <Animated.View 
                key={option.id}
                entering={FadeInDown.delay(index * 150).duration(800).springify()}
              >
                <TouchableOpacity 
                  style={[
                    styles.card, 
                    { 
                      backgroundColor: isDark ? "rgba(30, 41, 59, 0.6)" : "#ffffff",
                      borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"
                    }
                  ]}
                  activeOpacity={0.7}
                  onPress={option.action}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: `${option.color}15` }]}>
                      <WebIcon name={option.iconName} size= {28} color={option.color} />
                    </View>
                    <View style={styles.cardTitleContainer}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{option.title}</Text>
                    </View>
                  </View>
                  
                  <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                    {option.description}
                  </Text>

                  <View style={[styles.actionButton, { backgroundColor: `${option.color}15` }]}>
                    <Text style={[styles.actionButtonText, { color: option.color }]}>{option.actionText}</Text>
                    <WebIcon name="arrow-forward" size= {16} color={option.color} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        ) : (
          <View style={styles.historyContainer}>
            {!user ? (
              <View style={styles.emptyState}>
                <WebIcon name="person-circle-outline" size= {48} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.text }]}>Sign in to track your contributions!</Text>
              </View>
            ) : isLoadingHistory ? (
              <ActivityIndicator size= "large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : submissions.length === 0 ? (
              <View style={styles.emptyState}>
                <WebIcon name="document-text-outline" size= {48} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.text }]}>You have not made any contributions yet.</Text>
              </View>
            ) : (
              submissions.map((sub, index) => {
                const isPending = sub.status === 'pending';
                const isApproved = sub.status === 'approved';
                const statusColor = isPending ? '#f59e0b' : isApproved ? '#10b981' : '#ef4444';
                
                return (
                  <Animated.View 
                    key={sub.id} 
                    entering={FadeInDown.delay(index * 100).duration(500)}
                    style={[
                      styles.historyCard, 
                      { 
                        backgroundColor: isDark ? "rgba(30, 41, 59, 0.4)" : "#ffffff",
                        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" 
                      }
                    ]}
                  >
                    <View style={styles.historyHeader}>
                      <Text style={[styles.historyType, { color: colors.primary }]}>
                        {sub.type === 'price' ? '💰 Fare Update' : sub.type === 'route' ? '🗺️ New Route' : sub.type === 'stop' ? '📍 Missing Stop' : '💡 Feedback'}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {sub.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    
                    {sub.type === 'price' && <Text style={[styles.historyDetails, { color: colors.text }]}>{sub.payload?.origin} to {sub.payload?.destination} • GHS {sub.payload?.actual_fare}</Text>}
                    {sub.type === 'route' && <Text style={[styles.historyDetails, { color: colors.text }]}>{sub.payload?.origin} to {sub.payload?.destination}</Text>}
                    {sub.type === 'stop' && <Text style={[styles.historyDetails, { color: colors.text }]}>{sub.payload?.stop_name} on {sub.payload?.route_name}</Text>}
                    {sub.type === 'general' && <Text style={[styles.historyDetails, { color: colors.text }]} numberOfLines={2}>{sub.payload?.message}</Text>}
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <Text style={styles.historyDate}>
                        {new Date(sub.created_at).toLocaleDateString()}
                      </Text>
                      
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => handleEdit(sub)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <WebIcon name="pencil" size= {18} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(sub)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <WebIcon name="trash" size= {18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </View>
        )}


        <View style={styles.footer}>
          <WebIcon name="people" size= {24} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Powered by the myTroskiGo Community
          </Text>
        </View>
      </ScrollView>

      <ContributionModal 
        isVisible={isModalVisible} 
        onClose={() => {
          setModalVisible(false);
          setEditingContribution(undefined);
          if (activeTab === 'history') {
            loadHistory();
          }
        }} 
        type={selectedType} 
        initialData={editingContribution}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 12,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      }
    })
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 48,
    alignItems: "center",
    gap: 12,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(100,100,100,0.1)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontWeight: "700",
    fontSize: 14,
  },
  historyContainer: {
    minHeight: 300,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    opacity: 0.8,
  },
  historyCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyType: {
    fontWeight: "800",
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  historyDetails: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  }
});
