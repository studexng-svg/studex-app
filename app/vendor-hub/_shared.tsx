import { View, Text, StyleSheet } from "react-native";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    pending:          { bg: "#fef3c7", text: "#d97706" },
    confirmed:        { bg: "#f0fdfa", text: "#0D9488" },
    completed:        { bg: "#dcfce7", text: "#16a34a" },
    cancelled:        { bg: "#fef2f2", text: "#ef4444" },
    paid:             { bg: "#eff6ff", text: "#2563eb" },
    seller_completed: { bg: "#f5f3ff", text: "#7C3AED" },
  };
  const s = map[status] ?? { bg: "#f5f5f4", text: "#6b7280" };
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text style={{ color: s.text, fontSize: 11, fontFamily: "DMSans_500Medium" }}>
        {status.replace(/_/g, " ")}
      </Text>
    </View>
  );
}

export const S = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 10,
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle:        { fontSize: 14, color: "#1c1917", fontFamily: "DMSans_600SemiBold" },
  cardSub:          { fontSize: 12, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 1 },
  cardMeta:         { fontSize: 11, color: "#9ca3af", fontFamily: "DMSans_400Regular" },
  cardVal:          { fontSize: 13, color: "#1c1917", fontFamily: "DMSans_600SemiBold", marginTop: 1 },
  cardActionBtn:    { borderRadius: 9999, paddingVertical: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  cardActionBtnText:{ color: "#fff", fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  waitingBadge:     { backgroundColor: "#f0fdfa", borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 10 },
  declineBtn:       { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 20, borderRadius: 9999, borderWidth: 1, borderColor: "#fecaca" },
  sectionLabel:     { fontSize: 11, color: "#0D9488", fontFamily: "DMSans_700Bold", letterSpacing: 1, textTransform: "uppercase" },
  emptyState:       { alignItems: "center", paddingVertical: 48 },
  emptyText:        { fontSize: 15, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 12 },
  filterChip:       { borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
  filterChipText:   { fontSize: 13, color: "#6b7280", fontFamily: "DMSans_500Medium" },
  filterChipTextActive: { color: "#fff", fontFamily: "DMSans_700Bold" },
  bookingInfoBox:   { flex: 1, backgroundColor: "#f9fafb", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#f3f4f6" },
  locationRow:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f9fafb", borderRadius: 8, padding: 8, marginBottom: 4 },
  locationText:     { flex: 1, fontSize: 12, color: "#6b7280", fontFamily: "DMSans_400Regular" },
  listingCard: {
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 16,
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb",
    alignItems: "center", justifyContent: "center", backgroundColor: "#fff",
  },
  gradBtn:     { borderRadius: 9999, paddingVertical: 16, paddingHorizontal: 40, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  gradBtnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_700Bold" },
});
