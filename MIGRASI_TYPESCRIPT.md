# Panduan Migrasi Bertahap JavaScript ke TypeScript
**Proyek:** Smart Teaching Manager

Panduan ini dirancang untuk memigrasi aplikasi React + Vite dari `.jsx`/`.js` ke `.tsx`/`.ts` secara aman, **tanpa merusak UI** atau mengubah logika bisnis yang sudah berjalan.

---

## Aturan Emas (Golden Rules)
- [ ] **Jangan mengubah logika:** Saat mengubah ekstensi file dari `.jsx` menjadi `.tsx`, hanya tambahkan *tipe data*. Jangan memperbaiki bug atau menambah fitur pada commit yang sama.
- [ ] **Boleh digabung:** Tidak semua file harus berformat `.ts`/`.tsx` sekaligus. Biarkan `.js` dan `.ts` hidup berdampingan.
- [ ] **Gunakan `any` jika terjebak:** Daripada membuang waktu 2 jam mencari tipe data yang rumit, gunakan tipe `any` sementara, berikan komentar `// TODO: fix any`, lalu lanjutkan.

---

## Tahap 1: Persiapan Ekosistem (Hari 1)
Menambahkan dukungan TypeScript ke dalam _build system_ Vite.

- [x] Instal dependensi TypeScript utama:
  ```bash
  npm install -D typescript @types/react @types/react-dom
  ```
- [x] Buat file `tsconfig.json` di *root* proyek. Pastikan memiliki pengaturan dasar berikut:
  ```json
  {
    "compilerOptions": {
      "target": "ESNext",
      "useDefineForClassFields": true,
      "lib": ["DOM", "DOM.Iterable", "ESNext"],
      "allowJs": true,           // SANGAT PENTING: Mengizinkan file .js/.jsx
      "skipLibCheck": true,
      "esModuleInterop": false,
      "allowSyntheticDefaultImports": true,
      "strict": true,            // Bisa diatur ke false di awal jika terlalu banyak error
      "forceConsistentCasingInFileNames": true,
      "module": "ESNext",
      "moduleResolution": "Node",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true,            // Karena Vite yang akan melakukan build
      "jsx": "react-jsx"
    },
    "include": ["src"],
    "references": [{ "path": "./tsconfig.node.json" }]
  }
  ```
- [x] Buat file `tsconfig.node.json` (opsional untuk Vite config):
  ```json
  {
    "compilerOptions": {
      "composite": true,
      "module": "ESNext",
      "moduleResolution": "Node",
      "allowSyntheticDefaultImports": true
    },
    "include": ["vite.config.js"]
  }
  ```
- [x] (Opsional) Ubah `vite.config.js` menjadi `vite.config.ts`.
- [x] Uji coba jalankan aplikasi `npm run dev`. Pastikan tidak ada yang rusak.

---

## Tahap 2: Komponen Dasar & UI (Hari 2-3)
Mengubah komponen kecil (Dumb Components) yang tidak terhubung ke state global atau database.

- [x] Ubah nama file `StyledButton.jsx` menjadi `StyledButton.tsx`
  - [x] Definisikan `interface Props` (misal: `onClick`, `children`, `className`).
- [x] Ubah nama file `StyledInput.jsx` menjadi `StyledInput.tsx`
  - [x] Definisikan tipe untuk `value`, `onChange`, dll.
- [x] Ubah nama file `StyledSelect.jsx` menjadi `StyledSelect.tsx`
- [x] Ubah nama komponen rangka/layout seperti `Modal.jsx` menjadi `Modal.tsx`.
  - [x] Tentukan tipe `children: React.ReactNode`.
- [x] Uji coba jalankan `npm run dev` dan pastikan tampilan tombol/input di browser 100% sama persis.

---

## Tahap 3: File Utilitas & Konfigurasi (Hari 4-6)
Mengetikkan fungsi-fungsi bantuan agar *auto-complete* mulai bekerja dengan baik di seluruh proyek.

- [x] Ubah `src/utils/gemini.js` menjadi `src/utils/gemini.ts`.
  - [x] Definisikan parameter fungsi (misal: `prompt: string`).
- [x] Ubah `src/utils/ai/base.js` menjadi `src/utils/ai/base.ts`.
- [x] Ubah `src/utils/ai/asistenGuruService.js` menjadi `.ts`.
- [x] Ubah `src/utils/ai/academicService.js` menjadi `.ts`.
- [x] Ubah `src/utils/ai/portfolioService.js` menjadi `.ts`.
- [x] Ubah `src/utils/ai/quizService.js` menjadi `.ts`.
- [x] Ubah `src/utils/ai/studentService.js` menjadi `.ts`.
- [x] Ubah file Context dasar, contoh: `SettingsContext.jsx` menjadi `SettingsContext.tsx`.
  - [x] Definisikan `interface SettingsState` untuk *state* pengaturan.
- [x] Ubah file Context lain yang relevan (seperti `ChatContext.jsx` menjadi `.tsx`).

---

## Tahap 4: Deklarasi Tipe Data Utama / Skema DB (Hari 7)
Membuat satu sumber kebenaran (Source of Truth) untuk data yang datang dari Firebase / Firestore.

- [x] Buat file `src/types/index.ts` (atau `types.ts` di dalam `src/`).
- [x] Definisikan `interface UserProfile` (name, nip, school, geminiModel, dll).
- [x] Definisikan `interface Student` (id, name, nisn, gradeLevel).
- [x] Definisikan `interface AttendanceRecord` (date, status, notes).
- [x] Definisikan tipe balikan dari *hooks* atau servis Firebase.

---

## Tahap 5: Halaman Penuh & Logika Kompleks (Minggu 2 dst.)
Memigrasikan komponen perantara (*Smart Components*) dan halaman utama. Lakukan satu halaman per sesi kerja.

- [x] Migrasi `src/components/ProfileEditor.jsx` -> `.tsx`.
- [x] Migrasi `src/hooks/useVoiceAssistant.js` -> `.ts`.
- [x] Migrasi daftar halaman utama:
  - [x] `Dashboard.jsx` -> `.tsx`
  - [x] `AsistenGuruPage.jsx` -> `.tsx`
  - [x] `PortfolioPage.jsx` -> `.tsx`
  - [x] `AbsensiPage.jsx` -> `.tsx`
  - [x] `JurnalPage.jsx` -> `.tsx`
  - [x] `NilaiPage.jsx` -> `.tsx`
  - [x] `RekapIndividuPage.jsx` -> `.tsx`
- [x] Tangani semua pesan *error* "merah" dari TypeScript compiler (Clean `tsc --noEmit`).

---

## Evaluasi Akhir
- [x] Semua file utama di `src/pages/` dan `src/utils/ai/` sudah dalam `.tsx`/`.ts`.
- [x] Tidak ada tipe `any` yang tertinggal di area kritikal (beberapa dipertahankan as-per-Golden-Rule untuk kecepatan).
- [x] Jalankan `npx tsc --noEmit` di terminal untuk memastikan aplikasi lulus uji kompilasi TypeScript 100%.
