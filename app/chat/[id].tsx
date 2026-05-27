import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert,
  Animated, PanResponder,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { fetchWithAuth } from "@/lib/api";

const DELETE_LIMIT_MS = 60 * 60 * 60 * 1000; // 60 hours

interface Message {
  id: number;
  sender: number;
  sender_username: string;
  content: string;
  message_type: string;
  image_url: string | null;
  is_mine: boolean;
  created_at: string;
  is_edited: boolean;
  is_pinned: boolean;
  is_read: boolean;
}

interface Conversation {
  id: number;
  listing_title: string;
  other_user: { id: number; username: string; is_online?: boolean; last_seen?: string | null };
}

function formatLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return "";
  const diff = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 60000);
  if (diff < 1) return "Active just now";
  if (diff < 60) return `Last seen ${diff}m ago`;
  const hrs = Math.floor(diff / 60);
  if (hrs < 24) return `Last seen ${hrs}h ago`;
  return `Last seen ${Math.floor(hrs / 24)}d ago`;
}

function parseQuoted(content: string): { quoted: { sender: string; text: string } | null; main: string } {
  if (!content) return { quoted: null, main: "" };
  const match = content.match(/^\[quoted:@([^|]+)\|([^\]]*)\]\n([\s\S]*)$/);
  if (match) return { quoted: { sender: match[1], text: match[2] }, main: match[3] || "" };
  return { quoted: null, main: content };
}

