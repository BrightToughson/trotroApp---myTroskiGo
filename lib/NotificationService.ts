import { supabase, SUPABASE_URL } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Alert } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { NotificationsWrapper } from "./NotificationsWrapper";

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  createdAt: string; // ISO string for precise expiry checking
  read: boolean;
  icon: string;
  color: string;
  type: "community_post" | "news_update" | "system" | "official";
  userId?: string;
  username?: string;
  tag?: string;
  image_url?: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

export interface CommunityReaction {
  id?: string;
  postId: string;
  userId: string;
  reactionType: string;
  isDelete?: boolean;
}

const NOTIFICATIONS_KEY = "@trotro_notifications";
const UNREAD_NEWS_KEY = "@trotro_unread_news";
const SEEN_POSTS_KEY = "@trotro_seen_community_posts";
const DELETED_NOTIFICATIONS_KEY = "@trotro_deleted_notifications";

const FALLBACK_TWEETS: Notification[] = [];

// Simple observer pattern to notify listeners of changes
type Listener = (notification?: Notification, deletedId?: string, isLocalSender?: boolean) => void;
const listeners: Set<Listener> = new Set();

type CommentListener = (comment: CommunityComment, isDelete?: boolean) => void;
const commentListeners: Set<CommentListener> = new Set();

type ReactionListener = (reaction: CommunityReaction) => void;
const reactionListeners: Set<ReactionListener> = new Set();

