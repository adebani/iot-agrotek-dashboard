# 📘 Kode Berkomentar — IoT Agrotek Dashboard (React Native + Expo)

Dokumen ini menjelaskan **baris demi baris** kode `App.js` agar mahasiswa memahami:
- Alur **pengambilan data** (fetch) dari API MockAPI.io
- Pengelolaan **state** dengan React Hooks
- **Filter, pencarian, pull-to-refresh**
- **Toggle Active/Inactive** ke server (PUT /sensor/:id) dengan **optimistic update**
- Desain UI modern yang **responsif** dan rapi

> Aplikasi utama ada di file `App.js`.  
> Jalankan dengan `npx expo start` dan buka di **Expo Go**.

---

## 🔌 Endpoint API
GET https://68fc3d5096f6ff19b9f49212.mockapi.io/api/v1/sensor
PUT https://68fc3d5096f6ff19b9f49212.mockapi.io/api/v1/sensor/:id (toggle isActive)

php
Copy code

---

## 🧠 Konsep Kunci (Ringkas)
- **useState**: menyimpan state UI (data, loading, filter, dsb.)
- **useEffect**: ambil data saat komponen pertama kali tampil.
- **useMemo**: hitung ulang data terfilter hanya saat dependensi berubah (efisien).
- **useCallback**: “mengunci” referensi fungsi (bagus untuk handler).
- **Optimistic update**: UI berubah dulu, API dipanggil, jika gagal di-rollback.
- **FlatList**: render list yang efisien untuk data banyak.

---

## 🗂️ App.js (Kode Berkomentar)

> Tempelkan **seluruh** kode di bawah ini ke file `App.js`.

