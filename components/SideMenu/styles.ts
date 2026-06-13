import { ms } from '../../lib/metrics';
import React from "react";
import { StyleSheet, Platform, Dimensions } from
"react-native";

const { width: windowWidth } = Dimensions.get("window");
export const width= Platform.OS === 'web' ? Math.min(windowWidth, 480) : windowWidth;

export const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row", justifyContent: "center" },
  drawerContainer: { width: "100%", maxWidth: ms(480), height: "100%", flexDirection: "row", justifyContent: "flex-start" },
  backdrop: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "#000" },
  drawer: { 
    width: width * 0.75, 
    height: "100%",
    ...Platform.select({
      web: { boxShadow: "2px 0px 5px rgba(0, 0, 0, 0.25)" },
      default: { shadowColor: "#000", shadowOffset: { width: ms(2), height: 0 }, shadowOpacity: 0.25, shadowRadius: ms(5), elevation: 5 },
    }),
  },
  header: { height: ms(180), position: "relative", borderBottomRightRadius: 30, overflow: "hidden" },
  headerImageBackground: { width: "100%", height: "100%" },
  headerGradient: { flex: 1, justifyContent: "flex-end", padding: ms(24) },
  headerContent: {},
  appName: { 
    fontSize: ms(32), 
    fontWeight: "bold", 
    color: "#fff", 
    marginBottom: ms(2),
    ...Platform.select({
      web: { textShadow: "0px 1px 4px rgba(0, 0, 0, 0.4)" },
      default: { textShadowColor: "rgba(0, 0, 0, 0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    }),
  },
  appSubtitle: { fontSize: ms(18), fontWeight: "500", color: "rgba(255, 255, 255, 0.9)" },
  content: { flex: 1, paddingTop: ms(24), paddingHorizontal: ms(16) },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: ms(16), borderBottomWidth: 1 },
  menuItemLeft: { flexDirection: "row", alignItems: "center" },
  menuItemText: { marginLeft: ms(16), fontSize: ms(18), fontWeight: "500" },
  divider: { height: ms(24) },
  sectionHeader: { fontSize: ms(16), fontWeight: "600", marginBottom: ms(16), textTransform: "uppercase", letterSpacing: 1 },
  socialRow: { flexDirection: "row", gap: ms(16) },
  socialButton: { 
    width: ms(44), height: ms(44), borderRadius: ms(22), justifyContent: "center", alignItems: "center",
    ...Platform.select({
      web: { boxShadow: "0px 2px 3px rgba(0, 0, 0, 0.1)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: ms(2) }, shadowOpacity: 0.1, shadowRadius: ms(3), elevation: 2 },
    }),
  },
  langBadge: { paddingHorizontal: ms(8), paddingVertical: ms(4), borderRadius: ms(8), minWidth: ms(32), alignItems: 'center', justifyContent: 'center' },
});
