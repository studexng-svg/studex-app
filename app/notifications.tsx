import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Modal, Linking,
} from "react-native";
import { useEffect, useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string;
  created_at: string;
}

interface NotifIconDef {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  bg: string;
}

function getNotifIcon(type: string): NotifIconDef {
  switch (type) {
    case "seller_approved":
    case "vendor_approved":
      return { name: "checkmark-circle",   color: "#16a34a", bg: "#dcfce7" };
    case "seller_rejected":
      return { name: "close-circle",       color: "#dc2626", bg: "#fee2e2" };
    case "seller_revoked":
    case "vendor_revoked":
      return { name: "warning",            color: "#d97706", bg: "#fef3c7" };
    case "new_booking_request":
      return { name: "calendar",           color: "#0D9488", bg: "#CCFBF1" };
    case "booking_confirmed":
      return { name: "checkmark-circle",   color: "#0D9488", bg: "#CCFBF1" };
    case "booking_cancelled":
      return { name: "ban",                color: "#dc2626", bg: "#fee2e2" };
    case "booking_paid":
    case "payment_received":
      return { name: "cash",               color: "#16a34a", bg: "#dcfce7" };
    case "booking_reminder_5min":
      return { name: "alarm",              color: "#d97706", bg: "#fef3c7" };
    case "booking_time_now":
      return { name: "notifications",      color: "#7C3AED", bg: "#ede9fe" };
    case "order_completed":
      return { name: "cube",               color: "#16a34a", bg: "#dcfce7" };
    case "order_confirmed":
      return { name: "bag-handle",         color: "#0D9488", bg: "#CCFBF1" };
    case "listing_approved":
      return { name: "pricetag",           color: "#0D9488", bg: "#CCFBF1" };
    case "new_listing":
      return { name: "storefront",         color: "#7C3AED", bg: "#ede9fe" };
    case "vendor_application":
      return { name: "document-text",      color: "#2563eb", bg: "#dbeafe" };
    case "message":
      return { name: "chatbubble",         color: "#0D9488", bg: "#CCFBF1" };
    default:
      return { name: "notifications",      color: "#6b7280", bg: "#f5f5f4" };
  }
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} days ago`;
  return new Date(dateString).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function NotificationsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isLoading, setIsLoading]         = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showModal, setShowModal]         = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = async () => {
    try {
      const data = await api.get<{ notifications: Notification[]; unread_count: number }>(
        "/api/notifications/"
      );
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      await api.post("/api/notifications/read-all/", {});
      await fetchNotifications();
    } catch {}
    setMarkingAllRead(false);
  };

  const handleNotificationPress = async (n: Notification) => {
    if (!n.is_read) {
      try {
        await api.post(`/api/notifications/${n.id}/read/`, {});
      } catch {}
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setSelectedNotification({ ...n, is_read: true });
    setShowModal(true);
  };

  const canNavigate = (url: string) =>
    !!url && !url.includes("seller") && !url.includes("auth");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF8F0" }}>

      {/* ── Detail Modal ── */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: "#ffffff",
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 40,
          }}>
            {/* Modal header */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {(() => {
                const ic = getNotifIcon(selectedNotification?.type ?? "");
                return (
                  <View style={{
                    width: 48, height: 48, borderRadius: 14,
                    backgroundColor: ic.bg,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name={ic.name} size={26} color={ic.color} />
                  </View>
                );
              })()}
              <Text style={{
                flex: 1, marginLeft: 12,
                fontSize: 18, fontWeight: "800", color: "#1c1917",
              }}>
                {selectedNotification?.title}
              </Text>
            </View>

            {/* Message */}
            <Text style={{ fontSize: 15, color: "#6b7280", lineHeight: 22, marginTop: 16 }}>
              {selectedNotification?.message}
            </Text>

            {/* Timestamp */}
            <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
              {selectedNotification ? formatFullDate(selectedNotification.created_at) : ""}
            </Text>

            {/* Go There */}
            {selectedNotification && canNavigate(selectedNotification.action_url) && (
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  Linking.openURL(selectedNotification.action_url);
                }}
                activeOpacity={0.85}
                style={{ marginTop: 20 }}
              >
                <LinearGradient
                  colors={["#0D9488", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 9999, paddingVertical: 14, alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Go There</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Close */}
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              activeOpacity={0.7}
              style={{
                marginTop: 10,
                borderWidth: 1, borderColor: "#E7E5E4",
                borderRadius: 9999, paddingVertical: 12,
              }}
            >
              <Text style={{ color: "#6b7280", fontWeight: "600", textAlign: "center" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Header ── */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
      }}>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: "800", color: "#1c1917" }}>
          Notifications
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} disabled={markingAllRead} activeOpacity={0.7}>
            {markingAllRead
              ? <ActivityIndicator size="small" color="#0D9488" />
              : <Text style={{ fontSize: 13, fontWeight: "600", color: "#0D9488" }}>Mark all read</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* ── Loading ── */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : notifications.length === 0 ? (
        /* ── Empty state ── */
        <View style={{ flex: 1, alignItems: "center", paddingTop: 80 }}>
          <Ionicons name="notifications-outline" size={64} color="#E7E5E4" />
          <Text style={{ fontSize: 16, color: "#6b7280", marginTop: 12 }}>No notifications yet</Text>
        </View>
      ) : (
        /* ── List ── */
        <FlatList
          data={notifications}
          keyExtractor={n => String(n.id)}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: n }) => (
            <TouchableOpacity
              onPress={() => handleNotificationPress(n)}
              activeOpacity={0.85}
              style={{
                backgroundColor: n.is_read ? "#ffffff" : "#f0fdfa",
                borderColor: n.is_read ? "#f5f5f4" : "#99f6e4",
                borderWidth: 1,
                borderRadius: 14,
                marginHorizontal: 16,
                marginBottom: 8,
                padding: 14,
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              {/* Icon tile */}
              {(() => {
                const ic = getNotifIcon(n.type);
                return (
                  <View style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: ic.bg,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name={ic.name} size={22} color={ic.color} />
                  </View>
                );
              })()}

              {/* Content */}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <Text style={{
                    flex: 1, fontWeight: "700", fontSize: 14, color: "#1c1917",
                  }}>
                    {n.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>
                    {timeAgo(n.created_at)}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }} numberOfLines={2}>
                  {n.message}
                </Text>
              </View>

              {/* Right indicators */}
              <View style={{ marginLeft: 8, marginTop: 4 }}>
                {!n.is_read
                  ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#0D9488" }} />
                  : n.action_url
                    ? <Ionicons name="open-outline" size={14} color="#9ca3af" />
                    : null
                }
              </View>
            </TouchableOpacity>
          )}
        />
      )}

    </SafeAreaView>
  );
}
