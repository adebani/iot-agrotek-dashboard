import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  SafeAreaView, View, Text, FlatList, ActivityIndicator,
  RefreshControl, StyleSheet, TextInput, Pressable, Animated, Switch, Alert
} from "react-native";

const API_URL = "https://68fc3d5096f6ff19b9f49212.mockapi.io/api/v1/sensor";

export default function App() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | inactive
  const [lastUpdated, setLastUpdated] = useState(null);
  const [busyIds, setBusyIds] = useState(new Set()); // id yang sedang di-update

  const fetchData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json) ? json : [json];
      arr.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));
      setRaw(arr);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(true); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(false); }, []);

  // === NEW: fungsi toggle status ===
  const toggleActive = async (item) => {
    const id = String(item.id);
    const nextValue = !(item.isActive ?? true);

    // Optimistic update
    setBusyIds(prev => new Set(prev).add(id));
    setRaw(curr => curr.map(x => x.id == id ? { ...x, isActive: nextValue } : x));

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT", // PATCH juga boleh di MockAPI
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextValue }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      // Sinkronkan data balik dari server (opsional)
      const updated = await res.json();
      setRaw(curr => curr.map(x => x.id == id ? { ...x, ...updated } : x));
    } catch (e) {
      // Rollback kalau gagal
      setRaw(curr => curr.map(x => x.id == id ? { ...x, isActive: item.isActive ?? true } : x));
      Alert.alert("Gagal mengubah status", String(e?.message || e));
    } finally {
      setBusyIds(prev => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return raw.filter((item) => {
      const byFilter =
        filter === "all"
          ? true
          : filter === "active"
          ? (item.isActive ?? true) === true
          : (item.isActive ?? true) === false;
      const byQuery = q
        ? (item.location || "").toLowerCase().includes(q) ||
          String(item.id || "").toLowerCase().includes(q)
        : true;
      return byFilter && byQuery;
    });
  }, [raw, query, filter]);

  const formatDateTime = (v) => { try { return (v instanceof Date ? v : new Date(v)).toLocaleString(); } catch { return "-"; } };

  const Header = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.appTitle}>IoT Agrotek</Text>
        <Text style={styles.appSubtitle}>
          Dashboard Sensors • {lastUpdated ? `Updated ${formatDateTime(lastUpdated)}` : "—"}
        </Text>
      </View>
      <Pressable onPress={() => fetchData(true)} style={({ pressed }) => [styles.refreshBtn, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}>
        <Text style={styles.refreshBtnText}>Refresh</Text>
      </Pressable>
    </View>
  );

  const Filters = () => (
    <View style={styles.filtersRow}>
      {["all", "active", "inactive"].map((key) => {
        const label = key === "all" ? "All" : key === "active" ? "Active" : "Inactive";
        const isActive = filter === key;
        return (
          <Pressable key={key} onPress={() => setFilter(key)} style={({ pressed }) => [styles.chip, isActive && styles.chipActive, pressed && { opacity: 0.85 }]}>
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const Search = () => (
    <View style={styles.searchBox}>
      <TextInput placeholder="Cari lokasi / ID sensor…" placeholderTextColor="#9aa3b2" value={query} onChangeText={setQuery} style={styles.searchInput} returnKeyType="search" />
    </View>
  );

  const SensorCard = ({ item }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, friction: 7 }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
    const active = (item.isActive ?? true) === true;
    const busy = busyIds.has(String(item.id));

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable onPressIn={onPressIn} onPressOut={onPressOut} style={({ pressed }) => [styles.card, pressed && { opacity: 0.98 }]}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.sensorEmoji}>🌱</Text>
              <Text style={styles.cardTitle}>Sensor #{item.id}</Text>
            </View>

            {/* === NEW: Switch aktif/inaktif === */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.badgeText}>{active ? "Active" : "Inactive"}</Text>
              <Switch
                value={active}
                onValueChange={() => !busy && toggleActive(item)}
                disabled={busy}
              />
            </View>
          </View>

          <View style={styles.metrics}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Suhu</Text>
              <Text style={styles.metricValue}>
                {typeof item.temperature === "number" ? item.temperature.toFixed(1) : "-"}
                <Text style={styles.metricUnit}> °C</Text>
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Kelembapan</Text>
              <Text style={styles.metricValue}>
                {typeof item.humidity === "number" ? item.humidity : "-"}
                <Text style={styles.metricUnit}> %</Text>
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Tanah</Text>
              <Text style={styles.metricValue}>
                {typeof item.soilMoisture === "number" ? item.soilMoisture : "-"}
                <Text style={styles.metricUnit}> %</Text>
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>📍 {item.location || "—"}</Text>
            <Text style={styles.footerText}>⏱ {formatDateTime(item.timestamp || item.createdAt)}</Text>
          </View>

          {/* indikator kecil saat update */}
          {busy && <Text style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>Updating status…</Text>}
        </Pressable>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Memuat data sensor…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <SensorCard item={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
            <Header />
            <Search />
            <Filters />
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Gagal memuat</Text>
                <Text style={styles.errorText}>{String(error)}</Text>
                <Text style={styles.errorHelp}>Tarik ke bawah untuk coba lagi.</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<View style={styles.emptyBox}><Text style={styles.emptyEmoji}>🪴</Text><Text style={styles.emptyTitle}>Tidak ada data</Text><Text style={styles.muted}>Coba ubah filter atau lakukan refresh.</Text></View>}
        contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// … styles sama seperti sebelumnya …


const colors = {
  bg: "#f6f7fb",
  card: "#ffffff",
  text: "#0f172a",
  subtext: "#64748b",
  soft: "#eef2ff",
  chipBg: "#edf2f7",
  chipActive: "#1e293b",
  successBg: "#e7f7ed",
  dangerBg: "#fdecec",
  border: "#e5e7eb",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  appTitle: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: 0.2 },
  appSubtitle: { fontSize: 12, color: colors.subtext, marginTop: 2 },

  refreshBtn: {
    backgroundColor: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  refreshBtnText: { color: "#fff", fontWeight: "700" },

  searchBox: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
  },
  searchInput: {
    fontSize: 14,
    color: colors.text,
  },

  filtersRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  chip: {
    backgroundColor: colors.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipActive: {
    backgroundColor: colors.chipActive,
    borderColor: colors.chipActive,
  },
  chipText: { fontSize: 12, color: "#334155", fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sensorEmoji: { fontSize: 18 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },

  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeOn: { backgroundColor: colors.successBg },
  badgeOff: { backgroundColor: colors.dangerBg },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#0f172a" },

  metrics: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.soft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metricLabel: { fontSize: 12, color: colors.subtext, marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  metricUnit: { fontSize: 12, fontWeight: "600", color: colors.subtext },

  cardFooter: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 12, color: colors.subtext },

  errorBox: {
    backgroundColor: "#fff0f0",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ffd6d6",
  },
  errorTitle: { fontWeight: "800", marginBottom: 4, color: "#991b1b" },
  errorText: { color: "#7f1d1d", marginBottom: 4 },
  errorHelp: { color: "#7f1d1d", fontSize: 12 },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 36,
    gap: 6,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  muted: { color: colors.subtext, marginTop: 8 },
});
