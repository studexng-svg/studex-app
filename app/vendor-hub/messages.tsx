import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Image } from "react-native";
import { ScrollView } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { S } from "./_shared";

export default function VendorMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<any>("/api/chat/conversations/")
      .then(d => setConversations(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator color="#0D9488" style={{ marginTop: 48 }} />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16, paddingTop: 20 }}>
      <Text style={S.sectionLabel}>MESSAGES</Text>
      <Text style={{ fontSize: 26, fontFamily: "DMSans_700Bold", color: "#1c1917", marginTop: 2, marginBottom: 4 }}>Conversations</Text>
      <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginBottom: 18 }}>
        {conversations.length} {conversations.length === 1 ? "chat" : "chats"}
      </Text>

      <View style={S.card}>
        {conversations.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Ionicons name="chatbubble-outline" size={40} color="#e7e5e4" />
            <Text style={{ fontSize: 14, color: "#9ca3af", marginTop: 10, fontFamily: "DMSans_400Regular" }}>No conversations yet</Text>
          </View>
        ) : conversations.map((conv, index) => {
          const pic = conv.other_user?.profile_picture ?? conv.other_user?.profile_image;
          const initial = (conv.buyer_username?.[0] ?? conv.other_user?.username?.[0] ?? "?").toUpperCase();
          const unread = conv.unread_count > 0;
          const isLast = index === conversations.length - 1;
          return (
            <TouchableOpacity
              key={conv.id}
              onPress={() => router.push(`/chat/${conv.id}` as any)}
              activeOpacity={0.75}
              style={[
                { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
                !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0ef" },
              ]}
            >
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#0D9488", alignItems: "center", justifyContent: "center", marginRight: 12, overflow: "hidden" }}>
                {pic
                  ? <Image source={{ uri: pic }} style={{ width: 42, height: 42 }} resizeMode="cover" />
                  : <Text style={{ color: "#fff", fontSize: 16, fontFamily: "DMSans_700Bold" }}>{initial}</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: "DMSans_700Bold", color: "#1c1917" }}>
                  {conv.other_user?.username}
                </Text>
                <Text style={{ fontSize: 12, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 1 }} numberOfLines={1}>
                  {conv.listing_title || "Service inquiry"}
                </Text>
              </View>
              {unread ? (
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#0D9488", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontFamily: "DMSans_700Bold" }}>
                    {conv.unread_count > 9 ? "9+" : conv.unread_count}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
