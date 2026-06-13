import { ms } from '../../../lib/metrics';
import { WebIcon } from "../../../components/WebIcon";
import { LinearGradient } from "expo-linear-gradient";
import { NotificationsWrapper as Notifications } from "../../../lib/NotificationsWrapper";
import { useTranslation } from "react-i18next";
import { useFocusEffect, router } from "expo-router";
import React, { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    FadeIn,
    FadeOut,
    SlideInDown,
    SlideOutDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, LightColors } from "../../../context/ThemeContext";
import { useUser } from "@clerk/clerk-expo";
import {
    Notification,
    NotificationService,
} from "../../../lib/NotificationService";
import { translateText } from "../../../lib/translate";
import SideMenu from "../../../components/SideMenu";
import TutorialModal from "../../../components/TutorialModal";
import OfficialAnnouncementsModal from "../../../components/OfficialAnnouncementsModal";
import LanguageSelector from
"../../../components/LanguageSelector";

const TranslatedPostText = React.memo(({ notification, colors, t, i18n }: any) => {
  const { isDark } = useTheme();
  const [translated, setTranslated] = useState(notification.message);
  
  React.useEffect(() => {
    let isMounted = true;
    if (i18n.language !== 'en') {
      translateText(notification.message, i18n.language).then(res => {
        if (isMounted) setTranslated(res);
      });
    } else {
      setTranslated(notification.message);
    }
    return () => { isMounted = false; };
  }, [notification.message, i18n.language]);

  return (
    <View style={[styles.messageContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
      <Text style={[styles.tweetMessage, { color: colors.text }]}>{translated}</Text>
    </View>
  );
});

const TAGS = [
  { id: 'all', label: 'All Updates', icon: 'list', color: '#6b7280', emoji: '📌' },
  { id: 'traffic', label: 'Traffic', icon: 'car-outline', color: '#f59e0b', emoji: '🚦' },
  { id: 'fare', label: 'Fare Alert', icon: 'cash-outline', color: '#10b981', emoji: '💸' },
  { id: 'stops', label: 'Stop Change', icon: 'bus-outline', color: '#3b82f6', emoji: '📍' },
  { id: 'safety', label: 'Safety', icon: 'shield-checkmark-outline', color: '#ef4444', emoji: '🛡️' },
  { id: 'other', label: 'General', icon: 'information-circle-outline', color: '#6b7280', emoji: '💡' },
];

const REACTION_TYPES = [
  { id: 'like', emoji: '❤️', label: 'Like', color: '#ef4444' },
  { id: 'helpful', emoji: '🙌', label: 'Helpful', color: '#10b981' },
  { id: 'alert', emoji: '⚠️', label: 'Alert', color: '#f59e0b' },
];

// getReactionCounts logic removed - using global database counts now

const BLACKLIST = [
  "violence", "kill", "death", "murder", "suicide", "blood", "hurt", "die", "dead",
  "scam", "fraud", "money", "win", "prize", "cash", "bank", "stupid", "fool", "idiot",
  "mad", "crazy", "insane", "useless", "dumb", "silly", "shut up", "get out", "trash",
  "rubbish", "nonsense", "bastard", "gyimii", "sex", "naked", "nude", "porn", "kiss",
  "love you", "dating", "meet up", "you are sick", "are you sick", "your head",
  "your face", "ugly", "stink", "smell", "liar", "fake", "hate", "shut your mouth",
  "stf", "fk", "sh*t", "b*tch", "kwasea", "kwasia", "aboa", "patapaa", "borla", "twe",
  "kote", "tofi", "womo", "eto", "yufu", "dick", "pussy", "vagina", "penis", "asshole",
  "breast", "butt", "clit", "anal", "cock", "porn", "sx", "fuck", "bitch", "cunt",
  "shit", "piss", "bastard", "coward", "rat", "pig", "animal", "beast", "monkey",
  "goat", "gyimi", "gyimie", "agyimi", "koti", "kwasia", "kwasea", "aboa", "patapaa",
  "borla", "mtchee", "mtchew",
];

const NotificationItem = React.memo(({ 
  item, index, colors, t, i18n, user, isAdmin, commentsCount,
  handleReaction, setActivePostForComments, handleDelete, setPreviewImage
}: any) => {
  const { isDark } = useTheme();
  const reactions = item.reactions || [];
  const counts = item.globalCounts || { like: 0, helpful: 0, alert: 0 };
  const hasReacted = (type: string) => reactions.includes(type);
  const tagObj = TAGS.find(t => t.id === item.tag);
  const handle = item.username === 'official' ? 'verified' : `@${item.username || item.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 50).springify()}>
      <View style={[
        styles.tweetCard, 
        { 
          backgroundColor: colors.card, 
          borderColor: item.type === 'official' ? (isDark ? colors.primary + '30' : colors.primary + '20') : colors.border,
          borderLeftWidth: item.type === 'official' ? 4 : 1,
          borderLeftColor: item.type === 'official' ? colors.primary : colors.border,
        }
      ]}>
        <View style={styles.tweetLeftCol}>
          <View style={[
            styles.tweetAvatarContainer, 
            { backgroundColor: (item.color || colors.primary) + "15" }
          ]}>
            {item.icon.startsWith('http') ? (
              <Image source={{ uri: item.icon }} style={styles.tweetAvatar} />
            ) : (
              <WebIcon name={item.icon as any} size= {20} color={item.color || colors.primary} />
            )}
          </View>
        </View>

        <View style={styles.tweetRightCol}>
          <View style={styles.tweetHeader}>
            <View style={styles.tweetUserInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(4), flexShrink: 1 }}>
                <Text style={[styles.tweetName, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>{item.title}</Text>
                {item.type === 'official' && (
                  <WebIcon name="shield-checkmark" size= {14} color={colors.primary} />
                )}
              </View>
              <Text style={[styles.tweetHandle, { color: item.type === 'official' ? colors.primary : colors.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                {handle}
              </Text>
              <Text style={[styles.tweetDot, { color: colors.textSecondary }]}>·</Text>
              <Text style={[styles.tweetTime, { color: colors.textSecondary }]}>{item.time}</Text>
            </View>
            {item.tag && (
              <View style={[styles.tweetTag, { backgroundColor: (tagObj?.color || colors.primary) + '15', flexDirection: 'row', alignItems: 'center', gap: ms(6), paddingHorizontal: ms(10), paddingVertical: ms(4) }]}>
                <Text style={{ fontSize: ms(14) }}>{tagObj?.emoji}</Text>
                <Text style={[styles.tweetTagLabel, { color: tagObj?.color || colors.primary, fontSize: ms(12), fontWeight: '800' }]}>
                  {t(`tag_${item.tag}`, { defaultValue: tagObj?.label || item.tag }).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {item.image_url && (
            item.image_url.toLowerCase().endsWith('.mp4') ? (
              <TouchableOpacity activeOpacity={0.95} onPress={() => setPreviewImage(item.image_url)}>
                <View style={{ position: 'relative' }}>
                  <Video
                    source={{ uri: item.image_url }}
                    style={[styles.postImage, { backgroundColor: '#000' }]}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                  />
                  <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', borderRadius: ms(16), marginVertical: ms(12), backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                    <WebIcon name="play-circle" size= {54} color="rgba(255,255,255,0.9)" />
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.95} onPress={() => setPreviewImage(item.image_url)}>
                <ExpoImage 
                  source={{ uri: item.image_url }} 
                  style={styles.postImage} 
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>
            )
          )}

          <TranslatedPostText notification={item} colors={colors} t={t} i18n={i18n} />

          <View style={styles.tweetActions}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(15) }}>
              <TouchableOpacity onPress={() => setActivePostForComments(item)} style={styles.tweetActionBtn}>
                <WebIcon name="chatbubble-outline" size= {20} color={colors.textSecondary} />
                {commentsCount > 0 && (
                  <Text style={[styles.tweetActionCount, { color: colors.textSecondary }]}>{commentsCount}</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => handleReaction(item.id, 'like')} 
                style={styles.tweetActionBtn}
              >
                <Animated.Text style={{ fontSize: ms(20), opacity: hasReacted('like') ? 1 : 0.4 }}>
                  {REACTION_TYPES.find(r => r.id === 'like')?.emoji}
                </Animated.Text>
                {counts.like > 0 && <Text style={[styles.tweetActionCount, { color: hasReacted('like') ? "#ef4444" : colors.textSecondary }]}>{counts.like}</Text>}
              </TouchableOpacity>
              
              {item.type === 'official' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '10', paddingHorizontal: ms(8), paddingVertical: ms(4), borderRadius: ms(6) }}>
                  <WebIcon name="shield-checkmark" size= {12} color={colors.primary} style={{ marginRight: ms(4) }} />
                  <Text style={{ fontSize: ms(12), color: colors.primary, fontWeight: '800' }}>VERIFIED OFFICIAL</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(15) }}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => handleReaction(item.id, 'helpful')} 
                    style={styles.tweetActionBtn}
                  >
                    <Animated.Text style={{ fontSize: ms(20), opacity: hasReacted('helpful') ? 1 : 0.4 }}>
                      {REACTION_TYPES.find(r => r.id === 'helpful')?.emoji}
                    </Animated.Text>
                    {counts.helpful > 0 && <Text style={[styles.tweetActionCount, { color: hasReacted('helpful') ? "#10b981" : colors.textSecondary }]}>{counts.helpful}</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => handleReaction(item.id, 'alert')} 
                    style={styles.tweetActionBtn}
                  >
                    <Animated.Text style={{ fontSize: ms(20), opacity: hasReacted('alert') ? 1 : 0.4 }}>
                      {REACTION_TYPES.find(r => r.id === 'alert')?.emoji}
                    </Animated.Text>
                    {counts.alert > 0 && <Text style={[styles.tweetActionCount, { color: hasReacted('alert') ? "#f59e0b" : colors.textSecondary }]}>{counts.alert}</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {(item.userId === user?.id || isAdmin) ? (
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.tweetActionBtn, { marginLeft: 'auto' }]}>
                <WebIcon name="trash-outline" size= {20} color="#FF5252" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.tweetActionBtn, { marginLeft: 'auto' }]}>
                <WebIcon name="share-social-outline" size= {20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

const normalizeText = (text: string) => {
    let clean = text
      .toLowerCase()
      .replace(/[0@$!1*.-€358+74|&]/g, (m) => {
        const map: any = {
          '0': 'o',
          '@': 'a',
          '$': 's',
          '€': 'e',
          '3': 'e',
          '5': 's',
          '8': 'b',
          '+': 't',
          '7': 't',
          '4': 'a',
          '!': 'i',
          '1': 'i',
          '|': 'i',
          '&': 'e',
          '*': '',
          '.': '',
          '-': '',
          '_': '',
        };
        return map[m] || m;
      })
      .replace(/[^a-z0-9]/g, '');

    // Collapse repeating characters (e.g., 'ssseeeex' -> 'sex')
    const collapsed = clean.replace(/(.)\1+/g, '$1');
    return { clean, collapsed };
  };


export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isTutorialVisible, setTutorialVisible] = useState(false);
  const [postText, setPostText] = useState("");
  const [selectedTag, setSelectedTag] = useState('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastPostTime, setLastPostTime] = useState<Date | null>(null);
  const [userReactions, setUserReactions] = useState<{ [postId: string]: string[] }>({});
  const [globalReactionCounts, setGlobalReactionCounts] = useState<{ [postId: string]: { [reactionType: string]: number } }>({});
  const [postComments, setPostComments] = useState<{ [postId: string]: any[] }>({});
  const [activePostForComments, setActivePostForComments] = useState<Notification | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [postTag, setPostTag] = useState('traffic');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video'>('image');
  const [isUploading, setIsUploading] = useState(false);
  const [unreadOfficialCount, setUnreadOfficialCount] = useState(0);
  const [isOfficialModalVisible, setIsOfficialModalVisible] = useState(false);
  const [isOfficialPost, setIsOfficialPost] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);



  // Legacy load removed, reactions fetched globally

  const loadComments = async () => {
    const jsonValue = await AsyncStorage.getItem('@trotro_post_comments');
    if (jsonValue) {
      setPostComments(JSON.parse(jsonValue));
    }
  };

  const handleReaction = useCallback(async (postId: string, reactionId: string) => {
    const current = userReactions[postId] || [];
    const isAdding = !current.includes(reactionId);
    
    let updated: string[];
    if (!isAdding) {
      updated = current.filter(r => r !== reactionId);
    } else {
      updated = [...current, reactionId];
    }
    
    setUserReactions(prev => ({ ...prev, [postId]: updated }));

    // Optimistic Global Count
    setGlobalReactionCounts(prev => {
      const counts = prev[postId] || { like: 0, helpful: 0, alert: 0 };
      return {
        ...prev,
        [postId]: {
          ...counts,
          [reactionId]: Math.max(0, (counts[reactionId] || 0) + (isAdding ? 1 : -1))
        }
      };
    });

    const userId = user?.id || 'anonymous';
    try {
      await NotificationService.toggleReaction(postId, userId, reactionId, isAdding);
    } catch(e) {
      console.error(e);
    }
  }, [user?.id, userReactions]);

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !activePostForComments) return;
    
    const userName = user?.firstName || user?.username || 'Anonymous';
    const userId = user?.id || 'anonymous';
    
    const tempId = 'temp_' + Date.now().toString();
    const comment = {
      id: tempId,
      text: newCommentText,
      user: userName,
      userId: userId,
      time: 'Just now',
    };
    
    // Optimistic UI update
    const updated = {
      ...postComments,
      [activePostForComments.id]: [...(postComments[activePostForComments.id] || []), comment],
    };
    
    setPostComments(updated);
    setNewCommentText('');
    AsyncStorage.setItem('@trotro_post_comments', JSON.stringify(updated)).catch(console.error);
    
    // Push globally to Supabase
    try {
      await NotificationService.addComment(activePostForComments.id, userId, userName, newCommentText);
    } catch (e) {
      console.error("Failed to add comment globally", e);
    }
  };

  const handleDeleteComment = useCallback(async (postId: string, commentId: string) => {
    // Optimistic UI update
    setPostComments(prev => {
      const updated = {
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
      };
      AsyncStorage.setItem('@trotro_post_comments', JSON.stringify(updated)).catch(console.error);
      return updated;
    });

    try {
      await NotificationService.deleteComment(commentId);
    } catch(e) {
      console.error(e);
    }
  }, []);

  const handleOpenComments = useCallback(async (post: any) => {
    setActivePostForComments(post);
    if (!post) return;
    try {
      const comments = await NotificationService.getComments(post.id);
      if (comments.length > 0) {
        setPostComments(prev => {
          const formattedComments = comments.map(c => ({
            id: c.id,
            text: c.text,
            user: c.username,
            userId: c.userId,
            time: new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          }));
          const updated = { ...prev, [post.id]: formattedComments };
          AsyncStorage.setItem('@trotro_post_comments', JSON.stringify(updated)).catch(console.error);
          return updated;
        });
      }
    } catch(e) {
      console.error(e);
    }
  }, []);

  const isAdmin = user?.primaryEmailAddress?.emailAddress?.includes("admin") || 
                  user?.primaryEmailAddress?.emailAddress?.endsWith("@mytroski.go") ||
                  user?.primaryEmailAddress?.emailAddress === "brighttoughson@gmail.com" ||
                  user?.primaryEmailAddress?.emailAddress === "twitterbirdplus@gmail.com" ||
                  user?.primaryEmailAddress?.emailAddress?.toLowerCase().includes("mufasa") ||
                  user?.id === "user_2lI3YI5A8y5q7N5b7z8x9c0v1b2";

  const drift1 = useSharedValue(0);
  const drift2 = useSharedValue(0);

  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      drift1.value = withRepeat(withTiming(30, { duration: 10000 }), -1, true);
      drift2.value = withRepeat(withTiming(-25, { duration: 12000 }), -1, true);
    }
  }, [drift1, drift2]);

  const animatedDrift1 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift1.value }, { translateY: drift2.value }],
  }));

  const animatedDrift2 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift2.value }, { translateY: drift1.value }],
  }));

  const loadAllData = useCallback(async () => {
    const [notifs, comments, allReactions] = await Promise.all([
      NotificationService.getNotifications(),
      AsyncStorage.getItem('@trotro_post_comments'),
      NotificationService.getReactions()
    ]);
    
    setNotifications(notifs);
    if (comments) setPostComments(JSON.parse(comments));

    const globalCounts: any = {};
    const localReactions: any = {};
    const userId = user?.id || 'anonymous';

    allReactions.forEach(r => {
      // Global Counts
      if (!globalCounts[r.postId]) globalCounts[r.postId] = { like: 0, helpful: 0, alert: 0 };
      globalCounts[r.postId][r.reactionType] = (globalCounts[r.postId][r.reactionType] || 0) + 1;

      // Local User Reactions
      if (r.userId === userId) {
        if (!localReactions[r.postId]) localReactions[r.postId] = [];
        localReactions[r.postId].push(r.reactionType);
      }
    });

    setGlobalReactionCounts(globalCounts);
    setUserReactions(localReactions);

    const officialCount = await NotificationService.getUnreadCountByCategory('official');
    setUnreadOfficialCount(officialCount);
  }, [user?.id]);

  const loadNotifications = async (newNotification?: any, deletedId?: string) => {
    if (deletedId) {
      setNotifications(prev => prev.filter(n => n.id !== deletedId));
      return;
    }
    if (newNotification) {
      setNotifications(prev => {
        // Prevent duplicates
        if (prev.some(n => n.id === newNotification.id)) return prev;
        return [newNotification, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });
    } else {
      const data = await NotificationService.getNotifications();
      setNotifications(data);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAllData();
      NotificationService.markCategoryAsRead('community'); // Clear badge on visit
      
      const unsubscribe = NotificationService.subscribe(loadNotifications);
      const channel = NotificationService.initRealtime();
      
      const unsubscribeComments = NotificationService.subscribeToComments((newComment, isDelete) => {
        setPostComments(prev => {
          if (isDelete) {
             const existing = prev[newComment.postId] || [];
             const updated = {
               ...prev,
               [newComment.postId]: existing.filter(c => c.id !== newComment.id)
             };
             AsyncStorage.setItem('@trotro_post_comments', JSON.stringify(updated)).catch(console.error);
             return updated;
          }

          const formatted = {
            id: newComment.id,
            text: newComment.text,
            user: newComment.username,
            userId: newComment.userId,
            time: new Date(newComment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          };
          const existing = prev[newComment.postId] || [];
          if (existing.some(c => c.id === formatted.id)) return prev;
          
          // Filter out optimistic duplicate comments created by this user
          const filtered = existing.filter(c => !(c.id.startsWith('temp_') && c.text === formatted.text && c.userId === formatted.userId));
          
          const updated = {
            ...prev,
            [newComment.postId]: [...filtered, formatted]
          };
          AsyncStorage.setItem('@trotro_post_comments', JSON.stringify(updated)).catch(console.error);
          return updated;
        });
      });

      const unsubscribeReactions = NotificationService.subscribeToReactions((reaction) => {
        const userId = user?.id || 'anonymous';
        
        // Update global counts (skip if current user to avoid doubling optimistic UI)
        if (reaction.userId !== userId) {
          setGlobalReactionCounts(prev => {
            const counts = prev[reaction.postId] || { like: 0, helpful: 0, alert: 0 };
            return {
              ...prev,
              [reaction.postId]: {
                ...counts,
                [reaction.reactionType]: Math.max(0, (counts[reaction.reactionType] || 0) + (reaction.isDelete ? -1 : 1))
              }
            };
          });
        }

        // Sync local state if it's the current user (e.g., cross-device)
        if (reaction.userId === userId) {
           setUserReactions(prev => {
             const current = prev[reaction.postId] || [];
             if (reaction.isDelete) {
               return { ...prev, [reaction.postId]: current.filter(r => r !== reaction.reactionType) };
             } else {
               if (!current.includes(reaction.reactionType)) {
                 return { ...prev, [reaction.postId]: [...current, reaction.reactionType] };
               }
               return prev;
             }
           });
        }
      });
      
      return () => {
        unsubscribe();
        if (channel) channel();
        unsubscribeComments();
        unsubscribeReactions();
      };
    }, [loadAllData, user?.id])
  );

  // Sync postTag with filter for better UX


  const filteredNotifications = React.useMemo(() => {
    let base = notifications.filter(n => n.type !== 'official');
    
    // Filter by tag if not 'all'
    if (selectedTag !== 'all') {
      base = base.filter(n => n.tag === selectedTag);
    }

    return base.map(n => ({
      ...n,
      reactions: userReactions[n.id] || [],
      globalCounts: globalReactionCounts[n.id] || { like: 0, helpful: 0, alert: 0 },
      commentsCount: postComments[n.id]?.length || 0
    }));
  }, [notifications, selectedTag, userReactions, globalReactionCounts, postComments]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
      setSelectedMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
      // Store base64 for native upload fallback
      if (result.assets[0].base64) {
        await AsyncStorage.setItem('@temp_image_base64', result.assets[0].base64);
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), t('camera_permission_denied', 'Camera permission is required.'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
      setSelectedMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
      if (result.assets[0].base64) {
        await AsyncStorage.setItem('@temp_image_base64', result.assets[0].base64);
      }
    }
  };

  const handleClearAllCommunity = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        t('confirm_clear_community', 'Clear Community Feed?'),
        t('confirm_clear_community_desc', 'This will remove all current community reports from your view.'),
        [
          { text: t('cancel'), style: 'cancel' },
          { 
            text: t('clear'), 
            style: 'destructive',
            onPress: async () => {
              await NotificationService.deleteCategoryNotifications('community');
              loadNotifications();
            }
          }
        ]
      );
    } else {
      if (window.confirm("Clear all community reports from your view?")) {
        await NotificationService.deleteCategoryNotifications('community');
        loadNotifications();
      }
    }
  };

  const handlePost = async () => {
    if (!postText.trim()) {
      if (Platform.OS === "web") {
        window.alert(t('enter_post_text'));
      } else {
        Alert.alert(t('error', 'Error'), t('enter_post_text'));
      }
      return;
    }

    const lowerText = postText.toLowerCase();
    const { clean, collapsed } = normalizeText(postText);
    
    const urlPattern =
      /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\b[a-z0-9]+\.(com|net|org|co|gh|info|biz)\b)/i;
    if (urlPattern.test(lowerText)) {
      if (Platform.OS === "web") {
        window.alert(t('no_links_spam'));
      } else {
        Alert.alert(
          t('error', 'Post Rejected'),
          t('no_links_spam'),
        );
      }
      return;
    }

    const isDirectInsult =
      /\byou\s+are\b/i.test(lowerText) || /\bare\s+you\b/i.test(lowerText);
    
    // Check using word boundaries to prevent false positives (e.g., "rat" in "congratulations")
    const containsBadWord = BLACKLIST.some((word) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i');
      return regex.test(lowerText) || regex.test(clean) || regex.test(collapsed);
    });

    if (
      containsBadWord ||
      (isDirectInsult &&
        /\b(mad|sick|stupid|fool)\b/i.test(lowerText))
    ) {
      if (Platform.OS === "web") {
        window.alert(t('inappropriate_language'));
      } else {
        Alert.alert(
          t('error', 'Post Rejected'),
          t('inappropriate_language'),
        );
      }
      return;
    }

    const now = new Date();
    if (
      !isAdmin && 
      lastPostTime &&
      now.getTime() - lastPostTime.getTime() < 5 * 60 * 1000
    ) {
      const minutesLeft = Math.ceil(
        (5 * 60 * 1000 - (now.getTime() - lastPostTime.getTime())) / 60000,
      );
      if (Platform.OS === "web") {
        window.alert(
          `${t('slow_down')}: ${t('post_again_in', { minutes: minutesLeft })}`,
        );
      } else {
        Alert.alert(
          t('slow_down'),
          t('post_again_in', { minutes: minutesLeft }),
        );
      }
      return;
    }

    const finalPostTag = postTag;
    const tagObj = TAGS.find(t => t.id === finalPostTag) || TAGS.find(t => t.id === 'other');
    try {
      const formattedTime = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + 
                            now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      let finalImageUrl = undefined;
      if (selectedImage) {
        setIsUploading(true);
        const uploadedUrl = await NotificationService.uploadMedia(selectedImage, selectedMediaType);
        
        // If upload failed, stop the post and let the user try again
        if (!uploadedUrl) {
          setIsUploading(false);
          return; 
        }
        finalImageUrl = uploadedUrl;
      }

      await NotificationService.addNotification({
        title: isOfficialPost ? "myTroski Go Official" : (user?.fullName || (t('traveler') as string)),
        message: postText,
        time: formattedTime,
        icon: isOfficialPost ? "shield-checkmark" : (user?.imageUrl || tagObj?.icon || "person"),
        color: isOfficialPost ? colors.primary : (tagObj?.color || colors.primary),
        type: isOfficialPost ? "official" : "community_post",
        userId: user?.id,
        username: isOfficialPost ? "official" : (user?.username || undefined),
        tag: finalPostTag,
        image_url: finalImageUrl,
      });

      setIsOfficialPost(false); // Reset after post

      setLastPostTime(now);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('post_successful'),
          body: `"${postText}"`,
        },
        trigger: null,
      });

      if (Platform.OS === "web") {
        window.alert(t('post_shared'));
      } else {
        Alert.alert(
          t('success', 'Success'),
          t('post_shared'),
        );
      }
      setPostText("");
      setPostTag('other');
      setSelectedImage(null);
      setSelectedMediaType('image');
      await AsyncStorage.removeItem('@temp_image_base64');
    } catch (err) {
      console.error("Post error:", err);
      if (Platform.OS === "web") {
        window.alert("Failed to share post. Please check your connection.");
      } else {
        Alert.alert("Error", "Failed to share post. Please check your connection.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    // SECURITY: This is just a UI check. Backend should also verify permissions.
    if (Platform.OS === "web") {
      const confirmed = window.confirm(t('delete_confirm'));
      if (confirmed) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        await NotificationService.deleteNotification(id);
      }
      return;
    }

    Alert.alert(t('delete_post'), t('delete_confirm'), [
      { text: t('cancel', 'Cancel'), style: "cancel" },
      {
        text: t('delete', 'Delete'),
        style: "destructive",
        onPress: async () => {
          setNotifications(prev => prev.filter(n => n.id !== id));
          await NotificationService.deleteNotification(id);
        },
      },
    ]);
  }, [t]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const commentsCount = postComments[item.id]?.length || 0;
    return (
      <NotificationItem 
        item={item} 
        index={index} 
        colors={colors} 
        t={t} 
        i18n={i18n} 
        user={user} 
        isAdmin={isAdmin}
        commentsCount={commentsCount}
        handleReaction={handleReaction}
        setActivePostForComments={handleOpenComments}
        handleDelete={handleDelete}
        setPreviewImage={setPreviewImage}
      />
    );
  }, [colors, t, i18n, user, isAdmin, handleReaction, handleDelete, handleOpenComments, setPreviewImage, postComments]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[
          colors.background,
          isDark ? "#0f172a" : "#f0f4ff",
          isDark ? "#020617" : "#e0e7ff",
        ]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Drift Elements */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift1,
            {
              backgroundColor: "#0286FF",
              top: ms(-80),
              right: ms(-50),
              width: ms(300),
              height: ms(300),
              opacity: isDark ? 0.5 : 0.25,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift2,
            {
              backgroundColor: "#FFD700",
              bottom: "10%",
              left: ms(-100),
              width: ms(250),
              height: ms(250),
              opacity: isDark ? 0.5 : 0.25,
            },
          ]}
        />
      </View>

      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={[styles.header, { paddingHorizontal: ms(20), marginBottom: ms(15), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('community_feed', 'Community')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontSize: ms(15) }]}>
              Latest reports & alerts
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsOfficialModalVisible(true)}
            style={styles.headerIconBtn}
          >
            <WebIcon name="notifications-outline" size= {24} color={colors.text} />
            {unreadOfficialCount > 0 && (
              <View style={[styles.bellBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.bellBadgeText}>
                  {unreadOfficialCount > 9 ? '9+' : unreadOfficialCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredNotifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponentStyle={{ marginBottom: 0 }}
          ListFooterComponent={
            <View style={{ height: ms(100) }} />
          }
          ListHeaderComponent={
            <View>
              {/* Post Box */}
              <Animated.View
                  entering={FadeInDown.delay(100).duration(800).springify()}
                  style={[
                    styles.postContainer,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.postLabel, { color: colors.text }]}>
                    {t('broadcast_update')}
                  </Text>

                  
                    <View style={styles.tagScrollContainer}>
                      <Text style={[styles.tagSectionLabel, { color: colors.textSecondary, paddingHorizontal: ms(4) }]}>{t('what_is_happening', 'Select category:')}</Text>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.tagHorizontalScroll}
                      >
                        {TAGS.filter(t => t.id !== 'all').map(tag => (
                          <TouchableOpacity
                            key={tag.id}
                            activeOpacity={0.8}
                            onPress={() => setPostTag(tag.id)}
                            style={[
                              styles.tagChip,
                              { 
                                backgroundColor: postTag === tag.id ? tag.color : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                                borderColor: postTag === tag.id ? tag.color : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                                marginRight: ms(10),
                              }
                            ]}
                          >
                            <Text style={{ fontSize: ms(18) }}>{tag.emoji}</Text>
                            <Text style={[styles.tagLabel, { color: postTag === tag.id ? '#fff' : colors.text, fontSize: ms(14) }]}>{t(`tag_${tag.id}`, tag.label)}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {isAdmin && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: ms(15), paddingHorizontal: ms(4) }}>
                        <TouchableOpacity 
                          onPress={() => setIsOfficialPost(!isOfficialPost)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}
                        >
                          <View style={{ 
                            width: ms(20), 
                            height: ms(20), 
                            borderRadius: ms(6), 
                            borderWidth: ms(2), 
                            borderColor: isOfficialPost ? colors.primary : colors.textSecondary,
                            backgroundColor: isOfficialPost ? colors.primary : 'transparent',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
                            {isOfficialPost && <WebIcon name="checkmark" size= {14} color="white" />}
                          </View>
                          <Text style={{ color: isOfficialPost ? colors.primary : colors.textSecondary, fontWeight: '700', fontSize: ms(15) }}>
                            {t('post_as_official', 'Post as Official Update')}
                          </Text>
                        </TouchableOpacity>
                        <WebIcon name="shield-checkmark" size= {16} color={isOfficialPost ? colors.primary : colors.textSecondary} style={{ marginLeft: ms(6) }} />
                      </View>
                    )}

                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        color: colors.text,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        height: ms(80),
                        textAlignVertical: 'top',
                        paddingTop: ms(16),
                      },
                    ]}
                    placeholder={t('report_placeholder')}
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    value={postText}
                    onChangeText={setPostText}
                  />

                  {selectedImage && (
                    <View style={styles.imagePreviewContainer}>
                      <ExpoImage 
                        source={{ uri: selectedImage }} 
                        style={styles.imagePreview} 
                        contentFit="cover"
                      />
                      <TouchableOpacity 
                        style={styles.removeImageBtn}
                        onPress={() => setSelectedImage(null)}
                      >
                        <WebIcon name="close" size= {16} color="white" />
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={[styles.postActions, { flexWrap: 'nowrap' }]}>
                    <View style={{ flexDirection: 'row', gap: ms(6), flex: 1 }}>
                      <TouchableOpacity onPress={() => pickImage()} style={[styles.mediaBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', flex: 1, justifyContent: 'center' }]}>
                        <WebIcon name="image-outline" size= {16} color={colors.primary} />
                        <Text style={[styles.mediaBtnText, { color: colors.textSecondary, fontSize: ms(14) }]} numberOfLines={1}>{t('photo', 'Photo')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => takePhoto()} style={[styles.mediaBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', flex: 1, justifyContent: 'center' }]}>
                        <WebIcon name="camera-outline" size= {16} color={colors.primary} />
                        <Text style={[styles.mediaBtnText, { color: colors.textSecondary, fontSize: ms(14) }]} numberOfLines={1}>{t('camera', 'Camera')}</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={handlePost}
                      disabled={isUploading || !postText.trim()}
                      style={[
                        styles.postButton,
                        { 
                          backgroundColor: (isUploading || !postText.trim()) ? colors.border : colors.primary,
                          paddingHorizontal: ms(12),
                          height: ms(36),
                          borderRadius: ms(18),
                          marginLeft: ms(8),
                          minWidth: ms(80),
                        },
                      ]}
                    >
                      {isUploading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(8) }}>
                          <ActivityIndicator size= "small" color="#fff" />
                          <Text style={[styles.postButtonText, { fontSize: ms(13) }]}>{t('uploading', 'Uploading...')}</Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.postButtonText, { fontSize: ms(13) }]}>
                            {isOfficialPost ? t('post_official', 'Post') : t('community_post_btn', 'Post')}
                          </Text>
                          <WebIcon name="send" size= {14} color="#fff" style={{ marginLeft: ms(6) }} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </Animated.View>

              {/* Feed Filter Bar */}
                <View style={[styles.filterBarContainer]}>
                  <View style={styles.filterBarHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(6), flex: 1 }}>
              <WebIcon name="funnel-outline" size= {14} color={colors.textSecondary} />
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>{t('filter_by', 'Filter by')}</Text>
            </View>
            {isAdmin && (
              <TouchableOpacity 
                onPress={handleClearAllCommunity} 
                style={[styles.adminClearBtn, { backgroundColor: '#FF525215' }]}
              >
                <WebIcon name="trash-bin" size= {14} color="#FF5252" />
                <Text style={styles.adminClearText}>CLEAR ALL</Text>
              </TouchableOpacity>
            )}
          </View>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.filterScroll}
                  >
                    {TAGS.map(tag => (
                      <TouchableOpacity
                        key={tag.id}
                        activeOpacity={0.7}
                        onPress={() => setSelectedTag(tag.id)}
                        style={[
                          styles.filterChip,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
                          selectedTag === tag.id && { 
                            backgroundColor: tag.color + '15', 
                            borderColor: tag.color + '40',
                            shadowColor: tag.color,
                            shadowOffset: { width: 0, height: ms(4) },
                            shadowOpacity: 0.2,
                            shadowRadius: ms(8),
                            elevation: 4
                          }
                        ]}
                      >
                        <Text style={{ fontSize: ms(18) }}>{tag.emoji}</Text>
                        <Text style={[
                          styles.filterChipLabel, 
                          { color: selectedTag === tag.id ? colors.text : colors.textSecondary, fontWeight: selectedTag === tag.id ? '800' : '600' }
                        ]}>
                          {t(`tag_${tag.id}`, tag.label)}
                        </Text>
                        {selectedTag === tag.id && (
                          <View style={[styles.activeIndicator, { backgroundColor: tag.color }]} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <WebIcon name="notifications-off-outline" size= {48} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: ms(10), fontWeight: '600' }}>
                {t('no_community_alerts')}
              </Text>
            </View>
          }
        />
        {/* Comment Modal */}
        <Modal
          visible={activePostForComments !== null}
          transparent={true}
          animationType="none"
          onRequestClose={() => setActivePostForComments(null)}
        >
          {activePostForComments !== null && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 10 }]} pointerEvents="box-none">
              <Animated.View entering={FadeIn} exiting={FadeOut} style={StyleSheet.absoluteFill}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} activeOpacity={1} onPress={() => setActivePostForComments(null)} />
              </Animated.View>
              <Animated.View 
                entering={SlideInDown.springify().damping(25).stiffness(200)}
                exiting={SlideOutDown}
                style={{ position: 'absolute', bottom: 0, width: '100%', alignSelf: 'center' }}
              >
                <KeyboardAvoidingView 
                  behavior={Platform.OS === "ios" ? "padding" : "height"}
                  style={[styles.commentSheet, { backgroundColor: colors.card }]}
                >
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('replies')}</Text>
                  <TouchableOpacity onPress={() => setActivePostForComments(null)}>
                    <WebIcon name="close" size= {24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={activePostForComments ? (postComments[activePostForComments.id] || []) : []}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.commentItem}>
                      <View style={styles.commentAvatar}>
                        <WebIcon name="person" size= {16} color={colors.textSecondary} />
                      </View>
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader}>
                          <Text style={[styles.commentUser, { color: colors.text }]}>{item.user}</Text>
                          <Text style={[styles.commentTime, { color: colors.textSecondary }]}>{item.time}</Text>
                        </View>
                        <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.text}</Text>
                      </View>
                      {(item.userId === user?.id || isAdmin) && (
                        <TouchableOpacity 
                          style={{ padding: ms(8), justifyContent: 'center' }}
                          onPress={() => handleDeleteComment(activePostForComments!.id, item.id)}
                        >
                          <WebIcon name="trash-bin-outline" size= {16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={[styles.emptyComments, { color: colors.textSecondary }]}>
                      {t('no_replies')}
                    </Text>
                  }
                  contentContainerStyle={{ paddingBottom: ms(20) }}
                />
                
                <View style={[styles.commentInputContainer, { borderTopColor: colors.border }]}>
                  <TextInput
                    style={[styles.commentInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder={t('tweet_reply')}
                    placeholderTextColor={colors.textSecondary}
                    value={newCommentText}
                    onChangeText={setNewCommentText}
                  />
                  <TouchableOpacity 
                    style={[styles.sendCommentBtn, { backgroundColor: colors.primary }]}
                    onPress={handleAddComment}
                  >
                    <WebIcon name="send" size= {16} color="white" />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
              </Animated.View>
            </View>
          )}
        </Modal>
        
        {/* Full-Screen Image Viewer Modal */}
        <Modal
          visible={previewImage !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPreviewImage(null)}
        >
          {previewImage !== null && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 2000, elevation: 20 }]} pointerEvents="box-none">
              <Animated.View entering={FadeIn} exiting={FadeOut} style={StyleSheet.absoluteFill}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
                  <Pressable 
                    style={StyleSheet.absoluteFill} 
                    onPress={() => setPreviewImage(null)} 
                  />
                  {previewImage.toLowerCase().endsWith('.mp4') ? (
                    <Video
                      source={{ uri: previewImage }}
                      style={{ width: '100%', height: '100%' }}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay
                    />
                  ) : (
                    <ExpoImage
                      source={{ uri: previewImage }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="contain"
                    />
                  )}
                  
                  {/* Close Button */}
                  <TouchableOpacity 
                    style={{ position: 'absolute', top: ms(50), right: ms(25), backgroundColor: 'rgba(255,255,255,0.2)', padding: ms(10), borderRadius: ms(25), zIndex: 3000 }}
                    onPress={() => setPreviewImage(null)}
                  >
                    <WebIcon name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          )}
        </Modal>
        
        <OfficialAnnouncementsModal 
          isVisible={isOfficialModalVisible} 
          onClose={() => setIsOfficialModalVisible(false)} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  decorativeCircle: {
    position: "absolute",
    borderRadius: ms(999),
  },
  header: {
    paddingHorizontal: ms(20),
    paddingVertical: ms(24),
  },
  headerTitle: { fontSize: ms(24), fontWeight: "900", marginBottom: ms(12), letterSpacing: -0.8 },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: ms(14),
    padding: ms(4),
    marginBottom: ms(15),
  },
  tab: {
    flex: 1,
    paddingVertical: ms(10),
    borderRadius: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  tabText: { fontSize: ms(15), fontWeight: '800', letterSpacing: 0.2 },
  tabUnreadDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    position: 'absolute',
    top: ms(-2),
    right: ms(-8),
  },
  listContent: { paddingHorizontal: ms(24), paddingTop: ms(10), paddingBottom: ms(140) },
  notificationCard: {
    flexDirection: "row",
    padding: ms(18),
    borderRadius: ms(24),
    marginBottom: ms(16),
    borderWidth: ms(1.5),
    alignItems: "center",
    ...Platform.select({
      web: {},
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: ms(8) },
        shadowOpacity: 0.05,
        shadowRadius: ms(16),
        elevation: 3,
      }
    }),
  },
  iconContainer: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    justifyContent: "center",
    alignItems: "center",
    marginRight: ms(14),
  },
  textContainer: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: ms(4),
    alignItems: 'flex-start'
  },
  timeTagContainer: {
    alignItems: 'flex-end',
    marginLeft: ms(8),
  },
  title: { fontSize: ms(16), fontWeight: "800", marginRight: ms(5) },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(6),
    marginLeft: ms(4),
  },
  typeBadgeText: {
    fontSize: ms(11),
    fontWeight: '800',
    marginLeft: ms(3),
    textTransform: 'uppercase',
  },
  topRightTag: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: ms(8),
    marginBottom: ms(4),
  },
  topRightTagLabel: {
    fontSize: ms(11),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  time: { fontSize: ms(12), fontWeight: '600' },
  message: { fontSize: ms(15), lineHeight: ms(20), fontWeight: '500' },
  rightActions: {
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: ms(8), height: ms(8), borderRadius: ms(4), marginBottom: ms(8) },
  deleteButton: {
    padding: ms(8),
  },
  postContainer: {
    padding: ms(16),
    borderRadius: ms(24),
    borderWidth: 1,
    marginBottom: ms(28),
    ...Platform.select({
      web: {},
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: ms(10) },
        shadowOpacity: 0.08,
        shadowRadius: ms(15),
        elevation: 5,
      }
    }),
  },
  postLabel: { fontSize: ms(18), fontWeight: "800", marginBottom: ms(12) },
  input: {
    borderWidth: ms(1.5),
    borderRadius: ms(16),
    paddingHorizontal: ms(16),
    marginBottom: ms(15),
    fontSize: ms(16),
    fontWeight: '500',
    outlineStyle: 'none' as any,
  },
  tagScrollContainer: {
    marginBottom: ms(18),
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(8),
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: ms(20),
    borderWidth: 1,
  },
  tagHorizontalScroll: {
    paddingHorizontal: ms(4),
    paddingVertical: ms(2),
  },
  tagLabel: { fontSize: ms(15), fontWeight: '700', marginLeft: ms(8), letterSpacing: 0.2 },
  tagSectionLabel: { fontSize: ms(13), fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: ms(8), opacity: 0.7 },
  filterBarContainer: {
    paddingVertical: ms(12),
    marginBottom: ms(12),
  },
  filterBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    paddingHorizontal: ms(20),
    marginBottom: ms(12),
  },
  filterLabel: {
    fontSize: ms(14),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  adminClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: ms(12),
    gap: ms(6),
  },
  adminClearText: {
    fontSize: ms(15),
    fontWeight: '900',
    color: '#FF5252',
    letterSpacing: 0.5,
  },
  filterScroll: {
    paddingHorizontal: ms(20),
    paddingRight: ms(40),
    gap: ms(10),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(16),
    paddingVertical: ms(10),
    borderRadius: ms(20),
    borderWidth: 1,
    borderColor: 'transparent',
    gap: ms(8),
    position: 'relative',
  },
  filterChipLabel: {
    fontSize: ms(15),
  },
  activeIndicator: {
    width: ms(4),
    height: ms(4),
    borderRadius: ms(2),
    position: 'absolute',
    top: ms(6),
    right: ms(6),
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: ms(15),
    flexWrap: 'wrap',
    gap: ms(10),
  },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(10),
    paddingVertical: ms(8),
    borderRadius: ms(12),
    gap: ms(4),
  },
  mediaBtnText: {
    fontSize: ms(16),
    fontWeight: '700',
  },
  imagePreviewContainer: {
    marginTop: ms(15),
    position: 'relative',
    borderRadius: ms(16),
    overflow: 'hidden',
    height: ms(180),
    width: '100%',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: ms(10),
    right: ms(10),
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImage: {
    width: '100%',
    height: ms(160),
    borderRadius: ms(16),
    marginVertical: ms(10),
  },
  postButton: {
    flexDirection: "row",
    height: ms(52),
    borderRadius: ms(14),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ms(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: ms(3) },
    shadowOpacity: 0.12,
    shadowRadius: ms(6),
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  postButtonText: { 
    color: "white", 
    fontWeight: "800", 
    fontSize: ms(14),
    letterSpacing: 0.2,
  },
  avatarIcon: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
  },
  headerIconBtn: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(14),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  avatarContainer: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(15),
    borderWidth: ms(2),
    padding: ms(2),
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: ms(12),
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontWeight: '600',
    marginTop: ms(-2),
  },
  headerLanguageWrapper: {
    borderRadius: ms(12),
    paddingHorizontal: ms(4),
    height: ms(48),
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: ms(6),
    right: ms(6),
    minWidth: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(4),
    borderWidth: ms(2),
    borderColor: 'white',
  },
  bellBadgeText: {
    color: 'white',
    fontSize: ms(14),
    fontWeight: '900',
  },
  emptyState: { alignItems: 'center', marginTop: ms(60), opacity: 0.6 },
  tweetCard: {
    flexDirection: 'row',
    padding: ms(16),
    borderRadius: ms(16),
    marginBottom: ms(16),
    borderWidth: 1,
    ...Platform.select({
      web: {},
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: ms(4) },
        shadowOpacity: 0.05,
        shadowRadius: ms(8),
        elevation: 2,
      }
    }),
  },
  tweetLeftCol: {
    marginRight: ms(12),
  },
  tweetAvatarContainer: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  tweetAvatar: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
  },
  tweetRightCol: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  tweetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(4),
  },
  tweetUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  tweetName: {
    fontSize: ms(16),
    fontWeight: '800',
    marginRight: ms(4),
  },
  tweetHandle: {
    fontSize: ms(14),
    fontWeight: '500',
    marginRight: ms(4),
  },
  tweetDot: {
    fontSize: ms(14),
    marginRight: ms(4),
  },
  tweetTime: {
    fontSize: ms(15),
    fontWeight: '400',
  },
  tweetTag: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: ms(10),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tweetTagLabel: {
    fontSize: ms(15),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  messageContainer: {
    padding: ms(12),
    borderRadius: ms(12),
    marginBottom: ms(12),
    marginTop: ms(4),
  },
  tweetMessage: {
    fontSize: ms(15),
    lineHeight: ms(22),
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tweetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: ms(10),
  },
  tweetActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    padding: ms(4),
  },
  tweetActionCount: {
    fontSize: ms(16),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  commentSheet: {
    height: '60%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: ms(20),
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(20),
  },
  sheetTitle: {
    fontSize: ms(20),
    fontWeight: '800',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: ms(16),
  },
  commentAvatar: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(10),
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ms(2),
  },
  commentUser: {
    fontSize: ms(18),
    fontWeight: '700',
    marginRight: ms(6),
  },
  commentTime: {
    fontSize: ms(14),
  },
  commentText: {
    fontSize: ms(16),
    lineHeight: ms(22),
    letterSpacing: 0.2,
  },
  emptyComments: {
    textAlign: 'center',
    marginTop: ms(40),
    fontSize: ms(16),
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: ms(10),
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    height: ms(40),
    borderRadius: ms(20),
    paddingHorizontal: ms(16),
    borderWidth: 1,
    marginRight: ms(10),
    outlineStyle: 'none' as any,
  },
  sendCommentBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
});
