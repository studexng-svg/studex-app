import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, SafeAreaView,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";

interface Conversation {
  id: number;
  listing_title: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  other_user: { id: number; username: string };
}

export default function ChatListScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const load = () =>
      api.get<Conversation[] | { results: Conversation[] }>("/api/chat/conversations/")
        .then(data => setConversations(Array.isArray(data) ? data : (data.results ?? [])))
        .catch(() => {});

    load().finally(() => setIsLoading(false));

    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const filtered = conversations.filter(c =>
    c.other_user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.listing_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#1c1917" }}>Messages</Text>
      </View>

      {/* Search */}
      <View style={{
        marginHorizontal: 16, marginBottom: 12,
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#ffffff", borderRadius: 12, borderWidth: 1, borderColor: "#E7E5E4",
        paddingHorizontal: 14, paddingVertical: 10,
      }}>
        <Ionicons name="search" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search conversations..."
          placeholderTextColor="#9ca3af"
          style={{ flex: 1, fontSize: 14, color: "#1c1917" }}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chatbubble-outline" size={64} color="#E7E5E4" />
          <Text style={{ fontSize: 16, color: "#6b7280", marginTop: 16 }}>
            {searchQuery ? "No results found" : "No conversations yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const unread = item.unread_count > 0;
            const initial = (item.other_user?.username?.[0] || "?").toUpperCase();
            const timestamp = item.last_message_at
              ? new Date(item.last_message_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })
              : "";

            return (
              <TouchableOpacity
                onPress={() => router.push(`/chat/${item.id}` as any)}
                activeOpacity={0.82}
                style={{
                  backgroundColor: unread ? "#f0fdfa" : "#ffffff",
                  borderColor: unread ? "#99f6e4" : "#f5f5f4",
                  borderWidth: 1, borderRadius: 14,
                  marginHorizontal: 16, marginBottom: 8, padding: 12,
                  flexDirection: "row", alignItems: "center",
                }}
              >
                <LinearGradient
                  colors={["#0D9488", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>{initial}</Text>
                </LinearGradient>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: "#1c1917" }} numberOfLines={1}>
                      {item.other_user?.username}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#9ca3af" }}>{timestamp}</Text>
                  </View>
                  {item.listing_title ? (
                    <Text style={{ fontSize: 11, color: "#0D9488", marginTop: 2 }} numberOfLines={1}>
                      Re: {item.listing_title}
                    </Text>
                  ) : null}
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 13, marginTop: 2,
                      color: unread ? "#1c1917" : "#6b7280",
                      fontWeight: unread ? "600" : "400",
                    }}
                  >
                    {item.last_message || "No messages yet"}
                  </Text>
                </View>

                {unread && (
                  <LinearGradient
                    colors={["#0D9488", "#7C3AED"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 20, height: 20, borderRadius: 10,
                      alignItems: "center", justifyContent: "center", marginLeft: 8,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                      {item.unread_count > 9 ? "9+" : item.unread_count}
                    </Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

