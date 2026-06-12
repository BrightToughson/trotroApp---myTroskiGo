import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ImageStyle, Platform, StyleProp, View } from "react-native";

// Mapping of Ionicons names to Inline SVG paths for Web
const SVG_MAP: Record<string, string> = {
  // Navigation & Core
  "menu-outline":
    '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  "search-outline":
    '<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  search:
    '<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "trash-bin":
    '<path d="M4 7h16M10 11v6m4-6v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "trash-bin-outline":
    '<path d="M4 7h16M10 11v6m4-6v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "home-outline":
    '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  home: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "time-outline":
    '<path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  time: '<path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "notifications-outline":
    '<path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  notifications:
    '<path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "notifications-off-outline":
    '<path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9M10 11l4 4m0-4l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "chevron-forward":
    '<path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "chevron-up":
    '<path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "chevron-down":
    '<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "chevron-down-outline":
    '<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "arrow-back":
    '<path d="M15 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "chevron-back":
    '<path d="M15 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "arrow-forward":
    '<path d="M9 5l7 7-7 7M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "arrow-undo":
    '<path d="M9 13l-4-4m0 0l4-4m-4 4h11a4 4 0 010 8H12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "swap-horizontal":
    '<path d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "download-outline":
    '<path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  add: '<path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  remove: '<path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  "add-circle":
    '<path d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "add-circle-outline":
    '<path d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  card: '<path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "card-outline":
    '<path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "add-square-outline":
    '<rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" /><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  close:
    '<path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  "close-circle":
    '<path d="M12 21a9 9 0 100-18 9 9 0 000 18zM9 9l6 6m0-6l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "ellipsis-vertical":
    '<path d="M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0M12 5m-1 0a1 1 0 102 0 1 1 0 10-2 0M12 19m-1 0a1 1 0 102 0 1 1 0 10-2 0" fill="currentColor"/>',
  "options-outline":
    '<path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "at-outline":
    '<path d="M16 12a4 4 0 11-8 0 4 4 0 018 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-3.141 6.708" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "person-outline":
    '<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  person:
    '<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  bulb: '<path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "checkmark-circle":
    '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "checkmark-circle-outline":
    '<path d="M12 21a9 9 0 100-18 9 9 0 000 18zM9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  checkmark:
    '<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "checkmark-outline":
    '<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "checkmark-sharp":
    '<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "checkmark-done":
    '<path d="M21 7L9 19l-5-5m17-7l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  sparkles:
    '<path d="M5 3L4 6H1l3 2-1 3 3-2 3 2-1-3 3-2H8L7 3 6 6l-1-3zm14 4l-1 3h-3l3 2-1 3 3-2 3 2-1-3 3-2h-3l-1-3zM12 13l-1 3h-3l3 2-1 3 3-2 3 2-1-3 3-2h-3l-1-3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  list: '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  "warning-outline":
    '<path d="M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 18c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  warning:
    '<path d="M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 18c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "alert-circle-outline":
    '<path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "alert-circle":
    '<path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  settings:
    '<path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "settings-outline":
    '<path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  star: '<path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "star-outline":
    '<path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  heart:
    '<path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "heart-outline":
    '<path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "thumbs-up":
    '<path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "thumbs-up-outline":
    '<path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',

  // Logos & Special
  "logo-google": `
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
  `,

  // Profile & Settings
  camera:
    '<path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "camera-outline":
    '<path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "camera-sharp":
    '<path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "image-outline":
    '<path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  funnel:
    '<path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "funnel-outline":
    '<path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  refresh:
    '<path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "shield-checkmark-outline":
    '<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "shield-checkmark":
    '<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "log-out-outline":
    '<path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "trash-outline":
    '<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "lock-closed-outline":
    '<path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "help-outline":
    '<path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',

  // Community & Social
  people:
    '<path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  chatbubble:
    '<path d="M4 4h16v12H8l-4 4V4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "chatbubble-outline":
    '<path d="M4 4h16v12H8l-4 4V4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  chatbubbles:
    '<path d="M7.03 10.75c0-3.176 2.583-5.75 5.75-5.75s5.75 2.574 5.75 5.75c0 1.258-.403 2.413-1.085 3.356l1.246 1.247c.451.45.132 1.218-.504 1.218H14.15l-1.37 1.371a.714.714 0 01-1.01 0l-1.37-1.371h-1.36a5.74 5.74 0 01-2.01-.397M4.25 15c0-2.347 1.912-4.25 4.25-4.25h1.25c.414 0 .75.336.75.75s-.336.75-.75.75h-1.25c-1.519 0-2.75 1.231-2.75 2.75 0 .605.196 1.161.528 1.616l-.804.805c-.21.21-.061.57.236.57H8.5l.891.891a.428.428 0 01-.605.606l-.89-.891H6.04c-.312 0-.468-.377-.247-.598l1.01-1.01c-.13-.393-.203-.814-.203-1.25z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "chatbubbles-outline":
    '<path d="M7.03 10.75c0-3.176 2.583-5.75 5.75-5.75s5.75 2.574 5.75 5.75c0 1.258-.403 2.413-1.085 3.356l1.246 1.247c.451.45.132 1.218-.504 1.218H14.15l-1.37 1.371a.714.714 0 01-1.01 0l-1.37-1.371h-1.36a5.74 5.74 0 01-2.01-.397M4.25 15c0-2.347 1.912-4.25 4.25-4.25h1.25c.414 0 .75.336.75.75s-.336.75-.75.75h-1.25c-1.519 0-2.75 1.231-2.75 2.75 0 .605.196 1.161.528 1.616l-.804.805c-.21.21-.061.57.236.57H8.5l.891.891a.428.428 0 01-.605.606l-.89-.891H6.04c-.312 0-.468-.377-.247-.598l1.01-1.01c-.13-.393-.203-.814-.203-1.25z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  community:
    '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-10V7a4 4 0 00-8 0v4h8zM23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "car-outline":
    '<path d="M19 17h2a1 1 0 001-1v-4a1 1 0 00-1-1h-2.5l-2-4h-5l-2 4H5a1 1 0 00-1 1v4a1 1 0 001 1h2m12 0a2 2 0 10-4 0m-8 0a2 2 0 10-4 0m-4 0h2m12 0h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "chatbubble-ellipses":
    '<path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "chatbubble-ellipses-outline":
    '<path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  cash: '<path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "cash-outline":
    '<path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',

  // Journey Details & Map Interaction
  "location-outline":
    '<path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  location:
    '<path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "bus-outline":
    '<path d="M8 7h8a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2zM6 10h12M8 17h1m4 0h1m-7 4h12M7 11h2m6 0h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  bus: '<path d="M8 7h8a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2zM6 10h12M8 17h1m4 0h1m-7 4h12M7 11h2m6 0h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "walk-outline":
    '<path d="M13.5,2C14.88,2,16,3.12,16,4.5S14.88,7,13.5,7S11,5.88,11,4.5S12.12,2,13.5,2M13.5,24h-2v-7.5l-2.4-3c-0.4-0.5-0.6-1.1-0.6-1.7V6h2v5.8l1.7,2.1L14.3,9c0.3-1.1,1.3-1.9,2.4-1.9H19v2h-1.8l-1.3,4.1l2.1,3.8V24h-2v-5.2l-1.6-3L11.5,13.5V24z" fill="currentColor"/>',
  walk: '<path d="M13.5,2C14.88,2,16,3.12,16,4.5S14.88,7,13.5,7S11,5.88,11,4.5S12.12,2,13.5,2M13.5,24h-2v-7.5l-2.4-3c-0.4-0.5-0.6-1.1-0.6-1.7V6h2v5.8l1.7,2.1L14.3,9c0.3-1.1,1.3-1.9,2.4-1.9H19v2h-1.8l-1.3,4.1l2.1,3.8V24h-2v-5.2l-1.6-3L11.5,13.5V24z" fill="currentColor"/>',
  "navigate-outline":
    '<path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  navigate:
    '<path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "navigate-circle":
    '<path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 8l-2 4 4-2-2-4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  play: '<path d="M5 3l14 9-14 9V3z" fill="currentColor"/>',
  "play-sharp": '<path d="M5 3l14 9-14 9V3z" fill="currentColor"/>',
  "play-circle": '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-2-14.5l6 4.5-6 4.5v-9z" fill="currentColor"/>',
  "play-circle-outline": '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-2-14.5l6 4.5-6 4.5v-9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/>',
  "location-sharp":
    '<path d="M12 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-2c0-3.3-2.7-6-6-6s-6 2.7-6 6c0 4.5 6 11 6 11s6-6.5 6-11z" fill="currentColor"/>',
  "list-outline":
    '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  "layers-outline":
    '<path d="M19 11l-7 3-7-3m14 4l-7 3-7-3M5 7l7 3 7-3-7-3-7 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "locate-outline":
    '<path d="M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  locate:
    '<path d="M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "compass-outline":
    '<path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 8l-2 4 4-2-2-4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  flag: '<path d="M4 15c1.5-1 3.5-1 5 0s3.5 1 5 0 3.5-1 5 0v-10c-1.5-1-3.5-1-5 0s-3.5 1-5 0-3.5-1-5 0v10zM4 22v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  business:
    '<path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m4 0h1m-5 4h1m4 0h1m-5 4h1m4 0h1" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  airplane:
    '<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  medkit:
    '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h4m-2-2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  train:
    '<path d="M7 2a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2H7zm0 14h10l2 3H5l2-3zm2-9h2m2 0h2m-6 4h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',

  // Tutorial Specific
  "map-outline":
    '<path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  map: '<path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "wallet-outline":
    '<path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "radio-outline":
    '<path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3m0 0c.537 0 1.057.046 1.56.134m5.283 3.034l.054.09c2.312 3.712 2.312 8.423 0 12.134l-.054.09m-3.283-3.034c.537 0 1.057.046 1.56.134M12 11c0-3.517 1.009-6.799 2.753-9.571m-2.753 9.571a3 3 0 110-6 3 3 0 010 6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "people-outline":
    '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-10V7a4 4 0 00-8 0v4h8zM23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "stats-chart-outline":
    '<path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "stats-chart":
    '<path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "flash-outline":
    '<path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  flash:
    '<path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "analytics-outline":
    '<path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',

  // Side Bar & Settings
  "mail-outline":
    '<path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "information-circle-outline":
    '<path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "help-circle-outline":
    '<path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "moon-outline":
    '<path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "share-social":
    '<path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "share-social-outline":
    '<path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "share-outline":
    '<path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  pencil:
    '<path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "pencil-outline":
    '<path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  create:
    '<path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "create-outline":
    '<path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  trash:
    '<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  eye: '<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "eye-outline":
    '<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "eye-off":
    '<path d="M13.875 18.825A10.05 10.003 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L4.573 4.572m0 0L19.427 19.427" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "eye-off-outline":
    '<path d="M13.875 18.825A10.05 10.003 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L4.573 4.572m0 0L19.427 19.427" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "log-in":
    '<path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "log-in-outline":
    '<path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "log-out":
    '<path d="M17 16l4-4m0 0l4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "mail-unread":
    '<path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2zM19 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "mail-unread-outline":
    '<path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2zM19 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  calendar:
    '<path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "calendar-outline":
    '<path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "shield-outline":
    '<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "logo-whatsapp":
    '<path d="M12 2C6.48 2 2 6.48 2 12c0 1.74.45 3.37 1.23 4.79L2 22l5.35-1.39A9.95 9.95 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.57 0-3.04-.42-4.32-1.16l-.31-.18-3.19.83.85-3.1-.2-.33A7.95 7.95 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "logo-twitter":
    '<path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',

  // UI Elements & Links
  link: '<path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "link-outline":
    '<path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "open-outline":
    '<path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "trending-up":
    '<path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "newspaper-outline":
    '<path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2zM7 8h5m-5 4h10m-10 4h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  cart: '<path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "globe-outline":
    '<path d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0v-8m0 0H4m8 0h8m-8 0a9 9 0 01-9-9m9 9a9 9 0 009-9M12 3a9 9 0 019 9m-9-9a9 9 0 00-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  globe:
    '<path d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0v-8m0 0H4m8 0h8m-8 0a9 9 0 01-9-9m9 9a9 9 0 009-9M12 3a9 9 0 019 9m-9-9a9 9 0 00-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "document-text-outline": '<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "flag-outline": '<path d="M4 15s1.5-1 5-1 5 2 8 2 4-1 4-1V3s-1.5 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "lock-closed": '<path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" fill="currentColor"/>',
  "pricetag-outline": '<path d="M7 7h.01M19.414 7.586l-6.828 6.828a2 2 0 01-2.828 0l-2.828-2.828a2 2 0 010-2.828l6.828-6.828a2 2 0 011.414-.586H19a2 2 0 012 2v3.758a2 2 0 01-.586 1.414z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  server: '<path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6h4M4 16a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "text-outline": '<path d="M4 6h16M4 12h16M4 18h7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "car": '<path d="M19 17h2a1 1 0 001-1v-4a1 1 0 00-1-1h-2.5l-2-4h-5l-2 4H5a1 1 0 00-1 1v4a1 1 0 001 1h2m12 0a2 2 0 10-4 0m-8 0a2 2 0 10-4 0m-4 0h2m12 0h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "pricetag": '<path d="M7 7h.01M19.414 7.586l-6.828 6.828a2 2 0 01-2.828 0l-2.828-2.828a2 2 0 010-2.828l6.828-6.828a2 2 0 011.414-.586H19a2 2 0 012 2v3.758a2 2 0 01-.586 1.414z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "swap-vertical": '<path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  "git-network": '<path d="M17 6a3 3 0 11-2.9-2h-4.2a3 3 0 110-2h4.2A3 3 0 1117 6zm-7 12a3 3 0 11-2.9-2H6.5v-4h2.6a3 3 0 110-2H6.5V6H5v10H2v2h5zm12 0a3 3 0 11-2.9-2h-4.2a3 3 0 110-2h4.2a3 3 0 112.9 2z" fill="currentColor"/>',
};

interface WebIconProps {
  name: string;
  size: number;
  color: string;
  opacity?: number;
  style?: StyleProp<ImageStyle>;
}

export const WebIcon = ({
  name,
  size = 24,
  color = "#000",
  opacity = 1,
  style,
}: WebIconProps) => {
  const isWeb = Platform.OS === "web";
  const svgPath = isWeb ? SVG_MAP[name] : null;

  if (isWeb && svgPath) {
    // Return an inline SVG for Web
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            justifyContent: "center",
            alignItems: "center",
            opacity,
          },
          style,
        ]}
      >
        <div
          style={{
            width: size,
            height: size,
            color: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          dangerouslySetInnerHTML={{
            __html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${svgPath}</svg>`,
          }}
        />
      </View>
    );
  }

  // Native fallback to standard Ionicons (reliable on iOS/Android)
  return (
    <Ionicons
      name={name as any}
      size={size}
      color={color}
      style={[style as any, { opacity }]}
    />
  );
};
