import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert,
  Image, ScrollView, Modal, Pressable, TextInput, StyleSheet,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "@/stores/authStore";
import { api, fetchWithAuth } from "@/lib/api";
import { S } from "./_shared";

type ImageSlot = { uri: string; mimeType: string; filename: string } | null;

const IMAGE_KEYS = ["image", "image2", "image3", "image4", "image5"] as const;

// ─── Listing form modal ───────────────────────────────────────────────────────

function ListingFormModal({ visible, onClose, onSuccess, editItem }: {
  visible: boolean; onClose: () => void; onSuccess: () => void; editItem: any | null;
}) {
  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [price,        setPrice]        = useState("");
  const [discount,     setDiscount]     = useState("");
  const [brand,        setBrand]        = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [tags,         setTags]         = useState("");
  const [listingType,  setListingType]  = useState<"service" | "food" | "product">("service");
  const [condition,    setCondition]    = useState("");
  const [stockQty,     setStockQty]     = useState("0");
  const [images,       setImages]       = useState<ImageSlot[]>([null, null, null, null, null]);
  const [existingImgs, setExistingImgs] = useState<(string | null)[]>([null, null, null, null, null]);
  const [categories,   setCategories]   = useState<any[]>([]);
  const [selectedCat,  setSelectedCat]  = useState<any | null>(null);
  const [catOpen,      setCatOpen]      = useState(false);
  const [typeOpen,     setTypeOpen]     = useState(false);
  const [condOpen,     setCondOpen]     = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [formError,    setFormError]    = useState("");

  const TYPE_LABELS: Record<string, string> = {
    service: "Service (e.g. nails, lashes)",
    food:    "Food (e.g. jollof, drinks)",
    product: "Product (e.g. books, phones)",
  };
  const CONDITION_LABELS: Record<string, string> = {
    "":           "Not specified",
    new:          "New",
    fairly_used:  "Fairly Used",
    refurbished:  "Refurbished",
  };

  useEffect(() => {
    if (!visible) return;
    if (editItem) {
      setTitle(editItem.title ?? "");
      setDescription(editItem.description ?? "");
      setPrice(String(editItem.price ?? ""));
      setDiscount(editItem.discount_percent > 0 ? String(editItem.discount_percent) : "");
      setBrand(editItem.brand ?? "");
      setDeliveryTime(editItem.delivery_time ?? "");
      setTags(editItem.tags ?? "");
      setListingType(editItem.listing_type ?? "service");
      setCondition(editItem.condition ?? "");
      setStockQty(String(editItem.stock_quantity ?? 0));
      setSelectedCat(editItem.category ? { slug: editItem.category, title: editItem.category_name ?? editItem.category } : null);
      setImages([null, null, null, null, null]);
      setExistingImgs(IMAGE_KEYS.map(k => editItem[k] ?? null));
    } else {
      setTitle(""); setDescription(""); setPrice(""); setDiscount(""); setBrand("");
      setDeliveryTime(""); setTags(""); setListingType("service"); setCondition("");
      setStockQty("0"); setSelectedCat(null);
      setImages([null, null, null, null, null]);
      setExistingImgs([null, null, null, null, null]);
    }
    setFormError("");
    api.get<any>("/api/services/categories/").then(d => {
      setCategories(Array.isArray(d) ? d : (d.results ?? []));
    }).catch(() => {});
  }, [visible]);

  const pickSlot = async (slotIndex: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo library access to upload images."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      const next = [...images] as ImageSlot[];
      next[slotIndex] = { uri: a.uri, mimeType: a.mimeType ?? "image/jpeg", filename: a.fileName ?? "image.jpg" };
      setImages(next);
      const nextEx = [...existingImgs];
      nextEx[slotIndex] = null;
      setExistingImgs(nextEx);
    }
  };

  const removeSlot = (slotIndex: number) => {
    const next = [...images] as ImageSlot[];
    next[slotIndex] = null;
    setImages(next);
    const nextEx = [...existingImgs];
    nextEx[slotIndex] = null;
    setExistingImgs(nextEx);
  };

  const salePrice = price && discount && Number(discount) > 0
    ? (Number(price) * (1 - Number(discount) / 100)).toFixed(0)
    : null;

  const handleSubmit = async () => {
    if (!title.trim())                return setFormError("Title is required.");
    if (!description.trim())          return setFormError("Description is required.");
    if (!price || Number(price) <= 0) return setFormError("Enter a valid price.");
    if (!selectedCat)                 return setFormError("Select a category.");
    if (!editItem && !images[0])      return setFormError("Upload at least one listing image.");
    if (discount && (Number(discount) < 0 || Number(discount) > 100)) return setFormError("Discount must be between 0 and 100.");
    setSubmitting(true); setFormError("");
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("price", price);
      fd.append("category", selectedCat.slug);
      fd.append("listing_type", listingType);
      fd.append("track_inventory", String(listingType !== "service"));
      if (listingType !== "service") fd.append("stock_quantity", stockQty);
      fd.append("discount_percent", discount ? discount : "0");
      if (brand.trim())        fd.append("brand", brand.trim());
      if (condition)           fd.append("condition", condition);
      if (deliveryTime.trim()) fd.append("delivery_time", deliveryTime.trim());
      if (tags.trim())         fd.append("tags", tags.trim());
      images.forEach((img, i) => {
        if (img) fd.append(IMAGE_KEYS[i], { uri: img.uri, type: img.mimeType, name: img.filename } as any);
      });
      const url    = editItem ? `/api/services/listings/${editItem.id}/` : "/api/services/listings/";
      const method = editItem ? "PATCH" : "POST";
      const res    = await fetchWithAuth(url, { method, body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail ?? d.image?.[0] ?? (Object.values(d)[0] as any) ?? "Save failed.");
      }
      onSuccess(); onClose();
    } catch (err: any) {
      setFormError(err.message ?? "Something went wrong.");
    } finally { setSubmitting(false); }
  };

  const inp = {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 14,
    fontFamily: "DMSans_400Regular" as any, color: "#1c1917", backgroundColor: "#fff",
  };

  const displayImg = (i: number) => images[i]?.uri ?? existingImgs[i] ?? null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#F5F5F5", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "96%" }}>
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#d1d5db" }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 56 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20 }}>
              <Text style={{ fontSize: 17, fontFamily: "DMSans_700Bold", color: "#1c1917", marginBottom: 16 }}>
                {editItem ? "Edit Listing" : "New Listing"}
              </Text>

              {/* Title */}
              <TextInput value={title} onChangeText={setTitle} placeholder="Title (e.g. Gel Manicure)" placeholderTextColor="#9ca3af" style={[inp, { marginBottom: 12 }]} />

              {/* Description */}
              <TextInput value={description} onChangeText={setDescription} placeholder="Describe your service..." placeholderTextColor="#9ca3af" multiline numberOfLines={4} textAlignVertical="top" style={[inp, { minHeight: 100, marginBottom: 12 }]} />

              {/* Price + Category */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TextInput value={price} onChangeText={t => setPrice(t.replace(/[^0-9.]/g, ""))} placeholder="Price (₦)" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" style={[inp, { flex: 1 }]} />
                <TouchableOpacity onPress={() => setCatOpen(true)} activeOpacity={0.8} style={[inp, { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                  <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: selectedCat ? "#1c1917" : "#9ca3af", flex: 1 }} numberOfLines={1}>
                    {selectedCat?.title ?? "Category"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Discount + sale price preview */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: salePrice ? 4 : 12, alignItems: "center" }}>
                <TextInput value={discount} onChangeText={t => setDiscount(t.replace(/[^0-9.]/g, ""))} placeholder="Discount % (optional)" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" style={[inp, { flex: 1 }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#6b7280", fontFamily: "DMSans_400Regular" }}>
                    {salePrice ? `Sale price: ₦${Number(salePrice).toLocaleString()}` : "No discount"}
                  </Text>
                </View>
              </View>
              {!!salePrice && (
                <Text style={{ fontSize: 11, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginBottom: 12 }}>
                  Original ₦{Number(price).toLocaleString()} → Sale ₦{Number(salePrice).toLocaleString()}
                </Text>
              )}

              {/* Brand + Delivery time */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TextInput value={brand} onChangeText={setBrand} placeholder="Brand (optional)" placeholderTextColor="#9ca3af" style={[inp, { flex: 1 }]} />
                <TextInput value={deliveryTime} onChangeText={setDeliveryTime} placeholder="Delivery time (optional)" placeholderTextColor="#9ca3af" style={[inp, { flex: 1 }]} />
              </View>

              {/* Condition picker */}
              <TouchableOpacity onPress={() => setCondOpen(true)} activeOpacity={0.8} style={[inp, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }]}>
                <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: condition ? "#1c1917" : "#9ca3af", flex: 1 }}>
                  {condition ? CONDITION_LABELS[condition] : "Condition (optional)"}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#6b7280" />
              </TouchableOpacity>

              {/* Tags */}
              <TextInput value={tags} onChangeText={setTags} placeholder="Tags — comma separated (e.g. beauty, hair, braids)" placeholderTextColor="#9ca3af" style={[inp, { marginBottom: 12 }]} />

              {/* Images — 5 slots */}
              <Text style={{ fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Photos (up to 5)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {IMAGE_KEYS.map((_, i) => {
                    const src = displayImg(i);
                    const isMain = i === 0;
                    return (
                      <View key={i} style={{ width: 100 }}>
                        {src ? (
                          <View style={{ borderRadius: 10, overflow: "hidden", position: "relative" }}>
                            <ExpoImage source={{ uri: src }} style={{ width: 100, height: 100 }} contentFit="cover" />
                            <TouchableOpacity onPress={() => pickSlot(i)} style={{ position: "absolute", inset: 0 }} activeOpacity={0.85}>
                              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.45)", paddingVertical: 4, alignItems: "center" }}>
                                <Text style={{ fontSize: 10, color: "#fff", fontFamily: "DMSans_600SemiBold" }}>Replace</Text>
                              </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => removeSlot(i)} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
                              <Ionicons name="close" size={12} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity onPress={() => pickSlot(i)} activeOpacity={0.75}
                            style={{ width: 100, height: 100, borderWidth: 2, borderStyle: "dashed", borderColor: isMain ? "#0D9488" : "#d1d5db", borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#fafafa" }}>
                            <Ionicons name="add" size={22} color={isMain ? "#0D9488" : "#9ca3af"} />
                            <Text style={{ fontSize: 10, color: isMain ? "#0D9488" : "#9ca3af", fontFamily: "DMSans_600SemiBold" }}>
                              {isMain ? "Main *" : `Photo ${i + 1}`}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Listing type */}
              <TouchableOpacity onPress={() => setTypeOpen(true)} activeOpacity={0.8} style={[inp, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: listingType !== "service" ? 12 : 0 }]}>
                <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: "#1c1917", flex: 1 }}>{TYPE_LABELS[listingType]}</Text>
                <Ionicons name="chevron-down" size={14} color="#6b7280" />
              </TouchableOpacity>
              {listingType !== "service" && (
                <TextInput value={stockQty} onChangeText={t => setStockQty(t.replace(/[^0-9]/g, ""))} placeholder="Stock quantity" placeholderTextColor="#9ca3af" keyboardType="number-pad" style={inp} />
              )}

              {!!formError && (
                <View style={{ backgroundColor: "#fef2f2", borderRadius: 8, padding: 12, marginTop: 12 }}>
                  <Text style={{ fontSize: 13, color: "#dc2626", fontFamily: "DMSans_400Regular" }}>{formError}</Text>
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 20, alignItems: "center" }}>
                <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.87}
                  style={{ flex: 1, backgroundColor: "#0D9488", borderRadius: 9999, paddingVertical: 14, alignItems: "center", justifyContent: "center", opacity: submitting ? 0.7 : 1 }}>
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: "#fff", fontSize: 15, fontFamily: "DMSans_600SemiBold" }}>{editItem ? "Save Changes" : "Create Listing"}</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                  <Text style={{ fontSize: 15, color: "#6b7280", fontFamily: "DMSans_500Medium" }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Category sheet */}
          <Modal visible={catOpen} transparent animationType="fade" onRequestClose={() => setCatOpen(false)}>
            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={() => setCatOpen(false)}>
              <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingBottom: 36, paddingHorizontal: 16, maxHeight: "55%" }}>
                <Text style={{ fontSize: 13, fontFamily: "DMSans_700Bold", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Select Category</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {categories.map((cat, i, arr) => (
                    <TouchableOpacity key={cat.id ?? cat.slug} onPress={() => { setSelectedCat(cat); setCatOpen(false); }} activeOpacity={0.75}
                      style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 4 },
                        i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0ef" },
                        selectedCat?.slug === cat.slug && { backgroundColor: "#f0fdfa", borderRadius: 10, paddingHorizontal: 10 },
                      ]}>
                      <Text style={{ fontSize: 15, fontFamily: "DMSans_500Medium", color: selectedCat?.slug === cat.slug ? "#0D9488" : "#1c1917" }}>{cat.title ?? cat.name}</Text>
                      {selectedCat?.slug === cat.slug && <Ionicons name="checkmark-circle" size={20} color="#0D9488" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>

          {/* Listing type sheet */}
          <Modal visible={typeOpen} transparent animationType="fade" onRequestClose={() => setTypeOpen(false)}>
            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={() => setTypeOpen(false)}>
              <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingBottom: 36, paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 13, fontFamily: "DMSans_700Bold", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Listing Type</Text>
                {(Object.entries(TYPE_LABELS) as [string, string][]).map(([val, label], i, arr) => (
                  <TouchableOpacity key={val} onPress={() => { setListingType(val as any); setTypeOpen(false); }} activeOpacity={0.75}
                    style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 4 },
                      i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0ef" },
                      listingType === val && { backgroundColor: "#f0fdfa", borderRadius: 10, paddingHorizontal: 10 },
                    ]}>
                    <Text style={{ fontSize: 15, fontFamily: "DMSans_500Medium", color: listingType === val ? "#0D9488" : "#1c1917" }}>{label}</Text>
                    {listingType === val && <Ionicons name="checkmark-circle" size={20} color="#0D9488" />}
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </Modal>

          {/* Condition sheet */}
          <Modal visible={condOpen} transparent animationType="fade" onRequestClose={() => setCondOpen(false)}>
            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={() => setCondOpen(false)}>
              <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingBottom: 36, paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 13, fontFamily: "DMSans_700Bold", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Condition</Text>
                {(Object.entries(CONDITION_LABELS) as [string, string][]).map(([val, label], i, arr) => (
                  <TouchableOpacity key={val} onPress={() => { setCondition(val); setCondOpen(false); }} activeOpacity={0.75}
                    style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 4 },
                      i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0ef" },
                      condition === val && { backgroundColor: "#f0fdfa", borderRadius: 10, paddingHorizontal: 10 },
                    ]}>
                    <Text style={{ fontSize: 15, fontFamily: "DMSans_500Medium", color: condition === val ? "#0D9488" : "#1c1917" }}>{label}</Text>
                    {condition === val && <Ionicons name="checkmark-circle" size={20} color="#0D9488" />}
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

// ─── Listing card ─────────────────────────────────────────────────────────────

function ListingCard({ item, onEdit, onDelete }: { item: any; onEdit: () => void; onDelete: () => void }) {
  const discountPct = Number(item.discount_percent ?? 0);
  const originalPrice = Number(item.price ?? 0);
  const salePrice = discountPct > 0 ? originalPrice * (1 - discountPct / 100) : null;

  return (
    <View style={S.listingCard}>
      {item.image
        ? <Image source={{ uri: item.image }} style={{ width: "100%", height: 180 }} resizeMode="cover" />
        : <View style={{ width: "100%", height: 180, backgroundColor: "#e7e5e4", alignItems: "center", justifyContent: "center" }}><Ionicons name="storefront-outline" size={48} color="#a8a29e" /></View>
      }
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Text style={{ fontSize: 16, fontFamily: "DMSans_700Bold", color: "#1c1917", flex: 1, marginRight: 8 }} numberOfLines={1}>{item.title}</Text>
          <View style={{ alignItems: "flex-end" }}>
            {salePrice ? (
              <>
                <Text style={{ fontSize: 12, color: "#9ca3af", fontFamily: "DMSans_400Regular", textDecorationLine: "line-through" }}>₦{originalPrice.toLocaleString("en-NG")}</Text>
                <Text style={{ fontSize: 16, fontFamily: "DMSans_700Bold", color: "#ef4444" }}>₦{salePrice.toLocaleString("en-NG")}</Text>
              </>
            ) : (
              <Text style={{ fontSize: 16, fontFamily: "DMSans_700Bold", color: "#0D9488" }}>₦{originalPrice.toLocaleString("en-NG")}</Text>
            )}
          </View>
        </View>

        {salePrice ? (
          <View style={{ backgroundColor: "#fef2f2", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: "#ef4444", fontFamily: "DMSans_700Bold" }}>{discountPct}% OFF</Text>
          </View>
        ) : null}

        {item.description ? <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 6 }} numberOfLines={2}>{item.description}</Text> : null}

        {item.brand ? (
          <Text style={{ fontSize: 12, color: "#6b7280", fontFamily: "DMSans_500Medium", marginTop: 4 }}>Brand: {item.brand}</Text>
        ) : null}

        {item.delivery_time ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Ionicons name="time-outline" size={12} color="#6b7280" />
            <Text style={{ fontSize: 12, color: "#6b7280", fontFamily: "DMSans_400Regular" }}>{item.delivery_time}</Text>
          </View>
        ) : null}

        {item.listing_type !== "service" ? (
          <Text style={{ fontSize: 13, color: "#d97706", fontFamily: "DMSans_600SemiBold", marginTop: 8 }}>🪙 Stock: {item.quantity ?? item.stock_quantity ?? 0} remaining</Text>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <View style={{ backgroundColor: item.is_available ? "#dcfce7" : "#fef3c7", borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name={item.is_available ? "checkmark-circle-outline" : "eye-outline"} size={13} color={item.is_available ? "#16a34a" : "#d97706"} />
            <Text style={{ fontSize: 12, fontFamily: "DMSans_600SemiBold", color: item.is_available ? "#16a34a" : "#d97706" }}>
              {item.is_available ? "Active" : "Pending Approval"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={onEdit} style={S.iconBtn}>
              <Ionicons name="pencil-outline" size={16} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={[S.iconBtn, { borderColor: "#fecaca" }]}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorListingsPage() {
  const { user } = useAuthStore();
  const [listings,        setListings]        = useState<any[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [modalVisible,    setModalVisible]    = useState(false);
  const [editingListing,  setEditingListing]  = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!user?.username) return;
    setLoading(true);
    try {
      const data = await api.get<any>(`/api/services/listings/?vendor_username=${user.username}&page_size=500`);
      setListings(Array.isArray(data) ? data : (data.results ?? []));
    } catch {} finally { setLoading(false); }
  }, [user?.username]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (id: number) => {
    Alert.alert("Delete listing?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await api.delete(`/api/services/listings/${id}/`); load(); }
        catch { Alert.alert("Error", "Could not delete listing."); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color="#0D9488" style={{ marginTop: 48 }} />;

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16, paddingTop: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <View>
            <Text style={S.sectionLabel}>MANAGE</Text>
            <Text style={{ fontSize: 26, fontFamily: "DMSans_700Bold", color: "#1c1917", marginTop: 2 }}>My Listings</Text>
            <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 2 }}>
              {listings.length} {listings.length === 1 ? "service" : "services"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => { setEditingListing(null); setModalVisible(true); }} activeOpacity={0.87}
            style={{ backgroundColor: "#0D9488", borderRadius: 9999, paddingVertical: 10, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 14, fontFamily: "DMSans_600SemiBold" }}>Add</Text>
          </TouchableOpacity>
        </View>

        {listings.length === 0 ? (
          <View style={S.emptyState}>
            <Ionicons name="storefront-outline" size={48} color="#e7e5e4" />
            <Text style={S.emptyText}>No listings yet</Text>
          </View>
        ) : listings.map(item => (
          <ListingCard
            key={String(item.id)}
            item={item}
            onEdit={() => { setEditingListing(item); setModalVisible(true); }}
            onDelete={() => handleDelete(item.id)}
          />
        ))}
      </ScrollView>

      <ListingFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={load}
        editItem={editingListing}
      />
    </>
  );
}
