import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { S } from "./_shared";

export default function VendorFeedbackPage() {
  const [rating,      setRating]      = useState(0);
  const [comment,     setComment]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [done,        setDone]        = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rating required", "Please select a star rating before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/reviews/submit-app-feedback/", {
        feedback_type: "vendor",
        rating,
        comment: comment.trim() || undefined,
      });
      setDone(true);
    } catch {
      Alert.alert("Error", "Could not submit feedback. Please try again.");
    } finally { setSubmitting(false); }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16, paddingTop: 20 }}>
      <Text style={S.sectionLabel}>RATE US</Text>
      <Text style={{ fontSize: 26, fontFamily: "DMSans_700Bold", color: "#1c1917", marginTop: 2 }}>Platform Feedback</Text>
      <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 4, marginBottom: 20 }}>
        Help us build a better marketplace for vendors
      </Text>

      {done ? (
        <View style={[S.card, { marginHorizontal: 0, alignItems: "center", paddingVertical: 36 }]}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
          </View>
          <Text style={{ fontSize: 18, fontFamily: "DMSans_700Bold", color: "#1c1917", marginBottom: 6 }}>Thanks for your feedback!</Text>
          <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular", textAlign: "center" }}>
            Your input helps us improve StudEx for all vendors.
          </Text>
          <TouchableOpacity onPress={() => { setDone(false); setRating(0); setComment(""); }} activeOpacity={0.7} style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 13, color: "#0D9488", fontFamily: "DMSans_600SemiBold" }}>Submit another</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[S.card, { marginHorizontal: 0 }]}>
          <Text style={{ fontSize: 18, fontFamily: "DMSans_700Bold", color: "#1c1917", marginBottom: 4 }}>How's selling on StudEx?</Text>
          <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginBottom: 16 }}>Your feedback helps us improve the platform</Text>

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            {[1,2,3,4,5].map(i => (
              <TouchableOpacity key={i} onPress={() => setRating(i)} activeOpacity={0.7}>
                <Ionicons name={i <= rating ? "star" : "star-outline"} size={32} color={i <= rating ? "#f59e0b" : "#d1d5db"} />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="What can we improve for vendors? (optional)"
            placeholderTextColor="#9ca3af"
            multiline numberOfLines={4}
            style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, fontSize: 13, fontFamily: "DMSans_400Regular", color: "#1c1917", minHeight: 100, textAlignVertical: "top", marginBottom: 20 }}
          />

          <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.87}
            style={[S.gradBtn, { backgroundColor: "#0D9488" }]}>
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={S.gradBtnText}>Submit Feedback</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
