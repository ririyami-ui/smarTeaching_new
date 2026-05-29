# Smart Teaching — Rencana Optimasi (29 Mei 2026)

## ? Sudah Selesai

### Performa
- [x] Animasi berat dimatikan di mobile (aurora, welcome-float, pulse-glow)
- [x] ackdrop-filter dinonaktifkan di HP (GPU saver)
- [x] 	ouch-action: manipulation + hover disable di layar sentuh
- [x] GPU acceleration (will-change, 	ranslateZ(0)) di bottom nav
- [x] Gambar: loading="lazy" + decoding="async"

### UI Makeover
- [x] Bottom navigation: pill-style, gradient glow, premium icon (fill + stroke tipis)
- [x] Header: glass premium, shadow halus
- [x] Card system: class card-glass + card-premium tersebar di 36 file
- [x] Card.tsx reusable component
- [x] Route transisi: page-enter slide+fade 0.4s
- [x] StyledButton: gradient tiap varian, active scale, shimmer AI
- [x] StyledSelect: glass style, focus ring glow

### Dark Mode
- [x] Conflict useDarkMode.js vs .ts resolved (.js jadi re-export)
- [x] Dark mode toggle berfungsi normal

### AI (Smartty)
- [x] Knowledge base diperkaya: 23 fitur app, 8 koleksi Firestore, asesmen, siklus akademik, strategi mengajar

### Bug Fix
- [x] Footer nav 	o={item.path} hilang ? ditambahkan
- [x] Tombol Smartty hilang ? dikembalikan
- [x] Bullet • diganti | (encoding issue di Android)

---

## ?? Belum Dikerjakan (Prioritas Besok)

### 1. Bundle Size (dampak tinggi)
- Pisah mermaid, exceljs, jspdf, xlsx ke dynamic import per halaman
- Audit safelist di tailwind.config.js — hapus kelas tak terpakai
- Konversi logo PWA (1?MB PNG ? WebP)

### 2. Firebase Query Optimization
- Tambah limit() pada getDocs koleksi besar (grades, attendance, journals)
- Implementasi pagination/cursor untuk kelas >100 siswa
- Audit Firestore indexes untuk query umum

### 3. Android Native
- Setup splash.png + colors.xml untuk Capacitor
- Konfigurasi AndroidManifest.xml hardwareAccelerated
- StatusBar edge-to-edge via @capacitor/status-bar

### 4. PWA Offline
- Ubah cache strategi: 
etworkFirst untuk navigasi, staleWhileRevalidate untuk data API
- Cache halaman offline fallback

### 5. Error Handling
- Tambah ErrorBoundary per halaman (cegah crash total)
- Audit useEffect tanpa cleanup (memory leak)

### 6. TypeScript Strictness
- Aktifkan strict: true di tsconfig.json
- Ganti ny & s dengan tipe konkret

### 7. UX Polish
- Skeleton loading seragam di semua halaman
- Pull-to-refresh di halaman utama (absensi, nilai, jurnal)
- Swipe actions di tabel (edit/hapus cepat)

---

## ?? Cara Lanjut Besok
1. cd f:\app-firebase\Smart Teaching\smart-teaching-manager
2. 
pm run dev atau 
px vite
3. Prioritaskan nomor 1 (bundle size) — dampak paling terasa di HP Android