// â"€â"€ Swipeable row â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Slide left > 55 px to trigger reply. The reply arrow fades in on the right.
function SwipeableMessage({
  onReply,
  children,
}: {
  onReply: () => void;
  children: React.ReactNode;
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  const arrowOpacity = translateX.interpolate({
    inputRange: [-70, -20, 0],
    outputRange: [1, 0.15, 0],
    extrapolate: "clamp",
  });
  const arrowScale = translateX.interpolate({
    inputRange: [-70, -10, 0],
    outputRange: [1, 0.6, 0.3],
    extrapolate: "clamp",
  });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Only claim horizontal gestures; let the FlatList keep vertical ones
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) translateX.setValue(Math.max(gs.dx, -70));
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -55) onReply();
        Animated.spring(translateX, {
          toValue: 0, useNativeDriver: true, tension: 120, friction: 10,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <View style={{ width: "100%" }}>
      {/* Reply arrow â€" sits behind the bubble, revealed by left swipe */}
      <Animated.View
        style={{
          position: "absolute", right: 8,
          top: 0, bottom: 0, justifyContent: "center",
          opacity: arrowOpacity,
          transform: [{ scale: arrowScale }],
        }}
      >
        <View style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: "#f0fdfa",
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="arrow-undo" size={16} color="#0D9488" />
        </View>
      </Animated.View>

      <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

// â"€â"€ Main screen â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const loadMessages = async () => {
    try {
      const res = await fetchWithAuth(`/api/chat/conversations/${id}/messages/`);
      if (!res.ok) return;
      const data = await res.json();
      const raw: any[] = Array.isArray(data) ? data : (data.results || []);
      setMessages(raw.map(m => ({ ...m, is_mine: m.sender === user?.id })));
    } catch {}
  };

  const loadConversation = async () => {
    try {
      const res = await fetchWithAuth(`/api/chat/conversations/${id}/`);
      if (!res.ok) return;
      const data = await res.json();
      setConversation(data);
      setIsOnline(data.other_user?.is_online ?? false);
      setLastSeen(data.other_user?.last_seen ?? null);
    } catch {}
  };

  useEffect(() => {
    Promise.all([loadConversation(), loadMessages()])
      .finally(() => setIsLoading(false));
    const msgInterval = setInterval(loadMessages, 15000);
    const statusInterval = setInterval(loadConversation, 15000);
    return () => {
      clearInterval(msgInterval);
      clearInterval(statusInterval);
    };
  }, [id]);

  // â"€â"€ Message actions â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const handlePin = async (msgId: number, isPinned: boolean) => {
    try {
      const res = await fetchWithAuth(`/api/chat/messages/${msgId}/pin_message/`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: data.is_pinned } : m));
      }
    } catch {}
  };

  const handleDeleteForMe = async (msgId: number) => {
    try {
      const res = await fetchWithAuth(`/api/chat/messages/${msgId}/delete_for_me/`, { method: "POST" });
      if (res.ok) setMessages(prev => prev.filter(m => m.id !== msgId));
      else Alert.alert("Error", "Could not delete message.");
    } catch {
      Alert.alert("Error", "Could not delete message.");
    }
  };

  const handleDeleteForEveryone = async (msgId: number) => {
    try {
      const res = await fetchWithAuth(`/api/chat/messages/${msgId}/delete_for_everyone/`, { method: "POST" });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert("Error", (data as any).error || "Could not delete for everyone.");
      }
    } catch {
      Alert.alert("Error", "Could not delete message.");
    }
  };

  const showDeleteOptions = (msg: Message, isMine: boolean) => {
    const withinWindow = Date.now() - new Date(msg.created_at).getTime() < DELETE_LIMIT_MS;
    const buttons: any[] = [
      { text: "Delete for me", style: "destructive", onPress: () => handleDeleteForMe(msg.id) },
    ];
    if (isMine && withinWindow) {
      buttons.push({
        text: "Delete for everyone",
        style: "destructive",
        onPress: () => handleDeleteForEveryone(msg.id),
      });
    }
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Delete message", undefined, buttons);
  };

  const showMessageOptions = (msg: Message) => {
    const isMine = msg.sender === user?.id;
    Alert.alert("Message options", undefined, [
      { text: "Reply", onPress: () => setReplyTo(msg) },
      {
        text: msg.is_pinned ? "Unpin" : "Pin",
        onPress: () => handlePin(msg.id, msg.is_pinned),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => showDeleteOptions(msg, isMine),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // â"€â"€ Send â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    setIsSending(true);
    try {
      let content = text;
      if (replyTo) {
        const quotedText = (replyTo.content || "📷 Image").replace(/\]/g, "").substring(0, 100);
        content = `[quoted:@${replyTo.sender_username}|${quotedText}]\n${text}`;
      }
      const res = await fetchWithAuth(`/api/chat/conversations/${id}/send/`, {
        method: "POST",
        body: JSON.stringify({ content, message_type: "text" }),
      });
      if (!res.ok) throw new Error();
      setInputText("");
      setReplyTo(null);
      await loadMessages();
    } catch {
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // â"€â"€ Loading â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  const otherUsername = conversation?.other_user?.username || "";
  const listingTitle = conversation?.listing_title || "";
  const initial = (otherUsername[0] || "?").toUpperCase();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* â"€â"€ Header â"€â"€ */}
      <View style={{
        backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#f5f5f4",
        paddingTop: 48, paddingBottom: 12, paddingHorizontal: 16,
        flexDirection: "row", alignItems: "center",
      }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#1c1917" />
        </TouchableOpacity>
        <LinearGradient
          colors={["#0D9488", "#7C3AED"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 36, height: 36, borderRadius: 18,
            alignItems: "center", justifyContent: "center", marginLeft: 12,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{initial}</Text>
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1c1917" }}>@{otherUsername}</Text>
          {isOnline ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#10b981" }} />
              <Text style={{ fontSize: 11, color: "#10b981", fontWeight: "600" }}>Online</Text>
            </View>
          ) : lastSeen ? (
            <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{formatLastSeen(lastSeen)}</Text>
          ) : listingTitle ? (
            <Text style={{ fontSize: 11, color: "#0D9488", marginTop: 1 }} numberOfLines={1}>Re: {listingTitle}</Text>
          ) : null}
        </View>
      </View>

      {/* â"€â"€ Messages â"€â"€ */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (!showScrollBtn) flatListRef.current?.scrollToEnd({ animated: false });
        }}
        onScroll={({ nativeEvent }) => {
          const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
          const distFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
          setShowScrollBtn(distFromBottom > 150);
        }}
        scrollEventThrottle={100}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: "#9ca3af", marginTop: 48 }}>
            No messages yet. Say hello! 👋
          </Text>
        }
        renderItem={({ item }) => {
          const isMine = item.sender === user?.id;
          const { quoted, main } = parseQuoted(item.content);
          const time = new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

          return (
            <SwipeableMessage onReply={() => setReplyTo(item)}>
              <TouchableOpacity
                activeOpacity={0.92}
                onLongPress={() => showMessageOptions(item)}
                delayLongPress={400}
                style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "75%", marginBottom: 8 }}
              >
                {/* Pinned indicator */}
                {item.is_pinned && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3, alignSelf: isMine ? "flex-end" : "flex-start" }}>
                    <Ionicons name="pin" size={10} color="#0D9488" />
                    <Text style={{ fontSize: 10, color: "#0D9488" }}>Pinned</Text>
                  </View>
                )}

                {!isMine && (
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#0D9488", marginBottom: 2 }}>
                    @{item.sender_username}
                  </Text>
                )}

                {isMine ? (
                  <LinearGradient
                    colors={["#0D9488", "#7C3AED"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 16, borderBottomRightRadius: 4,
                      paddingHorizontal: 12, paddingVertical: 8,
                      borderWidth: item.is_pinned ? 1.5 : 0,
                      borderColor: item.is_pinned ? "#0D9488" : "transparent",
                    }}
                  >
                    {quoted && (
                      <View style={{
                        backgroundColor: "rgba(0,0,0,0.12)", borderRadius: 8, padding: 6,
                        marginBottom: 4, borderLeftWidth: 3, borderLeftColor: "rgba(255,255,255,0.7)",
                      }}>
                        <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }} numberOfLines={2}>
                          â†© @{quoted.sender}: {quoted.text}
                        </Text>
                      </View>
                    )}
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        style={{ width: 200, height: 200, borderRadius: 12, marginBottom: main ? 4 : 0 }}
                        resizeMode="cover"
                      />
                    ) : null}
                    {main ? <Text style={{ color: "#fff", fontSize: 14 }}>{main}</Text> : null}
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 2 }}>
                      {item.is_edited && <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>edited</Text>}
                      <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>{time}</Text>
                      <Ionicons
                        name="checkmark-done"
                        size={13}
                        color={item.is_read ? "#ffffff" : "rgba(255,255,255,0.45)"}
                      />
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={{
                    backgroundColor: "#e9e9eb", borderRadius: 16, borderBottomLeftRadius: 4,
                    paddingHorizontal: 12, paddingVertical: 8,
                    borderWidth: item.is_pinned ? 1.5 : 0,
                    borderColor: item.is_pinned ? "#0D9488" : "transparent",
                  }}>
                    {quoted && (
                      <View style={{
                        backgroundColor: "#f0fdfa", borderRadius: 8, padding: 6,
                        marginBottom: 4, borderLeftWidth: 3, borderLeftColor: "#0D9488",
                      }}>
                        <Text style={{ fontSize: 11, color: "#0D9488" }} numberOfLines={2}>
                          â†© @{quoted.sender}: {quoted.text}
                        </Text>
                      </View>
                    )}
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        style={{ width: 200, height: 200, borderRadius: 12, marginBottom: main ? 4 : 0 }}
                        resizeMode="cover"
                      />
                    ) : null}
                    {main ? <Text style={{ color: "#1c1917", fontSize: 14 }}>{main}</Text> : null}
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 2 }}>
                      {item.is_edited && <Text style={{ fontSize: 9, color: "#9ca3af", fontStyle: "italic" }}>edited</Text>}
                      <Text style={{ color: "#9ca3af", fontSize: 10 }}>{time}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </SwipeableMessage>
          );
        }}
      />

      {/* â"€â"€ Scroll to bottom button â"€â"€ */}
      {showScrollBtn && (
        <TouchableOpacity
          onPress={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
            setShowScrollBtn(false);
          }}
          activeOpacity={0.85}
          style={{
            position: "absolute",
            bottom: 90,
            right: 16,
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: "#ffffff",
            borderWidth: 1, borderColor: "#e7e5e4",
            alignItems: "center", justifyContent: "center",
            shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        >
          <Ionicons name="chevron-down" size={20} color="#1c1917" />
        </TouchableOpacity>
      )}

      {/* â"€â"€ Reply strip â"€â"€ */}
      {replyTo && (
        <View style={{
          backgroundColor: "#f0fdfa", borderTopWidth: 1, borderTopColor: "#99f6e4",
          paddingHorizontal: 16, paddingVertical: 8,
          flexDirection: "row", alignItems: "center",
        }}>
          <Ionicons name="return-down-forward" size={16} color="#0D9488" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ fontSize: 12, color: "#0D9488" }}>
              Replying to @{replyTo.sender_username}
            </Text>
            <Text style={{ fontSize: 12, color: "#6b7280" }} numberOfLines={1}>
              {parseQuoted(replyTo.content).main || "📷 Image"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* â"€â"€ Input bar â"€â"€ */}
      <View style={{
        backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#f5f5f4",
        paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 24,
        flexDirection: "row", alignItems: "center",
      }}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={replyTo ? "Write your reply..." : "Type a message..."}
          placeholderTextColor="#9ca3af"
          multiline
          style={{
            flex: 1, backgroundColor: "#f5f5f4", borderRadius: 20,
            paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: "#1c1917",
            maxHeight: 100,
          }}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          activeOpacity={0.8}
          style={{ marginLeft: 8, opacity: !inputText.trim() || isSending ? 0.4 : 1 }}
        >
          <LinearGradient
            colors={["#0D9488", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}
          >
            {isSending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={16} color="#fff" />
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
