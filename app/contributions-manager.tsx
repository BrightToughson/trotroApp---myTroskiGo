import { ms } from '../lib/metrics';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';
import { WebIcon } from '../components/WebIcon';
import { CustomButton } from '../components/customButton';
import { ContributionService, Contribution } from '../lib/ContributionService';
import ContributionModal from '../components/ContributionModal';
import { useTranslation } from
'react-i18next';

export default function ContributionsManager() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [activeType, setActiveType] = useState('all');
  
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingItem, setEditingItem] = useState<Contribution | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await ContributionService.fetchContributions();
      setContributions(data);
    } catch (e) {
      Alert.alert("Error", "Could not fetch contributions.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [statusError, setStatusError] = useState<string | null>(null);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected', type: string, item: any) => {
    setStatusError(null);
    try {
      if (status === 'approved') {
        await ContributionService.approveAndIngestContribution(id, type as any, item.payload);
      } else {
        await ContributionService.updateContributionStatus(id, status, type as any);
      }
      // Update local state instantly for snappiness
      setContributions(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    } catch (e: any) {
      setStatusError(e.message || "Could not update status.");
      Alert.alert("Error", e.message || "Could not update status.");
    }
  };

  const handleDelete = async (id: string, type: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this contribution? This cannot be undone.")) {
        try {
          await ContributionService.deleteContribution(id, type as any);
          setContributions(prev => prev.filter(c => c.id !== id));
        } catch (e) {
          alert("Could not delete contribution.");
        }
      }
      return;
    }

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this contribution? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await ContributionService.deleteContribution(id, type as any);
              setContributions(prev => prev.filter(c => c.id !== id));
            } catch (e) {
              Alert.alert("Error", "Could not delete contribution.");
            }
          }
        }
      ]
    );
  };

  const filteredData = contributions.filter(item => {
    const statusMatch = activeTab === 'all' ? true : item.status === activeTab;
    const typeMatch = activeType === 'all' ? true : item.type === activeType;
    return statusMatch && typeMatch;
  });

  const groupedData = filteredData.reduce((acc: any, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'price': return { color: "#10b981", icon: "pricetag", label: "Fare Update" };
      case 'route': return { color: "#8b5cf6", icon: "map", label: "New Route" };
      case 'stop': return { color: "#ef4444", icon: "location", label: "Missing Stop" };
      case 'general': return { color: "#f59e0b", icon: "bulb", label: "Feedback" };
      default: return { color: colors.primary, icon: "help", label: "Contribution" };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const renderContent = (item: Contribution) => {
    const p = item.payload || {};
    if (item.type === 'price') return <Text style={[styles.cardText, { color: colors.text }]}>{p.origin} to {p.destination} • GHS {p.actual_fare}</Text>;
    if (item.type === 'route') {
      let displayFare = p.fare;
      if (displayFare === undefined && p.trotros && p.trotros.length > 0) {
        displayFare = p.trotros.reduce((acc: number, t: any) => acc + (t.fare || 0), 0);
      }
      return (
        <View>
          <Text style={[styles.cardText, { color: colors.text }]}>{p.origin} to {p.destination}</Text>
          <Text style={[styles.cardText, { color: colors.primary, fontWeight: '700', marginTop: ms(4), fontSize: ms(14) }]}>
            {displayFare ? `GHS ${displayFare} • ` : ''}{p.journey_type === 'transfer' ? t('transfer_req', 'Transfer Required') : t('straight_trotro', 'Straight Trotro')}
          </Text>
          {p.journey_type === 'transfer' && p.transfer_location && !p.trotros && (
            <Text style={[styles.cardText, { color: colors.textSecondary, fontSize: ms(13), marginTop: ms(4) }]}>
              <WebIcon name="git-commit" size= {12} color={colors.textSecondary} /> Transfer at: {p.transfer_location}
            </Text>
          )}
          {p.trotros && p.trotros.length > 0 && (
            <View style={{ marginTop: ms(8), padding: ms(8), backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderRadius: ms(8), borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
              <Text style={{ color: colors.textSecondary, fontSize: ms(12), fontWeight: '700', marginBottom: ms(4) }}>Multiple Trotros details:</Text>
              {p.trotros.map((trotro: any, idx: number) => (
                <View key={idx} style={{ marginBottom: ms(4) }}>
                  <Text style={{ color: colors.text, fontSize: ms(13) }}>
                    <Text style={{ fontWeight: '600' }}>Trotro {idx + 1}:</Text> {trotro.origin} ➔ {trotro.destination} {trotro.fare > 0 ? `(GHS ${trotro.fare})` : ''}
                  </Text>
                  {trotro.stops && trotro.stops.length > 0 && (
                    <Text style={{ color: colors.textSecondary, fontSize: ms(11), fontStyle: 'italic', marginLeft: ms(8) }}>
                      Via: {trotro.stops.join(', ')}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
          {p.stops && p.stops.length > 0 && (
            <Text style={[styles.cardText, { color: colors.textSecondary, fontSize: ms(13), marginTop: ms(4) }]}>
              Via: {p.stops.join(' • ')}
            </Text>
          )}
          {p.tracked_path && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: ms(8) }}>
              <WebIcon name="location" size= {14} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: ms(12), fontWeight: '600', marginLeft: ms(4) }}>
                Includes Live GPS Track
              </Text>
            </View>
          )}
        </View>
      );
    }
    if (item.type === 'stop') return <Text style={[styles.cardText, { color: colors.text }]}>{p.stopName} on {p.routeName}</Text>;
    if (item.type === 'general') return <Text style={[styles.cardText, { color: colors.text }]} numberOfLines={3}>{p.message}</Text>;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/admin')}>
          <WebIcon name="arrow-back" size= {24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Contributions</Text>
      </View>

      <View style={styles.tabsContainer}>
        {['pending', 'approved', 'rejected', 'all'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[
              styles.tab, 
              activeTab === tab && [styles.activeTab, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText, 
              { color: activeTab === tab ? '#fff' : colors.textSecondary }
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeTabsWrapper} contentContainerStyle={styles.typeTabsContainer}>
        {[
          { id: 'all', label: 'All Types' },
          { id: 'price', label: 'Fare Updates' },
          { id: 'route', label: 'New Routes' },
          { id: 'stop', label: 'Missing Stops' },
          { id: 'general', label: 'Feedback' }
        ].map(typeObj => (
          <TouchableOpacity 
            key={typeObj.id} 
            style={[
              styles.typeTab, 
              activeType === typeObj.id && [styles.activeTypeTab, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]
            ]}
            onPress={() => setActiveType(typeObj.id)}
          >
            <Text style={[
              styles.typeTabText, 
              { color: activeType === typeObj.id ? colors.text : colors.textSecondary }
            ]}>
              {typeObj.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {statusError && (
        <View style={{ margin: ms(16), padding: ms(12), backgroundColor: '#ef444420', borderRadius: ms(8), borderWidth: 1, borderColor: '#ef444450' }}>
          <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Publish Failed:</Text>
          <Text style={{ color: '#ef4444', marginTop: ms(4) }}>{statusError}</Text>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadData(); }} tintColor={colors.primary} />
        }
      >
        {isLoading ? (
          <ActivityIndicator size= "large" color={colors.primary} style={{ marginTop: ms(40) }} />
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <WebIcon name="checkmark-circle-outline" size= {64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>All caught up!</Text>
          </View>
        ) : (
          Object.keys(groupedData).map(typeKey => {
            const items = groupedData[typeKey];
            const groupStyleInfo = getTypeStyle(typeKey);
            
            return (
              <View key={typeKey} style={{ marginBottom: ms(24) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: ms(16), marginLeft: ms(4) }}>
                  <WebIcon name={groupStyleInfo.icon} size= {20} color={groupStyleInfo.color} />
                  <Text style={{ fontSize: ms(18), fontWeight: '800', color: colors.text, marginLeft: ms(8), letterSpacing: -0.5 }}>
                    {groupStyleInfo.label}s ({items.length})
                  </Text>
                </View>
                
                {items.map((item: any) => {
                  const styleInfo = getTypeStyle(item.type);
                  return (
                    <View key={item.id} style={[styles.card, { backgroundColor: colors.surface }]}>
                      <View style={styles.cardHeader}>
                        <View style={styles.typeTag}>
                          <WebIcon name={styleInfo.icon} size= {14} color={styleInfo.color} />
                          <Text style={[styles.typeText, { color: styleInfo.color }]}>{styleInfo.label}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.dateText, { color: colors.textSecondary, marginRight: ms(12) }]}>{formatDate(item.created_at)}</Text>
                          <TouchableOpacity onPress={() => handleDelete(item.id, item.type)}>
                            <WebIcon name="trash-outline" size= {18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.cardBody}>
                        {renderContent(item)}
                      </View>

                      <View style={[styles.actionRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', gap: ms(8) }]}>
                        {item.status !== 'rejected' && (
                          <View style={{ flex: 1 }}>
                            <CustomButton 
                              title="Reject" 
                              bgVariant="secondary" 
                              textVariant="secondary" 
                              containerStyle={{ width: '100%', height: ms(44), minWidth: 0, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }} 
                              textStyle={{ fontSize: ms(14) }}
                              onPress={() => handleUpdateStatus(item.id, 'rejected', item.type, item)}
                            />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <CustomButton 
                            title="Edit" 
                            bgVariant="secondary" 
                            textVariant="secondary" 
                            containerStyle={{ width: '100%', height: ms(44), minWidth: 0, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }} 
                            textStyle={{ fontSize: ms(14), color: colors.primary }}
                            onPress={() => setEditingItem(item)}
                          />
                        </View>
                        {item.status !== 'approved' && (
                          <View style={{ flex: 1 }}>
                            <CustomButton 
                              title={item.status === 'rejected' ? 'Republish' : 'Publish'}
                              containerStyle={{ width: '100%', height: ms(44), minWidth: 0, backgroundColor: styleInfo.color, shadowColor: styleInfo.color }} 
                              textStyle={{ fontSize: ms(14) }}
                              onPress={() => handleUpdateStatus(item.id, 'approved', item.type, item)}
                            />
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      {editingItem && (
        <ContributionModal
          isVisible={!!editingItem}
          onClose={() => {
            setEditingItem(null);
            loadData(); // refresh data after editing
          }}
          type={editingItem.type}
          initialData={editingItem}
        />
      )}
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
    paddingHorizontal: ms(20),
    paddingVertical: ms(16),
  },
  backButton: {
    padding: ms(8),
    marginRight: ms(12),
    marginLeft: ms(-8),
  },
  title: {
    fontSize: ms(24),
    fontWeight: '800',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: ms(20),
    marginBottom: ms(16),
  },
  tab: {
    paddingVertical: ms(8),
    paddingHorizontal: ms(16),
    borderRadius: ms(20),
    marginRight: ms(8),
    backgroundColor: 'rgba(150,150,150,0.1)',
  },
  activeTab: {
    backgroundColor: '#000',
  },
  tabText: {
    fontSize: ms(14),
    fontWeight: '600',
  },
  typeTabsWrapper: {
    maxHeight: ms(40),
    marginBottom: ms(16),
  },
  typeTabsContainer: {
    paddingHorizontal: ms(20),
    gap: ms(8),
  },
  typeTab: {
    paddingVertical: ms(6),
    paddingHorizontal: ms(16),
    borderRadius: ms(16),
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTypeTab: {
    borderColor: 'rgba(150,150,150,0.5)',
  },
  typeTabText: {
    fontSize: ms(13),
    fontWeight: '600',
  },
  scrollContent: {
    padding: ms(20),
    paddingBottom: ms(40),
  },
  card: {
    borderRadius: ms(16),
    padding: ms(16),
    marginBottom: ms(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: ms(4) },
    shadowOpacity: 0.05,
    shadowRadius: ms(8),
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(12),
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(150,150,150,0.1)',
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: ms(12),
  },
  typeText: {
    fontSize: ms(12),
    fontWeight: '700',
    marginLeft: ms(6),
  },
  dateText: {
    fontSize: ms(12),
  },
  cardBody: {
    marginBottom: ms(16),
  },
  cardText: {
    fontSize: ms(16),
    fontWeight: '500',
    lineHeight: ms(22),
  },
  actionRow: {
    flexDirection: 'row',
    paddingTop: ms(16),
    borderTopWidth: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: ms(60),
  },
  emptyText: {
    fontSize: ms(18),
    fontWeight: '600',
    marginTop: ms(16),
  }
});