```javascript
// Mengimpor React dan berbagai hook untuk state, efek samping, memoization, referensi animasi, dan callback
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
// Mengimpor komponen bawaan React Native untuk UI, list, input, animasi, switch, dan alert
import {
  SafeAreaView, View, Text, FlatList, ActivityIndicator,
  RefreshControl, StyleSheet, TextInput, Pressable, Animated, Switch, Alert
} from "react-native";

// URL dasar API MockAPI untuk resource 'sensor'
const API_URL = "https://68fc3d5096f6ff19b9f49212.mockapi.io/api/v1/sensor";

// Komponen utama aplikasi
export default function App() {
  // ====== STATE GLOBAL HALAMAN ======
  const [raw, setRaw] = useState([]);                 // Menampung data sensor mentah dari API
  const [loading, setLoading] = useState(true);       // Indikator loading saat pertama kali ambil data
  const [refreshing, setRefreshing] = useState(false);// Indikator untuk pull-to-refresh FlatList
  const [error, setError] = useState(null);           // Menyimpan pesan error jaringan/HTTP
  const [query, setQuery] = useState("");             // Kata kunci pencarian (lokasi/ID)
  const [filter, setFilter] = useState("all");        // Status filter: 'all' | 'active' | 'inactive'
  const [lastUpdated, setLastUpdated] = useState(null);// Timestamp terakhir kali data berhasil diambil
  const [busyIds, setBusyIds] = useState(new Set());  // Set berisi ID item yang sedang di-update (toggle)

  // ====== FUNGSI MENGAMBIL DATA DARI API ======
  const fetchData = async (showSpinner = true) => {   // showSpinner menentukan apakah tampil loading besar
    try {
      if (showSpinner) setLoading(true);              // Nyalakan indikator loading utama jika diminta
      setError(null);                                 // Reset error sebelum request baru
      const res = await fetch(API_URL);               // Panggil endpoint GET /sensor
      if (!res.ok) throw new Error(`HTTP ${res.status}`); // Validasi status HTTP (2xx = OK)
      const json = await res.json();                  // Parse body response menjadi objek/array JS
      const arr = Array.isArray(json) ? json : [json];// Pastikan bentuknya array untuk FlatList
      // Urutkan data terbaru di atas (berdasarkan timestamp/createdAt jika ada)
      arr.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));
      setRaw(arr);                                    // Simpan data ke state
      setLastUpdated(new Date());                     // Catat kapan terakhir update sukses
    } catch (e) {
      setError(e.message || "Gagal memuat data");     // Simpan pesan error agar ditampilkan ke user
    } finally {
      setLoading(false);                              // Matikan indikator loading utama
      setRefreshing(false);                           // Matikan indikator pull-to-refresh
    }
  };

  // Ambil data pertama kali ketika komponen mount
  useEffect(() => { fetchData(true); }, []);          // Dependency array kosong → hanya sekali jalan

  // Handler untuk gesture tarik-ke-bawah (pull-to-refresh)
  const onRefresh = useCallback(() => {               // useCallback agar referensi fungsi stabil
    setRefreshing(true);                              // Nyalakan indikator refresh kecil
    fetchData(false);                                 // Ambil data tanpa spinner utama
  }, []);

  // === FUNGSI BARU: toggle status aktif/inaktif via API ===
  const toggleActive = async (item) => {
    const id = String(item.id);                       // Pastikan ID berbentuk string (MockAPI gunakan string)
    const nextValue = !(item.isActive ?? true);       // Nilai baru = kebalikan dari nilai sekarang (default true)

    // Optimistic update: UI lebih responsif (ubah dulu, kirim request kemudian)
    setBusyIds(prev => new Set(prev).add(id));        // Tandai item ini sedang di-update (matikan switch sementara)
    setRaw(curr => curr.map(x => x.id == id ? { ...x, isActive: nextValue } : x)); // Update state lokal segera

    try {
      // Request ke server untuk menyimpan perubahan status
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",                                // Bisa juga "PATCH" di MockAPI
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextValue }),// Hanya kirim field yang diubah
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);        // Jika gagal (4xx/5xx), lempar error
      }
      // Sinkronkan data dari server (jaga-jaga jika server mengubah field lain)
      const updated = await res.json();
      setRaw(curr => curr.map(x => x.id == id ? { ...x, ...updated } : x));
    } catch (e) {
      // Jika gagal, rollback perubahan lokal agar konsisten dengan server
      setRaw(curr => curr.map(x => x.id == id ? { ...x, isActive: item.isActive ?? true } : x));
      Alert.alert("Gagal mengubah status", String(e?.message || e)); // Tampilkan notifikasi kesalahan
    } finally {
      // Lepas status sibuk agar switch bisa dipakai lagi
      setBusyIds(prev => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  // ====== MEMBENTUK DATA TERFILTER UNTUK DITAMPILKAN ======
  const filtered = useMemo(() => {                    // useMemo agar perhitungan efisien
    const q = query.trim().toLowerCase();             // Normalisasi teks pencarian
    return raw.filter((item) => {                     // Saring berdasarkan filter dan query
      const byFilter =
        filter === "all"
          ? true
          : filter === "active"
          ? (item.isActive ?? true) === true
          : (item.isActive ?? true) === false;        // Logika filter status

      const byQuery = q
        ? (item.location || "").toLowerCase().includes(q) ||
          String(item.id || "").toLowerCase().includes(q) // Pencarian di lokasi atau id
        : true;

      return byFilter && byQuery;                     // Item lolos jika memenuhi keduanya
    });
  }, [raw, query, filter]);                           // Recompute jika data/query/filter berubah

  // ====== UTIL: format tanggal/waktu jadi string lokal ======
  const formatDateTime = (v) => { try { return (v instanceof Date ? v : new Date(v)).toLocaleString(); } catch { return "-"; } };

  // ====== KOMPONEN HEADER (judul, update time, dan tombol refresh) ======
  const Header = () => (
    <View style={styles.header}>                      {/* Baris header dengan layout horizontal */}
      {/* Bagian kiri: judul + waktu update */}
      <View style={{ flex: 1 }}>                      {/* flex:1 agar teks tidak mendorong tombol ke luar layar */}
        <Text style={styles.appTitle}>IoT Agrotek</Text>  {/* Judul aplikasi */}
        <Text style={styles.appSubtitle}>                 {/* Subjudul + timestamp */}
          Dashboard Sensors •{" "}
          {lastUpdated ? `Updated ${formatDateTime(lastUpdated)}` : "—"}
        </Text>
      </View>

      {/* Bagian kanan: tombol refresh */}
      <Pressable
        onPress={() => fetchData(true)}               // Klik → ambil data ulang dengan spinner
        style={({ pressed }) => [                     // Efek menekan (scale & opacity)
          styles.refreshBtn,
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        ]}
      >
        <Text style={styles.refreshBtnText}>⟳ Refresh</Text>  {/* Label tombol */}
      </Pressable>
    </View>

  );

  // ====== KOMPONEN FILTER CHIP ======
  const Filters = () => (
    <View style={styles.filtersRow}>                  {/* Wadah chip filter */}
      {["all", "active", "inactive"].map((key) => {   {/* Render tiga chip dari array */}
        const label = key === "all" ? "All" : key === "active" ? "Active" : "Inactive"; // Teks chip
        const isActive = filter === key;              // Status chip aktif/tidak
        return (
          <Pressable key={key} onPress={() => setFilter(key)} style={({ pressed }) => [styles.chip, isActive && styles.chipActive, pressed && { opacity: 0.85 }]}>
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  // ====== KOMPONEN SEARCH BOX ======
  const Search = () => (
    <View style={styles.searchBox}>                   {/* Kotak input pencarian */}
      <TextInput
        placeholder="Cari lokasi / ID sensor…"        // Placeholder informatif
        placeholderTextColor="#9aa3b2"                // Warna placeholder
        value={query}                                  // Nilai terikat ke state query
        onChangeText={setQuery}                        // Setter state saat teks berubah
        style={styles.searchInput}                     // Gaya input
        returnKeyType="search"                         // Tipe tombol enter di keyboard
      />
    </View>
  );

  // ====== KOMPONEN KARTU SENSOR (tiap item list) ======
  const SensorCard = ({ item }) => {
    const scale = useRef(new Animated.Value(1)).current; // Nilai animasi untuk efek tekan (scale)
    const onPressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, friction: 7 }).start(); // Saat ditekan, kecilkan sedikit
    const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }).start();    // Saat lepas, kembalikan normal
    const active = (item.isActive ?? true) === true;    // Hitung status aktif item (default true)
    const busy = busyIds.has(String(item.id));          // Apakah item sedang di-update (toggle)?

    return (
      <Animated.View style={{ transform: [{ scale }] }}>   {/* Terapkan transform scale ke kartu */}
        <Pressable onPressIn={onPressIn} onPressOut={onPressOut} style={({ pressed }) => [styles.card, pressed && { opacity: 0.98 }]}>
          <View style={styles.cardHeader}>               {/* Baris atas kartu: judul + switch */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.sensorEmoji}>🌱</Text>  {/* Ikon/emoji tanaman */}
              <Text style={styles.cardTitle}>Sensor #{item.id}</Text> {/* Judul kartu */}
            </View>

            {/* === Switch aktif/inaktif dengan ruang tetap agar tidak melebar === */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[styles.badgeText, { marginRight: 6 }]}>
                {active ? "Active" : "Inactive"}          {/* Label status */}
              </Text>
              <View
                style={{
                  width: 48,                               // Lebar tetap untuk menahan Switch
                  alignItems: "flex-end",                  // Rapat ke kanan dalam wadah kecil
                }}
              >
                <Switch
                  style={{ transform: [{ scale: 0.9 }] }} // Sedikit perkecil agar proporsional
                  value={active}                           // Nilai switch sesuai status aktif
                  onValueChange={() => !busy && toggleActive(item)} // Panggil toggle jika tidak busy
                  disabled={busy}                          // Nonaktifkan saat request sedang berjalan
                />
              </View>
            </View>
          </View>

          {/* Tiga metrik utama yang ditampilkan di kartu */}
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

          {/* Footer kartu: lokasi dan waktu pembacaan */}
          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>📍 {item.location || "—"}</Text>
            <Text style={styles.footerText}>⏱ {formatDateTime(item.timestamp || item.createdAt)}</Text>
          </View>

          {/* Indikator kecil saat proses update status berlangsung */}
          {busy && <Text style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>Updating status…</Text>}
        </Pressable>
      </Animated.View>
    );
  };

  // ====== TAMPILAN SAAT LOADING AWAL (SEBELUM DATA ADA) ======
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />             {/* Spinner besar di tengah layar */}
        <Text style={styles.muted}>Memuat data sensor…</Text>
      </SafeAreaView>
    );
  }

  // ====== TATA LETAK UTAMA: LIST SENSOR ======
  return (
    <SafeAreaView style={styles.container}>            {/* Latar aplikasi dengan warna dasar */}
      <FlatList
        data={filtered}                                // Data yang sudah difilter & dicari
        keyExtractor={(item) => String(item.id)}       // Kunci unik tiap item untuk performa list
        renderItem={({ item }) => <SensorCard item={item} />} // Komponen untuk render tiap baris
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} // Pull-to-refresh
        ListHeaderComponent={                          // Header list (judul, search, filter, error box)
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
            <Header />
            <Search />
            <Filters />
            {error ? (                                 // Jika ada error jaringan, tampilkan kotak info
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Gagal memuat</Text>
                <Text style={styles.errorText}>{String(error)}</Text>
                <Text style={styles.errorHelp}>Tarik ke bawah untuk coba lagi.</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={                           // Jika data kosong (setelah filter/pencarian)
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🪴</Text>
            <Text style={styles.emptyTitle}>Tidak ada data</Text>
            <Text style={styles.muted}>Coba ubah filter atau lakukan refresh.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 16 }} // Spasi bawah list
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}       // Jarak antar kartu
        showsVerticalScrollIndicator={false}           // Sembunyikan scrollbar agar tampak bersih
      />
    </SafeAreaView>
  );
}

// Palet warna sederhana untuk konsistensi UI
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

// StyleSheet untuk seluruh komponen
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },                     // Latar belakang halaman
  center: { alignItems: "center", justifyContent: "center" },             // Pusatkan konten

  header: {                                                                // Bar header atas
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    paddingHorizontal: 4,                                                  // Seragam dengan konten list
  },

  refreshBtn: {                                                            // Style tombol refresh
    backgroundColor: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 90,                                                          // Lebar minimum agar tidak gepeng
    alignSelf: "flex-start",                                               // Hindari vertical stretch
  },
  refreshBtnText: { color: "#fff", fontWeight: "700" },                    // Teks tombol

  searchBox: {                                                             // Wadah input pencarian
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
  },
  searchInput: {                                                           // Style input teks
    fontSize: 14,
    color: colors.text,
  },

  filtersRow: {                                                             // Baris chip filter
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  chip: {                                                                   // Chip default
    backgroundColor: colors.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipActive: {                                                             // Chip saat terpilih
    backgroundColor: colors.chipActive,
    borderColor: colors.chipActive,
  },
  chipText: { fontSize: 12, color: "#334155", fontWeight: "600" },         // Teks chip default
  chipTextActive: { color: "#fff" },                                        // Teks chip aktif

  card: {                                                                   // Kartu item sensor
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
  cardHeader: {                                                             // Header kartu (judul + switch)
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sensorEmoji: { fontSize: 18 },                                            // Ukuran emoji
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },       // Judul kartu

  badge: {                                                                  // (Opsional) gaya badge status
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeOn: { backgroundColor: colors.successBg },                           // Warna aktif
  badgeOff: { backgroundColor: colors.dangerBg },                           // Warna nonaktif
  badgeText: { fontSize: 12, fontWeight: "700", color: "#0f172a" },         // Teks badge

  metrics: {                                                                // Baris metrik
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  metricBox: {                                                              // Kotak metrik individual
    flex: 1,
    backgroundColor: colors.soft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metricLabel: { fontSize: 12, color: colors.subtext, marginBottom: 4 },    // Label kecil
  metricValue: { fontSize: 18, fontWeight: "800", color: colors.text },     // Angka metrik
  metricUnit: { fontSize: 12, fontWeight: "600", color: colors.subtext },   // Satuan metrik

  cardFooter: {                                                              // Footer kartu
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 12, color: colors.subtext },                      // Teks footer

  errorBox: {                                                                // Kotak pesan error
    backgroundColor: "#fff0f0",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ffd6d6",
  },
  errorTitle: { fontWeight: "800", marginBottom: 4, color: "#991b1b" },     // Judul error
  errorText: { color: "#7f1d1d", marginBottom: 4 },                          // Isi pesan error
  errorHelp: { color: "#7f1d1d", fontSize: 12 },                             // Bantuan ringkas

  emptyBox: {                                                                // Tampilan saat list kosong
    alignItems: "center",
    paddingVertical: 36,
    gap: 6,
  },
  emptyEmoji: { fontSize: 36 },                                              // Emoji besar
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.text },       // Judul kosong
  muted: { color: colors.subtext, marginTop: 8 },                            // Teks dengan warna lembut
});
