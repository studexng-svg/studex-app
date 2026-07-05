import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert,
  ScrollView, Modal, Pressable, Image,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api, fetchWithAuth } from "@/lib/api";
import { S, StatusBadge } from "./_shared";

function ProofModal({ order, onSuccess, onClose }: {
  order: any; onSuccess: () => void; onClose: () => void;
}) {
  const [photos, setPhotos] = useState<{ uri: string; mimeType: string; filename: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to upload proof.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      if (photos.length < 2)
        setPhotos(prev => [...prev, { uri: a.uri, mimeType: a.mimeType ?? "image/jpeg", filename: a.fileName ?? "proof.jpg" }]);
    }
  };

  const remove = (i: number) => setPhotos(prev => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (photos.length === 0) { setError("Upload at least one delivery photo."); return; }
    setSubmitting(true); setError("");
    try {
      const fd = new FormData();
      fd.append("proof_1", { uri: photos[0].uri, type: photos[0].mimeType, name: photos[0].filename } as any);
      if (photos[1]) fd.append("proof_2", { uri: photos[1].uri, type: photos[1].mimeType, name: photos[1].filename } as any);
      const res = await fetchWithAuth(`/api/orders/orders/${order.id}/mark-complete/`, { method: "PATCH", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail ?? "Could not mark order complete."); return;
      }
      onSuccess();
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => !submitting && onClose()} />
      <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, position: "absolute", bottom: 0, left: 0, right: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Text style={{ flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold", color: "#1c1917" }}>Proof of Delivery</Text>
          <TouchableOpacity onPress={onClose} disabled={submitting} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 13, color: "#6b7280", fontFamily: "DMSans_400Regular", marginBottom: 16 }}>
          Upload 1–2 photos showing the delivered item. This protects you if a dispute is filed.
        </Text>

        {!!error && (
          <View style={{ backgroundColor: "#fef2f2", borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <Text style={{ fontSize: 13, color: "#dc2626", fontFamily: "DMSans_400Regular" }}>{error}</Text>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          {[0, 1].map(idx => (
            <View key={idx} style={{ flex: 1 }}>
              {photos[idx] ? (
                <View style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
                  <Image source={{ uri: photos[idx].uri }} style={{ width: "100%", aspectRatio: 1 }} resizeMode="cover" />
                  <TouchableOpacity onPress={() => remove(idx)} disabled={submitting}
                    style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={pick} disabled={submitting || (idx === 1 && photos.length === 0)} activeOpacity={0.75}
                  style={{ aspectRatio: 1, borderWidth: 2, borderStyle: "dashed", borderColor: "#d1d5db", borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 6, opacity: idx === 1 && photos.length === 0 ? 0.4 : 1 }}>
                  <Ionicons name={idx === 0 ? "camera-outline" : "image-outline"} size={24} color="#9ca3af" />
                  <Text style={{ fontSize: 11, color: "#9ca3af", fontFamily: "DMSans_500Medium" }}>{idx === 0 ? "Photo 1 *" : "Photo 2"}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity onPress={onClose} disabled={submitting} activeOpacity={0.8}
            style={{ flex: 1, paddingVertical: 14, backgroundColor: "#f3f4f6", borderRadius: 9999, alignItems: "center" }}>
            <Text style={{ fontSize: 14, color: "#374151", fontFamily: "DMSans_600SemiBold" }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={submit} disabled={submitting || photos.length === 0} activeOpacity={0.87}
            style={{ flex: 1, paddingVertical: 14, backgroundColor: "#0D9488", borderRadius: 9999, alignItems: "center", opacity: submitting || photos.length === 0 ? 0.5 : 1 }}>
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={{ fontSize: 14, color: "#fff", fontFamily: "DMSans_600SemiBold" }}>Mark as Delivered</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function VendorOrdersPage() {
  const router = useRouter();
  const [orders,        setOrders]        = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [proofOrder,    setProofOrder]    = useState<any | null>(null);
  const [chatLoading,   setChatLoading]   = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any>("/api/orders/orders/?role=seller");
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setOrders(list.filter((o: any) => !["completed", "cancelled"].includes(o.status)));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMessageBuyer = async (order: any) => {
    setChatLoading(order.id);
    try {
      const conv = await api.post<any>("/api/chat/conversations/for-order/", { order_id: order.id });
      router.push(`/chat/${conv.id}` as any);
    } catch { Alert.alert("Error", "Could not open conversation."); }
    finally { setChatLoading(null); }
  };

  if (loading) return <ActivityIndicator color="#0D9488" style={{ marginTop: 48 }} />;

  return (
    <>
      {proofOrder && (
        <ProofModal
          order={proofOrder}
          onSuccess={() => { setProofOrder(null); load(); }}
          onClose={() => setProofOrder(null)}
        />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16, paddingTop: 20 }}>
        <Text style={S.sectionLabel}>TRACK</Text>
        <Text style={{ fontSize: 26, fontFamily: "DMSans_700Bold", color: "#1c1917", marginTop: 2 }}>Active Orders</Text>
        <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 2, marginBottom: 18 }}>
          {orders.length} active
        </Text>

        {orders.length === 0 ? (
          <View style={S.emptyState}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#f0fdfa", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Ionicons name="bag-outline" size={36} color="#0D9488" />
            </View>
            <Text style={{ fontSize: 15, color: "#9ca3af", fontFamily: "DMSans_400Regular" }}>No active orders</Text>
          </View>
        ) : orders.map(order => (
          <View key={order.id} style={S.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={S.cardTitle} numberOfLines={1}>{order.listing?.title ?? order.listing_title ?? "Order"}</Text>
                <Text style={S.cardSub}>#{order.reference}</Text>
              </View>
              <StatusBadge status={order.status} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <View>
                <Text style={S.cardMeta}>Buyer</Text>
                <Text style={S.cardVal}>{order.buyer ?? order.buyer_username}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={S.cardMeta}>Order total</Text>
                <Text style={S.cardVal}>₦{Number(order.amount ?? order.total_price ?? 0).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={S.cardMeta}>Your payout</Text>
                <Text style={[S.cardVal, { color: "#0D9488" }]}>₦{Number(order.listing?.price ?? order.amount ?? 0).toLocaleString()}</Text>
              </View>
            </View>
            {order.delivery_location ? (
              <View style={S.locationRow}>
                <Ionicons name="location-outline" size={12} color="#0D9488" />
                <Text style={S.locationText}>{order.delivery_location}</Text>
              </View>
            ) : null}
            {order.status === "paid" && (
              <TouchableOpacity onPress={() => setProofOrder(order)} activeOpacity={0.87}
                style={[S.cardActionBtn, { marginTop: 10, backgroundColor: "#0D9488" }]}>
                <Text style={S.cardActionBtnText}>Mark as Delivered</Text>
              </TouchableOpacity>
            )}
            {order.status === "seller_completed" && (
              <View style={S.waitingBadge}>
                <Text style={{ fontSize: 13, color: "#0D9488", fontFamily: "DMSans_600SemiBold" }}>Waiting for buyer to confirm</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => handleMessageBuyer(order)} disabled={chatLoading === order.id} activeOpacity={0.8}
              style={{ marginTop: 10, paddingVertical: 10, borderWidth: 1, borderColor: "#5eead4", borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {chatLoading === order.id
                ? <ActivityIndicator size="small" color="#0D9488" />
                : <><Ionicons name="chatbubble-outline" size={15} color="#0D9488" /><Text style={{ fontSize: 13, color: "#0D9488", fontFamily: "DMSans_600SemiBold" }}>Message Buyer</Text></>
              }
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </>
  );
}
