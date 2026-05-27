import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { api } from "@/lib/api";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TABS = [
  { name: "index",   label: "Home",     icon: "home-outline"       as const, active: "home"       as const },
  { name: "search",  label: "Shop",     icon: "grid-outline"       as const, active: "grid"       as const },
  { name: "cart",    label: "Cart",     icon: "cart-outline"       as const, active: "cart"       as const },
  { name: "chat",    label: "Messages", icon: "chatbubble-outline" as const, active: "chatbubble" as const },
  { name: "profile", label: "Account",  icon: "person-outline"     as const, active: "person"     as const },
];

function FloatingTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const cartCount = useCartStore().getItemCount();
  const bottomPad = (insets.bottom ?? 0) + 8;
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const data = await api.get<any>("/api/chat/conversations/");
        const convs: any[] = data.results ?? data;
        const total = convs.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
        setUnreadMessages(total);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <View style={styles.pill}>
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const tab = TABS.find(t => t.name === route.name);
            if (!tab) return null;

            const isActive  = state.index === index;
            const isCart    = route.name === "cart";
            const isChat    = route.name === "chat";
            const showBadge = (isCart && cartCount > 0) || (isChat && unreadMessages > 0);
            const badgeCount = isCart ? cartCount : unreadMessages;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented) navigation.navigate(route.name as never);
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.72}
                style={styles.tabItem}
              >
                <View>
                  <Ionicons
                    name={isActive ? tab.active : tab.icon}
                    size={24}
                    color={isActive ? "#0D9488" : "rgba(120,113,108,0.55)"}
                  />
                  {showBadge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.label, isActive && styles.labelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
  },
  pill: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(120,113,108,0.55)",
  },
  labelActive: {
    color: "#0D9488",
  },
});

export default function TabsLayout() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated]);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index"   />
      <Tabs.Screen name="search"  />
      <Tabs.Screen name="cart"    />
      <Tabs.Screen name="chat"    />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
