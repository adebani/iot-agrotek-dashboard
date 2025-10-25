# 🌾 IoT Agrotek Dashboard (React Native + Expo Go)

Aplikasi **Dashboard IoT Agrotek** dibuat menggunakan **React Native (Expo)** sebagai bagian dari mata kuliah *Workshop Mobile App Development* semester 5.  
Aplikasi ini menampilkan data sensor pertanian (suhu, kelembapan udara, dan kelembapan tanah) menggunakan API dummy dari [MockAPI.io](https://mockapi.io).

---

## 🎯 Tujuan Pembelajaran
Mahasiswa mampu:
- Mengkonsumsi **REST API** menggunakan `fetch`.
- Mengelola **state dan re-render** di React Native.
- Mendesain tampilan **UI mobile modern dan interaktif**.
- Melakukan **CRUD sederhana (PUT untuk toggle status)** pada data sensor.
- Menjalankan aplikasi menggunakan **Expo Go**.

---

## 🧱 Teknologi yang Digunakan
| Komponen | Keterangan |
|-----------|-------------|
| ⚛️ React Native | Framework untuk membuat aplikasi mobile cross-platform |
| 🚀 Expo | Toolkit agar React Native lebih mudah dijalankan tanpa build native |
| 🌐 MockAPI.io | Layanan API dummy untuk simulasi data IoT |
| 💾 Fetch API | Untuk melakukan permintaan HTTP (GET, PUT, dsb) |
| 🎨 StyleSheet | Sistem styling bawaan React Native |

---

## 🧩 Fitur Aplikasi
✅ Menampilkan daftar sensor (dari API)  
✅ Refresh data dengan **pull-to-refresh**  
✅ Pencarian berdasarkan lokasi atau ID sensor  
✅ Filter **All / Active / Inactive**  
✅ **Switch** untuk mengubah status sensor (aktif ↔ tidak aktif) langsung ke server  
✅ Desain **modern, bersih, dan responsif**  
✅ Efek animasi **tekan (scale)** saat interaksi

---

## 📦 Struktur Folder

iot-agrotek-dashboard/
│
├── App.js # File utama React Native (semua logika dan UI)
├── package.json # Konfigurasi npm dan dependensi proyek
├── app.json # Konfigurasi Expo project
└── README.md # Dokumentasi proyek (file ini)

---

## 🪄 Langkah Instalasi & Menjalankan Aplikasi

### 1️⃣ Persiapan
Pastikan sudah terinstal:
- [Node.js LTS](https://nodejs.org/) (disarankan v20.x)
- Aplikasi **Expo Go** di HP (Android/iOS)
- Editor kode (disarankan VS Code)

### 2️⃣ Membuat Project
```bash
# Buat project baru
npx create-expo-app@latest iot-agrotek-dashboard

# Masuk ke folder project
cd iot-agrotek-dashboard
3️⃣ Ganti isi App.js
Salin kode dari file App.js di repositori ini ke dalam project kamu.

4️⃣ Jalankan Aplikasi
npx expo start
Pilih mode Tunnel di Metro bundler.

Scan QR code dengan aplikasi Expo Go di HP.

🔌 API Endpoint (MockAPI.io)
Contoh struktur data sensor yang digunakan:

{
  "id": "1",
  "temperature": 28.5,
  "humidity": 65,
  "soilMoisture": 40,
  "isActive": true,
  "timestamp": "2025-10-25T09:30:00Z",
  "location": "Greenhouse 1"
}
Endpoint:

Method	Endpoint	Deskripsi
GET	/sensor	Ambil semua data sensor
GET	/sensor/:id	Ambil data sensor tertentu
PUT	/sensor/:id	Ubah data sensor (mis. toggle isActive)
POST	/sensor	Tambah data sensor baru
DELETE	/sensor/:id	Hapus data sensor

🧠 Penjelasan Konsep Penting
🔄 State & Render
Data sensor disimpan di state raw menggunakan useState().
Setiap kali setRaw() dipanggil, tampilan otomatis diperbarui.

🌐 Fetch API
const res = await fetch(API_URL);
const json = await res.json();
setRaw(json);
Digunakan untuk mengambil data dari MockAPI.io.
