import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/lib/api";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface Order {
  id: number;
  reference: string;
  listing: {
    id: number;
    title: string;
    vendor: { id: number; username: string; business_name?: string | null };
  } | null;
  amount: string | number;
  created_at: string;
  paid_at?: string | null;
  status: "pending" | "paid" | "seller_completed" | "completed" | "disputed" | "cancelled";
  current_status?: string;
  delivery_location?: string | null;
}

// ─────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────
function getStatusStyle(status: string) {
  switch (status) {
    case "pending":
      return { bg: "#fef3c7", text: "#d97706", label: "Pending Payment" };
    case "paid":
      return { bg: "#fef3c7", text: "#d97706", label: "In Progress" };
    case "seller_completed":
      return { bg: "#dbeafe", text: "#2563eb", label: "Ready to Confirm" };
    case "completed":
      return { bg: "#dcfce7", text: "#16a34a", label: "Completed" };
    case "disputed":
      return { bg: "#fee2e2", text: "#dc2626", label: "Disputed" };
    case "cancelled":
      return { bg: "#fee2e2", text: "#dc2626", label: "Cancelled" };
    default:
      return { bg: "#f5f5f4", text: "#6b7280", label: status };
  }
}

// ─────────────────────────────────────────
// Divider
// ─────────────────────────────────────────
function Divider() {
  return <View style={{ height: 1, backgroundColor: "#f5f5f4", marginVertical: 14 }} />;
}

