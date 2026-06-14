import { ms } from '../lib/metrics';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/expo';
import { isAdminUser } from '../constants/admins';
import { WebIcon } from '../components/WebIcon';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout, FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from
'react-native-safe-area-context';

// Custom Animated Dropdown
const CustomDropdown = ({ label, value, options, onSelect, onAddCustom, isCustom, setCustomValue, placeholder, colors, isDark }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={{ zIndex: isOpen ? 1000 : 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ms(8) }}>
         <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
         <TouchableOpacity onPress={() => { onAddCustom(!isCustom); setIsOpen(false); }} activeOpacity={0.7}>
            <Text style={{ color: colors.primary, fontSize: ms(13), fontWeight: '700' }}>
              {isCustom ? 'Select Existing' : 'Type New'}
            </Text>
         </TouchableOpacity>
      </View>

      {isCustom || (Platform.OS !== 'web' && !options.length) ? (
        <TextInput 
          style={[styles.input, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff' }]}
          value={value} 
          onChangeText={setCustomValue} 
          placeholder={placeholder} 
          placeholderTextColor={colors.textSecondary} 
        />
      ) : (
        <View style={{ position: 'relative', zIndex: isOpen ? 1000 : 1 }}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setIsOpen(!isOpen)}
            style={[styles.dropdownHeader, { 
              backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff',
              borderColor: isOpen ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
              borderWidth: isOpen ? 1.5 : 1
            }]}
          >
            <Text style={{ color: value ? colors.text : colors.textSecondary, fontSize: ms(16), fontWeight: value ? '600' : '400' }}>
              {value || `Select ${label}...`}
            </Text>
            <WebIcon name={isOpen ? "chevron-up" : "chevron-down"} size= {20} color={colors.textSecondary} />
          </TouchableOpacity>

          {isOpen && (
            <Animated.View 
              entering={FadeIn.duration(200)}
              style={[styles.dropdownList, { 
                backgroundColor: isDark ? '#1e293b' : '#fff',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
              }]}
            >
              <ScrollView nestedScrollEnabled style={{ maxHeight: ms(200) }}>
                {options.map((opt: any) => (
                  <TouchableOpacity 
                    key={opt.value}
                    style={[styles.dropdownItem, value === opt.value && { backgroundColor: colors.primary + '15' }]}
                    onPress={() => { onSelect(opt.value); setIsOpen(false); }}
                  >
                    <Text style={{ color: value === opt.value ? colors.primary : colors.text, fontSize: ms(15), fontWeight: value === opt.value ? '700' : '500' }}>
                      {opt.label}
                    </Text>
                    {value === opt.value && <WebIcon name="checkmark" size= {18} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
                {options.length === 0 && (
                   <Text style={{ padding: ms(15), color: colors.textSecondary, textAlign: 'center' }}>No options available.</Text>
                )}
              </ScrollView>
            </Animated.View>
          )}
        </View>
      )}
    </View>
  );
};

export default function FareManager() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  
  // Auth
  const { user } = useUser();
  const isAdmin = isAdminUser(user?.primaryEmailAddress?.emailAddress, user?.id);

  // Data
  const [dbFares, setDbFares] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [region, setRegion] = useState('');
  const [town, setTown] = useState('');

  // For adding new region/town
  const [isCustomRegion, setIsCustomRegion] = useState(false);
  const [isCustomTown, setIsCustomTown] = useState(false);

  // Unique lists from DB & Default Regions
  const GHANA_REGIONS = [
    'AHAFO', 'ASHANTI', 'BONO', 'BONO EAST', 'CENTRAL', 'EASTERN', 'GREATER ACCRA', 
    'NORTH EAST', 'NORTHERN', 'OTI', 'SAVANNAH', 'UPPER EAST', 'UPPER WEST', 
    'VOLTA', 'WESTERN', 'WESTERN NORTH'
  ];
  
  const uniqueRegions = Array.from(
    new Set([...GHANA_REGIONS, ...dbFares.map(f => f.region?.toUpperCase()).filter(Boolean)])
  ).sort().map(r => ({ label: r, value: r }));
  
  const uniqueTowns = Array.from(new Set(dbFares.map(f => f.town).filter(Boolean))).sort().map(t => ({ label: t, value: t }));

  useEffect(() => {
    if (isAdmin) {
      loadFares();
    }
  }, [isAdmin]);

  const loadFares = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('fares').select('*').order('created_at', { ascending: false });
    if (data) setDbFares(data);
    setLoading(false);
  };

  const handleEdit = (fare: any) => {
    setEditingId(fare.id);
    setOrigin(fare.origin || '');
    setDestination(fare.destination || '');
    setMinPrice(fare.min_price ? String(fare.min_price) : '');
    setMaxPrice(fare.max_price ? String(fare.max_price) : '');
    setRegion(fare.region || '');
    setTown(fare.town || '');
    setIsCustomRegion(false);
    setIsCustomTown(false);
    
    if (Platform.OS === 'web') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setOrigin('');
    setDestination('');
    setMinPrice('');
    setMaxPrice('');
    setRegion('');
    setTown('');
    setIsCustomRegion(false);
    setIsCustomTown(false);
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm("Are you sure you want to delete this fare?")
      : await new Promise(resolve => Alert.alert("Confirm", "Delete this fare?", [
          { text: "Cancel", onPress: () => resolve(false) },
          { text: "Delete", onPress: () => resolve(true), style: 'destructive' }
        ]));

    if (confirmDelete) {
      const { error } = await supabase.from('fares').delete().eq('id', id);
      if (error) {
        alert("Error deleting fare: " + error.message);
      } else {
        loadFares();
      }
    }
  };

  const handleSave = async () => {
    if (!destination || !region || !town) {
      alert("Destination, Region, and Town are required!");
      return;
    }

    const fareData = {
      origin: origin || null,
      destination,
      min_price: minPrice ? parseFloat(minPrice) : null,
      max_price: maxPrice ? parseFloat(maxPrice) : null,
      region,
      town
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('fares').update(fareData).eq('id', editingId);
        if (error) throw error;
        // alert("Fare updated successfully!");
      } else {
        const { error } = await supabase.from('fares').insert([fareData]);
        if (error) throw error;
        // alert("Fare added successfully!");
      }
      handleCancelEdit();
      loadFares();
    } catch (e: any) {
      alert("Error saving fare: " + e.message);
    }
  };

  const filteredFares = dbFares.filter(f => 
    (f.origin && f.origin.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (f.destination && f.destination.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (f.town && f.town.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'Access Denied', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }} />
        <WebIcon name="lock-closed" size= {64} color={colors.primary} />
        <Text style={{ color: colors.text, fontSize: ms(24), fontWeight: '900', marginTop: ms(20) }}>Access Denied</Text>
        <Text style={{ color: colors.textSecondary, marginTop: ms(10), fontSize: ms(16) }}>Admin privileges required.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Premium Header */}
      <View style={{ zIndex: 10 }}>
        <LinearGradient
           colors={isDark ? ["rgba(15, 23, 42, 0.95)", "rgba(15, 23, 42, 0.8)"] : ["rgba(255, 255, 255, 0.95)", "rgba(255, 255, 255, 0.8)"]}
           style={{ padding: ms(20), paddingTop: Platform.OS === 'ios' ? 60 : 30, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center' }}
           // @ts-ignore
           style={[{ padding: ms(20), paddingTop: Platform.OS === 'ios' ? 60 : 30, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center' }, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}
        >
          <TouchableOpacity onPress={() => router.push('/admin')} activeOpacity={0.7} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)' }]}>
             <WebIcon name="arrow-back" size= {24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ marginLeft: ms(16) }}>
            <Text style={{ fontSize: ms(24), fontWeight: '900', color: colors.text, letterSpacing: -0.5 }}>Fare Dashboard</Text>
            <Text style={{ fontSize: ms(14), color: colors.textSecondary, fontWeight: '600' }}>Manage routes & pricing</Text>
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: ms(20), paddingBottom: ms(100) }} keyboardShouldPersistTaps="handled">
          
          {/* GLASSMORPHISM FORM SECTION */}
          <Animated.View entering={FadeInDown.delay(100).duration(600).springify()} style={{ zIndex: 2 }}>
            <View style={[styles.glassCard, { 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.9)', 
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)'
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: ms(20) }}>
                <View style={{ width: ms(40), height: ms(40), borderRadius: ms(12), backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: ms(12) }}>
                  <WebIcon name={editingId ? "create" : "add"} size= {22} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {editingId ? 'Edit Route Fare' : 'Add New Route Fare'}
                </Text>
              </View>
              
              <View style={styles.formRow}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Origin (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <WebIcon name="location-outline" size= {18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput style={[styles.inputWithIcon, { color: colors.text, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                      value={origin} onChangeText={setOrigin} placeholder="e.g. Lapaz" placeholderTextColor={colors.textSecondary} />
                  </View>
                </View>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Destination *</Text>
                  <View style={styles.inputWrapper}>
                    <WebIcon name="flag-outline" size= {18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput style={[styles.inputWithIcon, { color: colors.text, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                      value={destination} onChangeText={setDestination} placeholder="e.g. Madina" placeholderTextColor={colors.textSecondary} />
                  </View>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Min Price (GHS)</Text>
                  <View style={styles.inputWrapper}>
                    <WebIcon name="cash-outline" size= {18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput style={[styles.inputWithIcon, { color: colors.text, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                      value={minPrice} 
                      onChangeText={(text) => {
                        let cleaned = text.replace(/[^0-9.]/g, '');
                        const parts = cleaned.split('.');
                        if (parts.length > 1) {
                          cleaned = parts[0] + '.' + parts[1].slice(0, 2);
                        }
                        setMinPrice(cleaned);
                      }}
                      onBlur={() => {
                        if (minPrice) {
                          const num = parseFloat(minPrice);
                          if (!isNaN(num)) setMinPrice(num.toFixed(2));
                        }
                      }}
                      keyboardType="numeric" placeholder="e.g. 5.50" placeholderTextColor={colors.textSecondary} />
                  </View>
                </View>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Max Price (GHS)</Text>
                  <View style={styles.inputWrapper}>
                    <WebIcon name="cash" size= {18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput style={[styles.inputWithIcon, { color: colors.text, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                      value={maxPrice} 
                      onChangeText={(text) => {
                        let cleaned = text.replace(/[^0-9.]/g, '');
                        const parts = cleaned.split('.');
                        if (parts.length > 1) {
                          cleaned = parts[0] + '.' + parts[1].slice(0, 2);
                        }
                        setMaxPrice(cleaned);
                      }}
                      onBlur={() => {
                        if (maxPrice) {
                          const num = parseFloat(maxPrice);
                          if (!isNaN(num)) setMaxPrice(num.toFixed(2));
                        }
                      }}
                      keyboardType="numeric" placeholder="e.g. 8.00" placeholderTextColor={colors.textSecondary} />
                  </View>
                </View>
              </View>

              <View style={[styles.formRow, { zIndex: 50 }]}>
                <View style={[styles.inputContainer, { zIndex: 60 }]}>
                  <CustomDropdown
                    label="Region *"
                    value={region}
                    options={uniqueRegions}
                    onSelect={setRegion}
                    isCustom={isCustomRegion}
                    onAddCustom={setIsCustomRegion}
                    setCustomValue={setRegion}
                    placeholder="e.g. CENTRAL"
                    colors={colors}
                    isDark={isDark}
                  />
                </View>
                <View style={[styles.inputContainer, { zIndex: 50 }]}>
                  <CustomDropdown
                    label="Town *"
                    value={town}
                    options={uniqueTowns}
                    onSelect={setTown}
                    isCustom={isCustomTown}
                    onAddCustom={setIsCustomTown}
                    setCustomValue={setTown}
                    placeholder="e.g. Madina"
                    colors={colors}
                    isDark={isDark}
                  />
                </View>
              </View>

              <View style={[styles.formRow, { marginTop: ms(10) }]}>
                {editingId && (
                  <TouchableOpacity activeOpacity={0.8} style={[styles.button, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', flex: 1, marginRight: ms(12) }]} onPress={handleCancelEdit}>
                    <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity activeOpacity={0.8} style={{ flex: 2 }} onPress={handleSave}>
                  <LinearGradient
                    colors={[colors.primary, colors.primary + 'E6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButton}
                  >
                    <WebIcon name={editingId ? "save" : "add-circle"} size= {20} color="#fff" style={{ marginRight: ms(8) }} />
                    <Text style={[styles.buttonText, { color: '#fff' }]}>{editingId ? 'Update Fare' : 'Save New Fare'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* LIST SECTION */}
          <View style={{ marginTop: ms(40), zIndex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ms(20) }}>
               <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Database ({dbFares.length})</Text>
               <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '15', paddingHorizontal: ms(12), paddingVertical: ms(6), borderRadius: ms(12) }}>
                 <WebIcon name="server" size= {14} color={colors.primary} style={{ marginRight: ms(6) }} />
                 <Text style={{ color: colors.primary, fontWeight: '800', fontSize: ms(13) }}>Live Sync</Text>
               </View>
            </View>
            
            <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <WebIcon name="search" size= {20} color={colors.textSecondary} style={{ marginRight: ms(12) }} />
              <TextInput 
                style={{ flex: 1, color: colors.text, fontSize: ms(16), fontWeight: '500', height: ms(50), outlineStyle: 'none' } as any}
                placeholder="Search by origin, destination or town..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <WebIcon name="close-circle" size= {20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
               <View style={{ padding: ms(40), alignItems: 'center' }}>
                 <Text style={{ color: colors.textSecondary, fontSize: ms(16), fontWeight: '600' }}>Loading routes...</Text>
               </View>
            ) : (
               <View>
                 {filteredFares.slice(0, 50).map((fare, index) => (
                   <Animated.View key={fare.id} entering={SlideInDown.delay(index * 30).springify().damping(20)} layout={Layout.springify()}>
                     <View style={[styles.fareCard, { 
                       backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#fff', 
                       borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' 
                     }]}>
                       <View style={{ flex: 1 }}>
                         <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: ms(6) }}>
                           <View style={[styles.routeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9' }]}>
                             <WebIcon name="navigate" size= {12} color={colors.textSecondary} />
                           </View>
                           <Text style={[styles.fareRoute, { color: colors.text }]} numberOfLines={1}>
                             {fare.origin ? <Text style={{ color: colors.textSecondary }}>{fare.origin} → </Text> : null}
                             {fare.destination}
                           </Text>
                         </View>
                         
                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(12) }}>
                           <View style={[styles.priceBadge, { backgroundColor: '#10b98115' }]}>
                             <WebIcon name="cash" size= {14} color="#10b981" />
                             <Text style={{ color: '#10b981', fontWeight: '800', marginLeft: ms(4), fontSize: ms(14) }}>
                               GHS {fare.min_price} - {fare.max_price}
                             </Text>
                           </View>
                           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                             <WebIcon name="location" size= {12} color={colors.textSecondary} />
                             <Text style={{ color: colors.textSecondary, fontSize: ms(13), marginLeft: ms(4), fontWeight: '600' }}>
                               {fare.town}, {fare.region}
                             </Text>
                           </View>
                         </View>
                       </View>

                       <View style={{ flexDirection: 'row', gap: ms(8), paddingLeft: ms(12), borderLeftWidth: 1, borderLeftColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                         <TouchableOpacity activeOpacity={0.7} onPress={() => handleEdit(fare)} style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}>
                            <WebIcon name="create-outline" size= {18} color={colors.primary} />
                         </TouchableOpacity>
                         <TouchableOpacity activeOpacity={0.7} onPress={() => handleDelete(fare.id)} style={[styles.actionBtn, { backgroundColor: '#EF444415' }]}>
                            <WebIcon name="trash-outline" size= {18} color="#EF4444" />
                         </TouchableOpacity>
                       </View>
                     </View>
                   </Animated.View>
                 ))}
                 {filteredFares.length === 0 && (
                   <View style={{ padding: ms(40), alignItems: 'center' }}>
                     <WebIcon name="search-outline" size= {48} color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} />
                     <Text style={{ color: colors.textSecondary, fontSize: ms(16), fontWeight: '600', marginTop: ms(16) }}>No fares match your search</Text>
                   </View>
                 )}
               </View>
            )}
            {filteredFares.length > 50 && (
               <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: ms(20), fontWeight: '600' }}>
                 Showing 50 of {filteredFares.length} results.
               </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backBtn: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCard: {
    padding: ms(24),
    borderRadius: ms(28),
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(10) },
    shadowOpacity: 0.1,
    shadowRadius: ms(20),
    elevation: 8,
    // @ts-ignore
    backdropFilter: 'blur(20px)',
  },
  sectionTitle: {
    fontSize: ms(22),
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 0,
  },
  formRow: {
    flexDirection: 'column',
    gap: ms(16),
    marginBottom: ms(20),
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    fontSize: ms(14),
    fontWeight: '800',
    marginBottom: ms(8),
    marginLeft: ms(4),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: ms(16),
    zIndex: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: ms(16),
    paddingHorizontal: ms(16),
    height: ms(56),
    fontSize: ms(16),
    fontWeight: '600',
    outlineStyle: 'none' as any,
  },
  inputWithIcon: {
    flex: 1,
    borderWidth: 1,
    borderRadius: ms(16),
    paddingLeft: ms(46),
    paddingRight: ms(16),
    height: ms(56),
    fontSize: ms(16),
    fontWeight: '600',
    outlineStyle: 'none' as any,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: ms(56),
    borderRadius: ms(16),
    paddingHorizontal: ms(16),
  },
  dropdownList: {
    position: 'absolute',
    top: ms(64),
    left: 0,
    right: 0,
    borderRadius: ms(16),
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(10) },
    shadowOpacity: 0.1,
    shadowRadius: ms(20),
    elevation: 10,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: ms(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)'
  },
  button: {
    height: ms(56),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    height: ms(56),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: ms(4) },
    shadowOpacity: 0.3,
    shadowRadius: ms(8),
    elevation: 5,
  },
  buttonText: {
    fontSize: ms(16),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(16),
    height: ms(56),
    borderRadius: ms(20),
    borderWidth: 1,
    marginBottom: ms(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(4) },
    shadowOpacity: 0.05,
    shadowRadius: ms(10),
    elevation: 2,
  },
  fareCard: {
    flexDirection: 'row',
    padding: ms(16),
    borderRadius: ms(20),
    borderWidth: 1,
    marginBottom: ms(12),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(2) },
    shadowOpacity: 0.05,
    shadowRadius: ms(8),
    elevation: 2,
  },
  routeBadge: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(10),
  },
  fareRoute: {
    fontSize: ms(18),
    fontWeight: '800',
    flex: 1,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
    borderRadius: ms(10),
  },
  actionBtn: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
  }
});
