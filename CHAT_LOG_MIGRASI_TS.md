# Log Percakapan: Mengapa Memilih TypeScript & Keamanannya pada UI

**Topik:** Transisi dari JavaScript ke TypeScript untuk pengembangan Smart Teaching Manager.

### 1. Mengapa Programmer Handal Lebih Memilih TypeScript?
* **Mencegah Bug Sejak Dini:** TS mendeteksi kesalahan tipe data secara langsung (garis bawah merah di VS Code) saat kita mengetik, sebelum aplikasi dijalankan di *browser*.
* **Autocomplete Jauh Lebih Pintar:** Kita tidak perlu menebak nama properti objek yang digunakan, VS Code paham 100% struktur data berkat TS.
* **Kode Sebagai Dokumentasi Hidup:** Mudah melihat input dan output dari masing-masing fungsi.
* **Refactoring Skala Besar Jauh Lebih Aman:** Mengganti nama variabel dapat mendeteksi file lain yang ikut terdampak secara instan.

### 2. Apakah Pindah ke TS Akan Mengubah Logika atau Merusak UI?
**Jawabannya: TIDAK.**
TypeScript (TS) sepenuhnya merupakan ekstensi untuk penulisan tipe data di *fase pengembangan*. Saat proyek di-*build* (dikompilasi untuk *server*), semua kode TS akan dikonversi sepenuhnya menjadi JavaScript murni tanpa bersisa, sehingga tidak akan memengaruhi tata letak UI atau *logic* internal *runtime* sama sekali.

**Alasan mengapa terkadang UI rusak saat TS dikerjakan programmer lain sebelumnya:**
1. Masalah pada proses setup *bundler* atau ekstensi `.tsx` yang kurang selaras dengan React.
2. Penemuan sebuah *bug* tersembunyi berkat TS, dan niat baik memperbaiki *bug* tersebut secara tidak sengaja mengubah logika.
3. Sengaja melakukan perombakan program (Refactoring) di waktu yang sama saat mengganti ekstensi file.

### 3. Kunci Kesuksesan (Golden Rule)
* Gunakan **Migrasi Bertahap**. Jangan pernah menyentuh puluhan *file* dalam satu waktu.
* Ubah dari komponen terkecil (Contoh: `Button`, `Input`).
* Jika berhadapan dengan data yang membingungkan atau sangat kompleks di hari-hari awal, **jangan diselesaikan** dengan merombak alur datanya; cukup berikan TS tipe `<any>` sementara, berikan `// TODO: fix TS`, lalu lanjutkan (*progress over perfection*).

*(Log percakapan ini disimpan sesuai permintaan Anda agar dapat ditinjau ulang kapan saja).*
