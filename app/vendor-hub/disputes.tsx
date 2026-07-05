import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert,
  ScrollView, Image, Modal, Pressable, TextInput,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { S } from "./_shared";

function DisputeCard({ d, onRespond }: { d: any; onRespond: (d: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasResponse = !!d.provider_response;
  const isResolved  = ["resolved", "closed"].includes(d.status);
  const sc = d.status === "open" ? { bg: "#fef2f2", text: "#ef4444" }
           : d.status === "resolved" ? { bg: "#dcfce7", text: "#16a34a" }
           : { bg: "#f5f5f4", text: "#6b7280" };

  return (
    <View style={S.card}>
      <TouchableOpacity onPress={() => setExpanded(v => !v)} activeOpacity={0.8}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={S.cardTitle} numberOfLines={1}>
              {d.listing_title || d.listing?.title || `Order #${d.order ?? d.id}`}
            </Text>
            <Text style={S.cardSub}>Ref: {d.reference ?? d.id}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <View style={{ backgroundColor: sc.bg, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: sc.text, fontFamily: "DMSans_600SemiBold" }}>{d.status}</Text>
            </View>
            <Ionicons name={expanded ? "chevron-up-outline" : "chevron-down-outline"} size={16} color="#a8a29e" />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 12, gap: 10 }}>
          {d.reason && (
            <View>
              <Text style={S.cardMeta}>Reason</Text>
              <Text style={{ fontSize: 13, color: "#44403c", fontFamily: "DMSans_500Medium", marginTop: 2 }}>{d.reason}</Text>
            </View>
          )}
          {d.description && (
            <View style={{ backgroundColor: "#fef2f2", borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 11, color: "#ef4444", fontFamily: "DMSans_600SemiBold", marginBottom: 4 }}>BUYER'S COMPLAINT</Text>
              <Text style={{ fontSize: 13, color: "#1c1917", fontFamily: "DMSans_400Regular", lineHeight: 19 }}>{d.description}</Text>
            </View>
          )}
          {Array.isArray(d.evidence_images) && d.evidence_images.length > 0 && (
            <View>
              <Text style={S.cardMeta}>Evidence</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                {d.evidence_images.map((img: string, i: number) => (
                  <Image key={i} source={{ uri: img }} style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8, backgroundColor: "#f5f5f4" }} />
                ))}
              </ScrollView>
            </View>
          )}
          {hasResponse ? (
            <View style={{ backgroundColor: "#f0fdfa", borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 11, color: "#0D9488", fontFamily: "DMSans_600SemiBold", marginBottom: 4 }}>YOUR RESPONSE</Text>
              <Text style={{ fontSize: 13, color: "#1c1917", fontFamily: "DMSans_400Regular", lineHeight: 19 }}>{d.provider_response}</Text>
            </View>
          ) : !isResolved && (
            <TouchableOpacity onPress={() => onRespond(d)} activeOpacity={0.85}
              style={{ backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#0D9488", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: "#0D9488", fontFamily: "DMSans_600SemiBold" }}>Respond to dispute</Text>
            </TouchableOpacity>
          )}
          {d.admin_decision && (
            <View style={{ backgroundColor: "#fef3c7", borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 11, color: "#d97706", fontFamily: "DMSans_600SemiBold", marginBottom: 4 }}>ADMIN DECISION</Text>
              <Text style={{ fontSize: 13, color: "#1c1917", fontFamily: "DMSans_400Regular", lineHeight: 19 }}>{d.admin_decision}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function VendorDisputesPage() {
  const [disputes,          setDisputes]          = useState<any[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [respondingTo,      setRespondingTo]      = useState<any>(null);
  const [disputeResponse,   setDisputeResponse]   = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any>("/api/orders/disputes/");
      setDisputes(Array.isArray(data) ? data : (data.results ?? []));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRespond = async () => {
    if (!respondingTo || !disputeResponse.trim()) return;
    setDisputeSubmitting(true);
    try {
      await api.post(`/api/orders/disputes/${respondingTo.id}/respond/`, { provider_response: disputeResponse.trim() });
      setDisputeResponse("");
      setRespondingTo(null);
      await load();
    } catch {
      Alert.alert("Error", "Failed to submit response. Please try again.");
    } finally { setDisputeSubmitting(false); }
  };

  const open   = disputes.filter(d => !["resolved", "closed"].includes(d.status));
  const closed = disputes.filter(d =>  ["resolved", "closed"].includes(d.status));

  if (loading) return <ActivityIndicator color="#0D9488" style={{ marginTop: 48 }} />;

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16, paddingTop: 20 }}>
        <Text style={S.sectionLabel}>MANAGE</Text>
        <Text style={{ fontSize: 26, fontFamily: "DMSans_700Bold", color: "#1c1917", marginTop: 2, marginBottom: 4 }}>Disputes</Text>
        <Text style={S.cardSub}>{open.length} open · {closed.length} resolved</Text>

        {disputes.length === 0 && (
          <View style={S.emptyState}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#f0fdfa", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Ionicons name="shield-checkmark-outline" size={36} color="#0D9488" />
            </View>
            <Text style={{ fontSize: 15, color: "#9ca3af", fontFamily: "DMSans_400Regular" }}>No disputes — great work!</Text>
          </View>
        )}

        {open.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={[S.sectionLabel, { color: "#ef4444", marginBottom: 10 }]}>OPEN</Text>
            {open.map(d => <DisputeCard key={d.id} d={d} onRespond={setRespondingTo} />)}
          </View>
        )}

        {closed.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={[S.sectionLabel, { color: "#9ca3af", marginBottom: 10 }]}>RESOLVED / CLOSED</Text>
            {closed.map(d => <DisputeCard key={d.id} d={d} onRespond={setRespondingTo} />)}
          </View>
        )}
      </ScrollView>

      {/* Respond modal */}
      <Modal visible={!!respondingTo} transparent animationType="slide" onRequestClose={() => setRespondingTo(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setRespondingTo(null)} />
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold", color: "#1c1917" }}>Respond to dispute</Text>
            <TouchableOpacity onPress={() => setRespondingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {respondingTo?.description && (
            <View style={{ backgroundColor: "#fef2f2", borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 11, color: "#ef4444", fontFamily: "DMSans_600SemiBold", marginBottom: 4 }}>BUYER'S COMPLAINT</Text>
              <Text style={{ fontSize: 13, color: "#1c1917", fontFamily: "DMSans_400Regular", lineHeight: 19 }}>{respondingTo.description}</Text>
            </View>
          )}
          <Text style={[S.cardMeta, { marginBottom: 6 }]}>Your response</Text>
          <TextInput
            value={disputeResponse}
            onChangeText={setDisputeResponse}
            placeholder="Explain your side clearly…"
            placeholderTextColor="#a8a29e"
            multiline numberOfLines={5} textAlignVertical="top"
            style={{ backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 12, padding: 12, fontSize: 14, fontFamily: "DMSans_400Regular", color: "#1c1917", minHeight: 110, marginBottom: 16 }}
          />
          <TouchableOpacity onPress={handleRespond} disabled={disputeSubmitting || !disputeResponse.trim()} activeOpacity={0.85}
            style={{ backgroundColor: disputeSubmitting || !disputeResponse.trim() ? "#e7e5e4" : "#0D9488", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
            {disputeSubmitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={{ fontSize: 15, color: "#fff", fontFamily: "DMSans_700Bold" }}>Submit Response</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}