// ─────────────────────────────────────────
// Screen
// ─────────────────────────────────────────
export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [canReview, setCanReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    api.get<Order>(`/api/orders/orders/${id}/`)
      .then(async data => {
        setOrder(data);
        if (data.status === "completed") {
          try {
            const rv = await api.get<{ can_review: boolean }>(
              `/api/reviews/reviews/can-review/${id}/`
            );
            if (rv.can_review) setCanReview(true);
          } catch {}
        }
      })
      .catch(err => {
        if (err?.message?.includes("404") || err?.message?.includes("Not found")) {
          setNotFound(true);
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleSubmitReview() {
    setReviewLoading(true);
    setReviewError("");
    try {
      await api.post("/api/reviews/reviews/", {
        order: Number(id),
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewSuccess(true);
      setCanReview(false);
    } catch (err: any) {
      setReviewError(err.message || "Failed to submit review.");
    } finally {
      setReviewLoading(false);
    }
  }

  function handleConfirm() {
    Alert.alert(
      "Confirm Service Received?",
      "Only confirm if the vendor delivered the service. This releases the payment.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setConfirming(true);
            try {
              await api.post(`/api/orders/orders/${id}/confirm/`);
              setOrder(prev => prev ? { ...prev, status: "completed" } : null);
            } catch {
              Alert.alert("Error", "Could not confirm. Please try again.");
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={{ position: "absolute", top: 56, left: 16, zIndex: 10 }}
        >
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center",
            shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
          }}>
            <Ionicons name="arrow-back" size={20} color="#1c1917" />
          </View>
        </TouchableOpacity>
        <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 160 }} />
      </View>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (notFound || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{
          backgroundColor: "#ffffff", borderRadius: 20, padding: 32,
          alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
        }}>
          <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#1c1917", marginTop: 12, marginBottom: 6 }}>
            Order Not Found
          </Text>
          <Text style={{ fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 24 }}>
            This order doesn't exist or you don't have access to it.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            style={{ backgroundColor: "#0D9488", borderRadius: 9999, paddingVertical: 12, paddingHorizontal: 28 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Derived state ─────────────────────────────────────────────────────────────
  const s = getStatusStyle(order.status);
  const amount = parseFloat(String(order.amount));
  const dateLabel = new Date(order.paid_at || order.created_at).toLocaleString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const vendorName = order.listing?.vendor?.business_name || order.listing?.vendor?.username || "";
  const isCancelled = order.status === "cancelled" || order.current_status === "cancelled";
  const isCompleted = order.status === "completed";
  const isSellerCompleted = order.status === "seller_completed";
  const canConfirm = order.status === "paid" || isSellerCompleted;
  const isPendingOrPaid = order.status === "pending" || order.status === "paid";

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={{
        paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: "#F5F5F5",
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center",
            shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#1c1917" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#1c1917" }}>Order Detail</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Status notice ───────────────────────────────────────────────── */}
        {isCancelled && (
          <View style={{
            backgroundColor: "#fef2f2", borderRadius: 14, padding: 16,
            flexDirection: "row", gap: 12, marginBottom: 12,
            borderWidth: 1, borderColor: "#fecaca",
          }}>
            <Ionicons name="close-circle-outline" size={20} color="#dc2626" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#7f1d1d" }}>Order Cancelled</Text>
              <Text style={{ fontSize: 12, color: "#b91c1c", marginTop: 2 }}>
                This order was cancelled. Contact support if you need help.
              </Text>
            </View>
          </View>
        )}

        {isSellerCompleted && (
          <View style={{
            backgroundColor: "#fffbeb", borderRadius: 14, padding: 16,
            flexDirection: "row", gap: 12, marginBottom: 12,
            borderWidth: 1, borderColor: "#fde68a",
          }}>
            <Ionicons name="time-outline" size={20} color="#d97706" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#78350f" }}>Awaiting Your Confirmation</Text>
              <Text style={{ fontSize: 12, color: "#92400e", marginTop: 2 }}>
                The vendor has delivered your order — please confirm below to release their payment.
              </Text>
            </View>
          </View>
        )}

        {isCompleted && (
          <View style={{
            backgroundColor: "#f0fdf4", borderRadius: 14, padding: 16,
            flexDirection: "row", gap: 12, marginBottom: 12,
            borderWidth: 1, borderColor: "#bbf7d0",
          }}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#14532d" }}>Order Completed</Text>
              <Text style={{ fontSize: 12, color: "#15803d", marginTop: 2 }}>
                The vendor will receive their payment shortly.
              </Text>
            </View>
          </View>
        )}

        {/* ── Main info card ──────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: "#ffffff", borderRadius: 16, padding: 20, marginBottom: 12,
          shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 }, elevation: 2,
        }}>
          {/* ORDER # label + status chip */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#0D9488", letterSpacing: 2, textTransform: "uppercase" }}>
                Order #{order.reference || order.id}
              </Text>
              <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{dateLabel}</Text>
            </View>
            <View style={{
              backgroundColor: s.bg, borderRadius: 9999,
              paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: s.text }}>{s.label}</Text>
            </View>
          </View>

          <Divider />

          {/* Listing item row */}
          {order.listing && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <View style={{
                width: 60, height: 60, borderRadius: 8,
                backgroundColor: "#f0fdfa", alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="bag-outline" size={26} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#1c1917" }} numberOfLines={2}>
                  {order.listing.title}
                </Text>
                {vendorName ? (
                  <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    by @{vendorName}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {/* Delivery location */}
          {order.delivery_location ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Ionicons name="location-outline" size={16} color="#0D9488" />
              <Text style={{ fontSize: 13, color: "#6b7280", flex: 1 }}>{order.delivery_location}</Text>
            </View>
          ) : null}

          <Divider />

          {/* Total */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#6b7280" }}>Total Paid</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#7C3AED" }}>
              ₦{amount.toLocaleString("en-NG")}
            </Text>
          </View>
        </View>

        {/* ── Actions ─────────────────────────────────────────────────────── */}

        {/* Confirm Service Received */}
        {canConfirm && (
          <TouchableOpacity
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={confirming}
            style={{ marginBottom: 10 }}
          >
            <LinearGradient
              colors={["#0D9488", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 9999, paddingVertical: 16,
                alignItems: "center", flexDirection: "row",
                justifyContent: "center", gap: 8,
              }}
            >
              {confirming
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              }
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {confirming ? "Confirming..." : "Confirm Service Received"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}


        {/* Track Order — pending or in progress */}
        {isPendingOrPaid && (
          <TouchableOpacity
            onPress={() => Alert.alert("Track Order", "Order tracking coming soon.")}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#fff", borderRadius: 9999,
              paddingVertical: 15, alignItems: "center",
              flexDirection: "row", justifyContent: "center", gap: 8,
              borderWidth: 1.5, borderColor: "#0D9488", marginBottom: 10,
            }}
          >
            <Ionicons name="location-outline" size={18} color="#0D9488" />
            <Text style={{ color: "#0D9488", fontWeight: "700", fontSize: 15 }}>Track Order</Text>
          </TouchableOpacity>
        )}

        {/* ── Review form ─────────────────────────────────────────────────── */}
        {isCompleted && canReview && (
          reviewSuccess ? (
            <View style={{
              backgroundColor: "#f0fdfa", borderRadius: 16,
              marginHorizontal: 0, marginBottom: 24, padding: 20,
              alignItems: "center",
            }}>
              <Ionicons name="checkmark-circle" size={48} color="#0D9488" />
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#1c1917", marginTop: 12 }}>
                Review Submitted! ⭐
              </Text>
              <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
                Thanks for rating {vendorName}.
              </Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: "#ffffff", borderRadius: 16,
              marginBottom: 24, padding: 20,
              shadowColor: "#000", shadowOpacity: 0.05,
              shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
            }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#0D9488", letterSpacing: 1 }}>
                LEAVE A REVIEW
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#1c1917", marginTop: 4 }}>
                Rate your experience
              </Text>
              <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>
                How was {vendorName}?
              </Text>

              {/* Stars */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <TouchableOpacity key={i} onPress={() => setReviewRating(i)} activeOpacity={0.7}>
                    <Ionicons
                      name={i <= reviewRating ? "star" : "star-outline"}
                      size={36}
                      color={i <= reviewRating ? "#f59e0b" : "#d1d5db"}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {reviewRating > 0 && (
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#0D9488", marginTop: 6, textAlign: "center" }}>
                  {["", "Poor", "Fair", "Good", "Great", "Excellent!"][reviewRating]}
                </Text>
              )}

              <TextInput
                style={{
                  marginTop: 14, backgroundColor: "#f9fafb",
                  borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 12,
                  padding: 14, fontSize: 14, color: "#1c1917",
                  textAlignVertical: "top",
                }}
                multiline
                numberOfLines={4}
                placeholder="Share your experience (optional)..."
                placeholderTextColor="#A8A29E"
                value={reviewComment}
                onChangeText={setReviewComment}
              />

              {!!reviewError && (
                <Text style={{ color: "#EF4444", fontSize: 13, marginTop: 8 }}>{reviewError}</Text>
              )}

              <TouchableOpacity
                onPress={handleSubmitReview}
                disabled={reviewRating === 0 || reviewLoading}
                activeOpacity={0.85}
                style={{ marginTop: 14, opacity: reviewRating === 0 ? 0.5 : 1 }}
              >
                <LinearGradient
                  colors={["#0D9488", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 9999, paddingVertical: 14, alignItems: "center" }}
                >
                  {reviewLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Submit Review</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )
        )}

      </ScrollView>
    </View>
  );
}
