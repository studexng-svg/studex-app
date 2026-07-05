import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet,
} from "react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Share, Alert } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";

type TabId = "overview" | "messages" | "bookings" | "listings" | "orders" | "disputes" | "history" | "earnings" | "reviews" | "feedback";

const TABS: { id: TabId; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "overview",  label: "Overview",  icon: "bar-chart-outline"      },
  { id: "messages",  label: "Messages",  icon: "chatbubble-outline"      },
  { id: "bookings",  label: "Bookings",  icon: "calendar-outline"        },
  { id: "listings",  label: "Listings",  icon: "grid-outline"            },
  { id: "orders",    label: "Orders",    icon: "bag-outline"             },
  { id: "disputes",  label: "Disputes",  icon: "alert-circle-outline"    },
  { id: "history",   label: "History",   icon: "time-outline"            },
  { id: "earnings",  label: "Earnings",  icon: "cash-outline"            },
  { id: "reviews",   label: "Reviews",   icon: "star-outline"            },
  { id: "feedback",  label: "Feedback",  icon: "chatbox-outline"         },
];

export default function VendorHubLayout() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const [msgBadge,      setMsgBadge]      = useState(0);
  const [bookingBadge,  setBookingBadge]  = useState(0);
  const [disputeBadge,  setDisputeBadge]  = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    if (!user) { router.replace("/(auth)/login" as any); return; }
    if (!user.is_verified_vendor) { router.replace("/vendor/apply" as any); return; }

    api.get<any>("/api/chat/conversations/").then(d => {
      const list = Array.isArray(d) ? d : (d.results ?? []);
      setMsgBadge(list.reduce((s: number, c: any) => s + (c.unread_count || 0), 0));
    }).catch(() => {});

    api.get<any>("/api/orders/bookings/").then(d => {
      const list = Array.isArray(d) ? d : (d.results ?? []);
      setBookingBadge(list.filter((b: any) => b.vendor_username === user?.username && b.status === "pending").length);
    }).catch(() => {});

    api.get<any>("/api/orders/disputes/").then(d => {
      const list = Array.isArray(d) ? d : (d.results ?? []);
      setDisputeBadge(list.filter((dp: any) => !dp.provider_response && !["resolved", "closed"].includes(dp.status)).length);
    }).catch(() => {});

    api.get<any>("/api/orders/orders/").then(d => {
      const list = Array.isArray(d) ? d : (d.results ?? []);
      setPendingOrders(list.filter((o: any) => ["paid", "confirmed", "pending"].includes(o.status)).length);
    }).catch(() => {});
  }, [user?.username]);

  const badges: Record<TabId, number | undefined> = {
    overview:  undefined,
    messages:  msgBadge   || undefined,
    bookings:  bookingBadge || undefined,
    listings:  undefined,
    orders:    pendingOrders || undefined,
    disputes:  disputeBadge || undefined,
    history:   undefined,
    earnings:  undefined,
    reviews:   undefined,
    feedback:  undefined,
  };

  const seg       = pathname.split("/")[2];
  const activeId: TabId = (seg as TabId) || "overview";

  const goTo = (id: TabId) => {
    const path = id === "overview" ? "/vendor-hub" : `/vendor-hub/${id}`;
    router.push(path as any);
  };

  if (!user?.is_verified_vendor) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      {/* Clean white header */}
      <View style={{ backgroundColor: "#ffffff", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0ef" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 10, padding: 2 }}>
            <Ionicons name="arrow-back" size={20} color="#1c1917" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={{ marginRight: 12, padding: 2 }}>
            <Ionicons name="menu-outline" size={22} color="#1c1917" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: "#9ca3af", fontFamily: "DMSans_500Medium", letterSpacing: 1.5, textTransform: "uppercase" }}>Vendor Hub</Text>
            <Text style={{ fontSize: 16, color: "#1c1917", fontFamily: "DMSans_700Bold", marginTop: 1 }}>@{user?.username}</Text>
          </View>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#172554", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
            {user?.profile_image
              ? <Image source={{ uri: user.profile_image }} style={{ width: 38, height: 38 }} resizeMode="cover" />
              : <Text style={{ color: "#ffffff", fontSize: 15, fontFamily: "DMSans_700Bold" }}>{(user?.username?.[0] ?? "?").toUpperCase()}</Text>
            }
          </View>
        </View>
      </View>

      {/* Scrollable tab bar */}
      <View style={{ backgroundColor: "#ffffff", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e7e5e4" }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {TABS.map(tab => {
            const active = activeId === tab.id;
            const badge  = badges[tab.id];
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => goTo(tab.id)}
                activeOpacity={0.75}
                style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: active ? "#0D9488" : "transparent" }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Ionicons name={tab.icon} size={15} color={active ? "#0D9488" : "#9ca3af"} />
                  <Text style={{ fontSize: 13, fontFamily: active ? "DMSans_700Bold" : "DMSans_500Medium", color: active ? "#0D9488" : "#9ca3af" }}>
                    {tab.label}
                  </Text>
                  {badge && badge > 0 ? (
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#fff", fontSize: 9, fontFamily: "DMSans_700Bold" }}>{badge > 9 ? "9+" : badge}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Share strip */}
      {user?.username && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f0fdfa", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#d1fae5", paddingHorizontal: 16, paddingVertical: 10 }}>
          <Ionicons name="link-outline" size={14} color="#0D9488" />
          <Text style={{ flex: 1, color: "#6b7280", fontSize: 12, fontFamily: "DMSans_400Regular" }} numberOfLines={1}>
            studex.com.ng/vendor/{user.username}
          </Text>
          <TouchableOpacity
            onPress={async () => {
              await Clipboard.setStringAsync(`https://studex.com.ng/vendor/${user.username}`);
              Alert.alert("Copied!", "Your store link has been copied.");
            }}
            activeOpacity={0.75}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#0D9488", borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 5 }}
          >
            <Ionicons name="copy-outline" size={13} color="#0D9488" />
            <Text style={{ fontSize: 12, color: "#0D9488", fontFamily: "DMSans_600SemiBold" }}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Share.share({ message: `Check out my store on StudEx: https://studex.com.ng/vendor/${user?.username}` })}
            activeOpacity={0.75}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "#0D9488" }}>
              <Ionicons name="share-social-outline" size={13} color="#fff" />
              <Text style={{ fontSize: 12, color: "#fff", fontFamily: "DMSans_600SemiBold" }}>Share</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Page content */}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}
