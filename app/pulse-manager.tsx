import { ms } from '../lib/metrics';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, KeyboardAvoidingView, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '@clerk/clerk-expo';
import { isAdminUser } from '../constants/admins';
import { WebIcon } from '../components/WebIcon';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout, SlideInDown } from 'react-native-reanimated';
import { PulseService, CityPulse } from '../lib/PulseService';
import * as ImagePicker from
'expo-image-picker';

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#84CC16', // Lime
  '#F97316', // Orange
];

export default function PulseManager() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  
  // Auth
  const { user } = useUser();
  const isAdmin = isAdminUser(user?.primaryEmailAddress?.emailAddress, user?.id);

  // Data
  const [dbPulses, setDbPulses] = useState<CityPulse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [tag, setTag] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [colorHex, setColorHex] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadPulses();
    }
  }, [isAdmin]);

  const loadPulses = async () => {
    setLoading(true);
    const data = await PulseService.getPulses();
    setDbPulses(data);
    setLoading(false);
  };

  const handleEdit = (pulse: CityPulse) => {
    setEditingId(pulse.id);
    setTitle(pulse.title || '');
    setExcerpt(pulse.excerpt || '');
    setTag(pulse.tag || '');
    setImageUrl(pulse.image_url || '');
    setLocalImageUri(null);
    setColorHex(pulse.color || '');
    setLinkUrl(pulse.url || '');
    
    if (Platform.OS === 'web') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setExcerpt('');
    setTag('');
    setImageUrl('');
    setLocalImageUri(null);
    setColorHex('');
    setLinkUrl('');
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm("Are you sure you want to delete this pulse?")
      : await new Promise(resolve => Alert.alert("Confirm", "Delete this pulse?", [
          { text: "Cancel", onPress: () => resolve(false) },
          { text: "Delete", onPress: () => resolve(true), style: 'destructive' }
        ]));

    if (confirmDelete) {
      const success = await PulseService.deletePulse(id);
      if (success) {
        loadPulses();
      } else {
        alert("Error deleting pulse.");
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setLocalImageUri(result.assets[0].uri);
      setImageUrl(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!title || !excerpt || !tag || !colorHex || (!imageUrl && !localImageUri) || !linkUrl) {
      alert("All fields are required!");
      return;
    }

    setIsSaving(true);
    let finalImageUrl = imageUrl;

    if (localImageUri) {
      const uploadedUrl = await PulseService.uploadImage(localImageUri);
      if (!uploadedUrl) {
        alert("Error uploading image.");
        setIsSaving(false);
        return;
      }
      finalImageUrl = uploadedUrl;
    }

    const pulseData = {
      title,
      excerpt,
      tag,
      image_url: finalImageUrl,
      color: colorHex,
      url: linkUrl
    };

    try {
      if (editingId) {
        const success = await PulseService.updatePulse(editingId, pulseData);
        if (!success) throw new Error("Update failed");
      } else {
        const result = await PulseService.addPulse(pulseData);
        if (!result) throw new Error("Insert failed");
      }
      handleCancelEdit();
      loadPulses();
    } catch (e: any) {
      alert("Error saving pulse: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPulses = dbPulses.filter(p => 
    (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (p.tag && p.tag.toLowerCase().includes(searchQuery.toLowerCase()))
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
           style={[{ padding: ms(20), paddingTop: Platform.OS === 'ios' ? 60 : 30, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center' }, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }] as any}
        >
          <TouchableOpacity onPress={() => router.push('/admin')} activeOpacity={0.7} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)' }]}>
             <WebIcon name="arrow-back" size= {24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ marginLeft: ms(16) }}>
            <Text style={{ fontSize: ms(24), fontWeight: '900', color: colors.text, letterSpacing: -0.5 }}>Pulse Dashboard</Text>
            <Text style={{ fontSize: ms(14), color: colors.textSecondary, fontWeight: '600' }}>Manage City Pulses (News)</Text>
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
                  <WebIcon name={editingId ? "create" : "newspaper"} size= {22} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {editingId ? 'Edit City Pulse' : 'Add New City Pulse'}
                </Text>
              </View>
              
              <View style={styles.formRow}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Title *</Text>
                  <View style={styles.inputWrapper}>
                    <WebIcon name="text-outline" size= {18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput style={[styles.inputWithIcon, { color: colors.text, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                      value={title} onChangeText={(t) => setTitle(t.toUpperCase())} autoCapitalize="characters" placeholder="e.g. ACCRA-KUMASI HIGHWAY UPDATE" placeholderTextColor={colors.textSecondary} />
                  </View>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Excerpt *</Text>
                  <View style={styles.inputWrapper}>
                    <WebIcon name="document-text-outline" size= {18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput style={[styles.inputWithIcon, { color: colors.text, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                      value={excerpt} onChangeText={setExcerpt} placeholder="Brief description of the news..." placeholderTextColor={colors.textSecondary} />
                  </View>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Tag *</Text>
                  <View style={styles.inputWrapper}>
                    <WebIcon name="pricetag-outline" size= {18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput style={[styles.inputWithIcon, { color: colors.text, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                      value={tag} onChangeText={setTag} placeholder="e.g. highway, safety, fares" placeholderTextColor={colors.textSecondary} />
                  </View>
                </View>
              </View>

              <View style={[styles.formRow, { marginBottom: ms(30) }]}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Color *</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ms(12), marginTop: ms(4) }}>
                    {PRESET_COLORS.map(color => (
                      <TouchableOpacity
                        key={color}
                        activeOpacity={0.8}
                        onPress={() => setColorHex(color)}
                        style={{
                          width: ms(44), height: ms(44), borderRadius: ms(22), backgroundColor: color,
                          borderWidth: colorHex === color ? 3 : 0,
                          borderColor: isDark ? '#fff' : '#000',
                          justifyContent: 'center', alignItems: 'center',
                          shadowColor: color, shadowOffset: { width: 0, height: ms(4) }, shadowOpacity: 0.3, shadowRadius: ms(6), elevation: 4
                        }}
                      >
                        {colorHex === color && <WebIcon name="checkmark" size= {24} color="#fff" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Image (URL or Photo) *</Text>
                  <View style={{ flexDirection: 'row', gap: ms(12) }}>
                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                      <WebIcon name="image-outline" size= {18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput style={[styles.inputWithIcon, { color: colors.text, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                        value={imageUrl} onChangeText={(t) => { setImageUrl(t); setLocalImageUri(null); }} placeholder="https://... or pick photo ->" placeholderTextColor={colors.textSecondary} />
                    </View>
                    <TouchableOpacity 
                      onPress={pickImage} 
                      style={{ width: ms(56), height: ms(56), borderRadius: ms(16), backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '30' }}
                    >
                      <WebIcon name="camera" size= {24} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  {imageUrl ? (
                    <Animated.View entering={FadeInDown} style={{ marginTop: ms(12), height: ms(160), borderRadius: ms(16), overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                       <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </Animated.View>
                  ) : null}
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Link URL *</Text>
                  <View style={styles.inputWrapper}>
                    <WebIcon name="link-outline" size= {18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput style={[styles.inputWithIcon, { color: colors.text, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                      value={linkUrl} onChangeText={setLinkUrl} placeholder="https://..." placeholderTextColor={colors.textSecondary} />
                  </View>
                </View>
              </View>

              <View style={[styles.formRow, { marginTop: ms(10) }]}>
                {editingId && !isSaving && (
                  <TouchableOpacity activeOpacity={0.8} style={[styles.button, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', flex: 1, marginRight: ms(12) }]} onPress={handleCancelEdit}>
                    <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity activeOpacity={0.8} style={{ flex: 2, opacity: isSaving ? 0.7 : 1 }} onPress={handleSave} disabled={isSaving}>
                  <LinearGradient
                    colors={[colors.primary, colors.primary + 'E6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButton}
                  >
                    {isSaving ? (
                      <Text style={[styles.buttonText, { color: '#fff' }]}>Uploading...</Text>
                    ) : (
                      <>
                        <WebIcon name={editingId ? "save" : "add-circle"} size= {20} color="#fff" style={{ marginRight: ms(8) }} />
                        <Text style={[styles.buttonText, { color: '#fff' }]}>{editingId ? 'Update Pulse' : 'Save New Pulse'}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* LIST SECTION */}
          <View style={{ marginTop: ms(40), zIndex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ms(20) }}>
               <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Database ({dbPulses.length})</Text>
               <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '15', paddingHorizontal: ms(12), paddingVertical: ms(6), borderRadius: ms(12) }}>
                 <WebIcon name="server" size= {14} color={colors.primary} style={{ marginRight: ms(6) }} />
                 <Text style={{ color: colors.primary, fontWeight: '800', fontSize: ms(13) }}>Live Sync</Text>
               </View>
            </View>
            
            <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <WebIcon name="search" size= {20} color={colors.textSecondary} style={{ marginRight: ms(12) }} />
              <TextInput 
                style={{ flex: 1, color: colors.text, fontSize: ms(16), fontWeight: '500', height: ms(50), outlineStyle: 'none' } as any}
                placeholder="Search by title or tag..."
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
                 <Text style={{ color: colors.textSecondary, fontSize: ms(16), fontWeight: '600' }}>Loading pulses...</Text>
               </View>
            ) : (
               <View>
                 {filteredPulses.map((pulse, index) => (
                   <Animated.View key={pulse.id} entering={SlideInDown.delay(index * 30).springify().damping(20)} layout={Layout.springify()}>
                     <View style={[styles.pulseCard, { 
                       backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#fff', 
                       borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' 
                     }]}>
                       <View style={{ flex: 1 }}>
                         <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: ms(6) }}>
                           <View style={[styles.tagBadge, { backgroundColor: pulse.color + '33' }]}>
                             <Text style={{ color: pulse.color, fontWeight: '800', fontSize: ms(12), textTransform: 'uppercase' }}>
                               {pulse.tag}
                             </Text>
                           </View>
                         </View>
                         <Text style={[styles.pulseTitle, { color: colors.text }]} numberOfLines={2}>
                           {pulse.title}
                         </Text>
                         <Text style={{ color: colors.textSecondary, fontSize: ms(13), marginTop: ms(4) }} numberOfLines={1}>
                           {pulse.excerpt}
                         </Text>
                       </View>

                       <View style={{ flexDirection: 'row', gap: ms(8), paddingLeft: ms(12), borderLeftWidth: 1, borderLeftColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                         <TouchableOpacity activeOpacity={0.7} onPress={() => handleEdit(pulse)} style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}>
                            <WebIcon name="create-outline" size= {18} color={colors.primary} />
                         </TouchableOpacity>
                         <TouchableOpacity activeOpacity={0.7} onPress={() => handleDelete(pulse.id)} style={[styles.actionBtn, { backgroundColor: '#EF444415' }]}>
                            <WebIcon name="trash-outline" size= {18} color="#EF4444" />
                         </TouchableOpacity>
                       </View>
                     </View>
                   </Animated.View>
                 ))}
                 {filteredPulses.length === 0 && (
                   <View style={{ padding: ms(40), alignItems: 'center' }}>
                     <WebIcon name="search-outline" size= {48} color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} />
                     <Text style={{ color: colors.textSecondary, fontSize: ms(16), fontWeight: '600', marginTop: ms(16) }}>No pulses match your search</Text>
                   </View>
                 )}
               </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { width: ms(44), height: ms(44), borderRadius: ms(22), justifyContent: 'center', alignItems: 'center' },
  glassCard: {
    padding: ms(24), borderRadius: ms(28), borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: ms(10) }, shadowOpacity: 0.1, shadowRadius: ms(20), elevation: 8,
    // @ts-ignore
    backdropFilter: 'blur(20px)'
  },
  sectionTitle: { fontSize: ms(22), fontWeight: '900', letterSpacing: -0.5, marginBottom: 0 },
  formRow: { flexDirection: 'column', gap: ms(16), marginBottom: ms(20) },
  inputContainer: { flex: 1 },
  label: { fontSize: ms(14), fontWeight: '800', marginBottom: ms(8), marginLeft: ms(4), textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  inputIcon: { position: 'absolute', left: ms(16), zIndex: 2 },
  inputWithIcon: { flex: 1, borderWidth: 1, borderRadius: ms(16), paddingLeft: ms(46), paddingRight: ms(16), height: ms(56), fontSize: ms(16), fontWeight: '600', outlineStyle: 'none' as any },
  button: { height: ms(56), borderRadius: ms(16), justifyContent: 'center', alignItems: 'center' },
  saveButton: { height: ms(56), borderRadius: ms(16), justifyContent: 'center', alignItems: 'center', flexDirection: 'row', shadowColor: '#10b981', shadowOffset: { width: 0, height: ms(4) }, shadowOpacity: 0.3, shadowRadius: ms(8), elevation: 5 },
  buttonText: { fontSize: ms(16), fontWeight: '800', letterSpacing: 0.5 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: ms(16), height: ms(56), borderRadius: ms(20), borderWidth: 1, marginBottom: ms(20), shadowColor: '#000', shadowOffset: { width: 0, height: ms(4) }, shadowOpacity: 0.05, shadowRadius: ms(10), elevation: 2 },
  pulseCard: { flexDirection: 'row', padding: ms(16), borderRadius: ms(20), borderWidth: 1, marginBottom: ms(12), alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: ms(2) }, shadowOpacity: 0.05, shadowRadius: ms(8), elevation: 2 },
  tagBadge: { paddingHorizontal: ms(10), paddingVertical: ms(4), borderRadius: ms(10), alignSelf: 'flex-start' },
  pulseTitle: { fontSize: ms(18), fontWeight: '800', flex: 1 },
  actionBtn: { width: ms(44), height: ms(44), borderRadius: ms(14), justifyContent: 'center', alignItems: 'center' }
});
