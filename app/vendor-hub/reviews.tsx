import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { S } from "./_shared";

export default function VendorReviewsPage() {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await api.get<any>(`/api/reviews/reviews/?vendor=${user.id}`);
      setReviews(Array.isArray(data) ? data : (data.results ?? []));
    } catch {} finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const avg = reviews.length ? reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length : 0;

  if (loading) return <ActivityIndicator color="#0D9488" style={{ marginTop: 48 }} />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16, paddingTop: 20 }}>
      <Text style={S.sectionLabel}>FEEDBACK</Text>
      <Text style={{ fontSize: 26, fontFamily: "DMSans_700Bold", color: "#1c1917", marginTop: 2, marginBottom: reviews.length ? 4 : 20 }}>Reviews</Text>

      {reviews.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Text style={{ fontSize: 28, fontFamily: "DMSans_700Bold", color: "#1c1917" }}>{avg.toFixed(1)}</Text>
          <View>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {[1,2,3,4,5].map(i => (
                <Ionicons key={i} name={i <= Math.round(avg) ? "star" : "star-outline"} size={16} color="#f59e0b" />
              ))}
            </View>
            <Text style={{ fontSize: 12, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 2 }}>
              {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      )}

      {reviews.length === 0 ? (
        <View style={S.emptyState}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#f0fdfa", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Ionicons name="star-outline" size={36} color="#0D9488" />
          </View>
          <Text style={{ fontSize: 15, color: "#9ca3af", fontFamily: "DMSans_400Regular", textAlign: "center" }}>
            No reviews yet. Complete orders to get rated!
          </Text>
        </View>
      ) : reviews.map(review => (
        <View key={review.id} style={[S.card, { marginHorizontal: 0, marginBottom: 10 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#0D9488", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 14 }}>
                  {(review.reviewer_username?.[0] ?? "?").toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 14, fontFamily: "DMSans_600SemiBold", color: "#1c1917" }}>
                  {review.reviewer_username}
                </Text>
                {review.listing_title ? (
                  <Text style={{ fontSize: 12, color: "#9ca3af", fontFamily: "DMSans_400Regular" }} numberOfLines={1}>
                    {review.listing_title}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={{ flexDirection: "row", gap: 2 }}>
                {[1,2,3,4,5].map(i => (
                  <Ionicons key={i} name={i <= review.rating ? "star" : "star-outline"} size={13} color="#f59e0b" />
                ))}
              </View>
              {review.created_at ? (
                <Text style={{ fontSize: 11, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 2 }}>
                  {new Date(review.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              ) : null}
            </View>
          </View>
          {review.comment ? (
            <Text style={{ fontSize: 13, color: "#44403c", fontFamily: "DMSans_400Regular", lineHeight: 20 }}>
              {review.comment}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}