export const NotificationService = {
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  subscribeToComments: (listener: CommentListener): (() => void) => {
    commentListeners.add(listener);
    return () => {
      commentListeners.delete(listener);
    };
  },

  subscribeToReactions: (listener: ReactionListener): (() => void) => {
    reactionListeners.add(listener);
    return () => {
      reactionListeners.delete(listener);
    };
  },

  notify: (notification?: Notification, isLocalSender: boolean = false, deletedId?: string) => {
    listeners.forEach((listener) => listener(notification, deletedId, isLocalSender));
    if (notification && !isLocalSender) {
      if (Platform.OS === 'web') {
        NotificationService.showSystemNotification(notification);
      } else {
        // Show local push banner on mobile
        NotificationsWrapper.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.message,
            data: { id: notification.id, type: notification.type },
          },
          trigger: null, // Send immediately
        });
      }
    }
  },

  /**
   * Initializes real-time listener for community posts.
   * This ensures all users see new reports instantly without refreshing.
   */
  initRealtime: () => {
    if ((SUPABASE_URL as string) === "YOUR_SUPABASE_PROJECT_URL") return;

    // Listen to Community Posts
    const communitySub = supabase
      .channel('community-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_posts' },
        (payload) => {
          // console.log('Real-time community post received!', payload);
          const newPost = payload.new as any;
          NotificationService.notify({
            id: newPost.id || Date.now().toString(),
            title: newPost.title || 'Community Update',
            message: newPost.message || 'New community alert!',
            time: newPost.time || 'Just now',
            createdAt: newPost.createdAt || new Date().toISOString(),
            read: false,
            icon: newPost.icon || 'chatbubble',
            color: newPost.color || '#EAB308',
            type: 'community_post',
            userId: newPost.userId || newPost.userid || newPost.user_id,
            username: newPost.username
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_posts' },
        (payload) => {
          if (payload.old && payload.old.id) {
            NotificationService.notify(undefined, false, payload.old.id);
          }
        }
      )
      .subscribe();

    // Listen to Official Announcements
    const officialSub = supabase
      .channel('official-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'official_announcements' },
        (payload) => {
          // console.log('Real-time official post received!', payload);
          const newPost = payload.new as any;
          NotificationService.notify({
            id: newPost.id || Date.now().toString(),
            title: newPost.title || 'OFFICIAL UPDATE',
            message: newPost.message || 'New official announcement!',
            time: newPost.time || 'Just now',
            createdAt: newPost.createdAt || new Date().toISOString(),
            read: false,
            icon: newPost.icon || 'shield-checkmark',
            color: newPost.color || '#3b82f6',
            type: 'official',
            username: 'official'
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'official_announcements' },
        (payload) => {
          if (payload.old && payload.old.id) {
            NotificationService.notify(undefined, false, payload.old.id);
          }
        }
      )
      .subscribe();

    // Listen to Community Comments
    const commentSub = supabase
      .channel('community-comments-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_comments' },
        (payload) => {
          const newComment = payload.new as any;
          commentListeners.forEach(listener => listener({
            id: newComment.id,
            postId: newComment.post_id,
            userId: newComment.user_id,
            username: newComment.username,
            text: newComment.message,
            createdAt: newComment.created_at,
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_comments' },
        (payload) => {
          const oldComment = payload.old as any;
          commentListeners.forEach(listener => listener({
            id: oldComment.id,
            postId: oldComment.post_id || '',
            userId: oldComment.user_id || '',
            username: '',
            text: '',
            createdAt: '',
          }, true));
        }
      )
      .subscribe();

    // Listen to Community Reactions
    const reactionSub = supabase
      .channel('community-reactions-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_reactions' },
        (payload) => {
          const newReaction = payload.new as any;
          reactionListeners.forEach(listener => listener({
            id: newReaction.id,
            postId: newReaction.post_id,
            userId: newReaction.user_id,
            reactionType: newReaction.reaction_type,
            isDelete: false,
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_reactions' },
        (payload) => {
          const oldReaction = payload.old as any;
          reactionListeners.forEach(listener => listener({
            id: oldReaction.id,
            postId: oldReaction.post_id,
            userId: oldReaction.user_id,
            reactionType: oldReaction.reaction_type,
            isDelete: true,
          }));
        }
      )
      .subscribe();

    return () => {
      communitySub.unsubscribe();
      officialSub.unsubscribe();
      commentSub.unsubscribe();
      reactionSub.unsubscribe();
    };
  },

  getComments: async (postId: string): Promise<CommunityComment[]> => {
    try {
      if ((SUPABASE_URL as string) === "YOUR_SUPABASE_PROJECT_URL") return [];

      const { data, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Supabase Fetch Comments Error:", error.message);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        username: row.username,
        text: row.message,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error("Error fetching comments:", err);
      return [];
    }
  },

  addComment: async (postId: string, userId: string, username: string, text: string): Promise<CommunityComment | null> => {
    try {
      if ((SUPABASE_URL as string) === "YOUR_SUPABASE_PROJECT_URL") return null;

      const insertData = {
        post_id: postId,
        user_id: userId,
        username: username,
        message: text,
      };

      const { data, error } = await supabase
        .from('community_comments')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error("Supabase Insert Comment Error:", error.message);
        throw error;
      }

      return {
        id: data.id,
        postId: data.post_id,
        userId: data.user_id,
        username: data.username,
        text: data.message,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  },

  deleteComment: async (commentId: string): Promise<void> => {
    try {
      if ((SUPABASE_URL as string) === "YOUR_SUPABASE_PROJECT_URL") return;
      
      const { error } = await supabase
        .from('community_comments')
        .delete()
        .eq('id', commentId);
        
      if (error) {
        console.error("Supabase Delete Comment Error:", error.message);
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  },

  getReactions: async (): Promise<CommunityReaction[]> => {
    try {
      if ((SUPABASE_URL as string) === "YOUR_SUPABASE_PROJECT_URL") return [];

      const { data, error } = await supabase
        .from('community_reactions')
        .select('*');

      if (error) {
        console.error("Supabase Fetch Reactions Error:", error.message);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        reactionType: row.reaction_type,
      }));
    } catch (err) {
      console.error("Error fetching reactions:", err);
      return [];
    }
  },

  toggleReaction: async (postId: string, userId: string, reactionType: string, isAdding: boolean): Promise<void> => {
    try {
      if ((SUPABASE_URL as string) === "YOUR_SUPABASE_PROJECT_URL") return;

      if (isAdding) {
        const { error } = await supabase
          .from('community_reactions')
          .insert([{ post_id: postId, user_id: userId, reaction_type: reactionType }]);
          
        if (error && error.code !== '23505') { // Ignore unique violation if already reacted
          console.error("Supabase Insert Reaction Error:", error.message);
        }
      } else {
        const { error } = await supabase
          .from('community_reactions')
          .delete()
          .match({ post_id: postId, user_id: userId, reaction_type: reactionType });

        if (error) {
          console.error("Supabase Delete Reaction Error:", error.message);
        }
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  },



  getNotifications: async (): Promise<Notification[]> => {
    try {
      // 0. Fetch Local Seen History (for Global Posts)
      const seenJson = await AsyncStorage.getItem(SEEN_POSTS_KEY);
      const seenIds: Set<string> = new Set(seenJson ? JSON.parse(seenJson) : []);

      // 0.5. Fetch Deleted Notifications
      const deletedJson = await AsyncStorage.getItem(DELETED_NOTIFICATIONS_KEY);
      const deletedIds: Set<string> = new Set(deletedJson ? JSON.parse(deletedJson) : []);

      // 1. Fetch Local System Notifications
      const jsonValue = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      let localNotifications: Notification[] =
        jsonValue != null ? JSON.parse(jsonValue) : [];

      // Auto-cleanup expired local posts (30 days)
      const now = new Date().getTime();
      const expiryTime = 30 * 24 * 60 * 60 * 1000;
      localNotifications = localNotifications.filter((n) => {
        const created = new Date(n.createdAt).getTime();
        return now - created < expiryTime;
      }).map(n => ({
        ...n,
        type: (n.type === "official" || n.type === "system" || n.type === "news_update") 
              ? n.type : "community_post"
      }));

      // 2. Fetch Global Data from Supabase
      let mergedPosts: Notification[] = [];
      try {
        if ((SUPABASE_URL as string) !== "YOUR_SUPABASE_PROJECT_URL") {
          // A. Fetch Community Posts
          const communityReq = supabase
            .from("community_posts")
            .select("*")
            .order("createdAt", { ascending: false })
            .limit(40);

          // B. Fetch Official Announcements
          const officialReq = supabase
            .from("official_announcements")
            .select("*")
            .order("createdAt", { ascending: false })
            .limit(10);

          const [commRes, offRes] = await Promise.all([communityReq, officialReq]);

          if (commRes.error) console.error("Community Fetch Error:", commRes.error.message);
          if (offRes.error) console.error("Official Fetch Error:", offRes.error.message);

          // Process Official Announcements (Highest Priority)
          const officialData = (offRes.data || []).map(row => ({
            id: row.id,
            title: row.title,
            message: row.message,
            time: row.time || 'Official Update',
            createdAt: row.createdAt,
            read: seenIds.has(row.id),
            icon: row.icon || 'shield-checkmark',
            color: row.color || '#3b82f6',
            type: 'official' as const,
            userId: 'admin',
            username: 'official',
            tag: row.tag || 'safety',
            image_url: row.image_url || undefined,
          }));

          // Process Community Posts
          const communityData = (commRes.data || []).map(row => ({
            id: row.id,
            title: row.title,
            message: row.message,
            time: row.time,
            createdAt: row.createdAt,
            read: seenIds.has(row.id),
            icon: row.icon,
            color: row.color,
            type: 'community_post' as const,
            userId: row.userId || row.userid || row.user_id,
            username: row.username,
            tag: row.tag || undefined,
            image_url: row.image_url || row.imageurl || undefined,
          }));

          mergedPosts = [...officialData, ...communityData].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
      } catch (err) {
        console.error("Global Fetch Error:", err);
      }

      // Combine and filter duplicates
      const allNotifications = [
        ...localNotifications,
        ...mergedPosts,
      ];

      // Add fallbacks
      const finalNotifications = [
        ...allNotifications,
        ...FALLBACK_TWEETS.filter(ft => !allNotifications.some(an => an.id === ft.id))
      ];

      // Sort chronologically
      finalNotifications.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // Filter out deleted notifications
      return finalNotifications.filter(n => !deletedIds.has(n.id) && (new Date().getTime() - new Date(n.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000));
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  },

  addNotification: async (
    notification: Omit<Notification, "id" | "read" | "createdAt">,
  ) => {
    try {
      const newNotification: Notification = {
        ...notification,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        read: false,
      };

      if ((notification.type === "community_post" || notification.type === "official") && (SUPABASE_URL as string) !== "YOUR_SUPABASE_PROJECT_URL") {
        // Push to Supabase Database Globally!
        const insertData: any = {
          title: newNotification.title,
          message: newNotification.message,
          icon: newNotification.icon,
          color: newNotification.color,
          tag: newNotification.tag || (notification.type === 'official' ? 'safety' : 'traffic'),
          image_url: newNotification.image_url,
          createdAt: newNotification.createdAt,
        };

        // Determine Table and add specific fields
        let tableName = "community_posts";
        if (notification.type === "official") {
          tableName = "official_announcements";
        } else {
          insertData.userId = newNotification.userId;
          insertData.username = newNotification.username;
        }

        const { data, error } = await supabase.from(tableName).insert([insertData]).select().single();

        if (error) {
          console.error(`Supabase Insert Error [${tableName}]:`, error.message);
          throw error;
        }

        if (data && data.id) {
          newNotification.id = data.id;
        }
      } else {
        // Push to Local System Storage (System notifications or fallback for community posts)
        const jsonValue = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
        const existing: Notification[] =
          jsonValue != null ? JSON.parse(jsonValue) : [];
        const updated = [newNotification, ...existing];
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      }

      NotificationService.notify(newNotification, true);
      return newNotification;
    } catch (error) {
      console.error("Error adding notification:", error);
      throw error;
    }
  },

  markAsRead: async (id: string) => {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (jsonValue) {
        let list: Notification[] = JSON.parse(jsonValue);
        list = list.map((n) => (n.id === id ? { ...n, read: true } : n));
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
      }
      
      // Also add to seen global posts just in case it's a global one
      const seenJson = await AsyncStorage.getItem(SEEN_POSTS_KEY);
      let seenIdsList: string[] = seenJson ? JSON.parse(seenJson) : [];
      if (!seenIdsList.includes(id)) {
        const updatedSeen = [...seenIdsList, id].slice(-200);
        await AsyncStorage.setItem(SEEN_POSTS_KEY, JSON.stringify(updatedSeen));
      }
      
      NotificationService.notify();
    } catch (e) {
      console.error("Error marking as read", e);
    }
  },

  getUnreadCountByCategory: async (category: 'community' | 'official'): Promise<number> => {
    try {
      const all = await NotificationService.getNotifications();
      if (category === 'community') {
        return all.filter(n => n.type === 'community_post' && !n.read).length;
      } else {
        return all.filter(n => (n.type === 'official' || n.type === 'system' || n.type === 'news_update') && !n.read).length;
      }
    } catch (e) {
      return 0;
    }
  },

  markCategoryAsRead: async (category: 'community' | 'official') => {
    try {
      if (category === 'official') {
        const jsonValue = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
        if (jsonValue) {
          let list: Notification[] = JSON.parse(jsonValue);
          list = list.map((n) => 
            (n.type === 'system' || n.type === 'news_update' || n.type === 'official') 
            ? { ...n, read: true } : n
          );
          await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
        }
      }

      const allNotifications = await NotificationService.getNotifications();
      const targetTypes = category === 'official' 
        ? ["official", "system", "news_update"] 
        : ["community_post"];
      
      const categoryPostIds = allNotifications
        .filter((n) => targetTypes.includes(n.type))
        .map((n) => n.id);
      
      const seenJson = await AsyncStorage.getItem(SEEN_POSTS_KEY);
      let seenIdsList: string[] = seenJson ? JSON.parse(seenJson) : [];
      
      const updatedSeen = Array.from(new Set([...seenIdsList, ...categoryPostIds])).slice(-200);
      await AsyncStorage.setItem(SEEN_POSTS_KEY, JSON.stringify(updatedSeen));

      NotificationService.notify();
    } catch (e) {
      console.error(`Error marking ${category} as read`, e);
    }
  },

  markAllAsRead: async () => {
    try {
      await NotificationService.markCategoryAsRead('official');
      await NotificationService.markCategoryAsRead('community');
    } catch (e) {
      console.error("Error marking all as read", e);
    }
  },

  getUnreadCount: async (): Promise<number> => {
    const notifications = await NotificationService.getNotifications();
    return notifications.filter((n) => !n.read).length;
  },

  deleteNotification: async (id: string) => {
    try {
      // 1. Mark as deleted locally so it doesn't reappear
      const deletedJson = await AsyncStorage.getItem(DELETED_NOTIFICATIONS_KEY);
      let deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        await AsyncStorage.setItem(DELETED_NOTIFICATIONS_KEY, JSON.stringify(deletedIds));
      }

      // 2. Try to delete globally from Supabase
      if ((SUPABASE_URL as string) !== "YOUR_SUPABASE_PROJECT_URL") {
        // Delete from both tables since we don't know the exact type from the ID alone
        const { error: error1 } = await supabase.from("community_posts").delete().eq("id", id);
        const { error: error2 } = await supabase.from("official_announcements").delete().eq("id", id);
        
        // We ignore 22P02 (invalid uuid) errors which happen if local timestamp IDs are checked against UUID columns
        if (error1 && !error1.message.includes("22P02")) console.error("Supabase Delete Error (community_posts):", error1.message);
        if (error2 && !error2.message.includes("22P02")) console.error("Supabase Delete Error (official_announcements):", error2.message);
      }

      // 3. Remove from local storage if it was a local notification
      const jsonValue = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (jsonValue) {
        const existing: Notification[] = JSON.parse(jsonValue);
        const updated = existing.filter((n) => n.id !== id);
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      }
      
      NotificationService.notify();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  },

  getUnreadNews: async (): Promise<number[]> => {
    try {
      const jsonValue = await AsyncStorage.getItem(UNREAD_NEWS_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [1, 2, 3];
    } catch {
      return [1, 2, 3];
    }
  },

  markNewsAsRead: async (newsId: number) => {
    try {
      const unread = await NotificationService.getUnreadNews();
      const updated = unread.filter((id) => id !== newsId);
      await AsyncStorage.setItem(UNREAD_NEWS_KEY, JSON.stringify(updated));
      NotificationService.notify();
    } catch (error) {
      console.error("Error marking news as read:", error);
    }
  },

  hasUnreadNotifications: async (): Promise<boolean> => {
    const unreadNews = await NotificationService.getUnreadNews();
    return unreadNews.length > 0;
  },

  /**
   * Uploads media (image or video) to Supabase Storage and returns the public URL.
   */
  uploadMedia: async (uri: string, type: 'image' | 'video' = 'image'): Promise<string | null> => {
    try {
      if ((SUPABASE_URL as string) === "YOUR_SUPABASE_PROJECT_URL") return null;

      // 1. Prepare file data
      const extension = type === 'video' ? 'mp4' : 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
      const filePath = `post-images/${fileName}`;

      const response = await fetch(uri);
      const fileBody = await response.blob();

      // 2. Upload to 'community-posts' bucket
      const { data, error } = await supabase.storage
        .from('community-posts')
        .upload(filePath, fileBody, {
          contentType: type === 'video' ? 'video/mp4' : 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('community-posts')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      
      // Provide clear feedback to the user about why it failed
      const msg = error.message || "Unknown storage error";
      if (Platform.OS !== 'web') {
        if (msg.includes("403") || msg.includes("row-level security")) {
          Alert.alert("Permission Error", "You need to add an 'INSERT' policy to your community-posts bucket in Supabase.");
        } else if (msg.includes("Bucket not found")) {
          Alert.alert("Setup Error", "The 'community-posts' bucket was not found. Please check the name exactly.");
        } else {
          Alert.alert("Upload Failed", msg);
        }
      } else {
        console.warn("Upload failed:", msg);
        window.alert("Photo upload failed: " + msg);
      }
      return null;
    }
  },
  registerForPushNotificationsAsync: async () => {
    if (Platform.OS === 'web') return;
    
    if (Device.isDevice) {
      const { status: existingStatus } = await NotificationsWrapper.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await NotificationsWrapper.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          console.warn("Project ID not found for push notifications.");
        }
        const pushTokenString = (await NotificationsWrapper.getExpoPushTokenAsync({ projectId }))?.data;
        console.log("Expo Push Token:", pushTokenString);
        
        // Save this token to Supabase if the user is authenticated
        // await supabase.from('users').update({ expo_push_token: pushTokenString }).eq('id', userId);
      } catch (e) {
        console.warn("Error getting push token", e);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }
  },

  /**
   * Shows a system-level notification on Web/PWA
   */
  showSystemNotification: async (notification: Notification) => {
    if (Platform.OS !== 'web' || !('Notification' in window)) return;

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }

    // Use service worker for better background support if available
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.showNotification(notification.title, {
            body: notification.message,
            icon: '/logo/mytroskigo.png',
            badge: '/logo/mytroskigo_favicon.png',
            data: { url: '/(tabs)/communitypost', id: notification.id },
            vibrate: [200, 100, 200],
            tag: 'community-alert'
          } as any);
          return;
        }
      } catch (e) {
        console.warn('Failed to get service worker registration', e);
      }
    }
    
    // Fallback to simple Notification if SW is not ready or fails
    new Notification(notification.title, {
      body: notification.message,
      icon: '/logo/mytroskigo.png',
    });
  },

  deleteCategoryNotifications: async (category: 'community' | 'official') => {
    try {
      const all = await NotificationService.getNotifications();
      const targetTypes = category === 'official' 
        ? ["official", "system", "news_update"] 
        : ["community_post"];
      
      const toDelete = all.filter(n => targetTypes.includes(n.type));
      
      const deletedJson = await AsyncStorage.getItem(DELETED_NOTIFICATIONS_KEY);
      let deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
      
      const newIds = toDelete.map(n => n.id).filter(id => !deletedIds.includes(id));
      if (newIds.length === 0) return;
      
      const updatedDeleted = [...deletedIds, ...newIds].slice(-500); 
      await AsyncStorage.setItem(DELETED_NOTIFICATIONS_KEY, JSON.stringify(updatedDeleted));
      
      const localJson = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (localJson) {
        const localList: Notification[] = JSON.parse(localJson);
        const updatedLocal = localList.filter(n => !targetTypes.includes(n.type));
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedLocal));
      }

      NotificationService.notify();
    } catch (e) {
      console.error(`Error deleting ${category} notifications`, e);
    }
  },
};
