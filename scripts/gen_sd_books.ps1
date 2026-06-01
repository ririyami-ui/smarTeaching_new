$sdDir = "F:\app-firebase\Smart Teaching\smart-teaching-manager\src\utils\data\books\sd"

# === MATEMATIKA SD ===
$mathData = @{
    "1" = @(
        @{no=1; title="Bilangan 1-10"; pages="1-32"; semester="Ganjil"; sub_topics=@("Membilang 1-5","Membilang 6-10","Menulis Lambang Bilangan","Membandingkan Banyak Benda"); key_terms=@("bilangan","angka","membilang")},
        @{no=2; title="Penjumlahan dan Pengurangan"; pages="33-64"; semester="Ganjil"; sub_topics=@("Penjumlahan 1-10","Pengurangan 1-10","Soal Cerita Sederhana"); key_terms=@("penjumlahan","pengurangan","operasi hitung")},
        @{no=3; title="Bangun Ruang dan Bangun Datar"; pages="65-96"; semester="Ganjil"; sub_topics=@("Mengenal Bangun Datar","Mengenal Bangun Ruang","Menyusun Bangun"); key_terms=@("bangun datar","bangun ruang","geometri")},
        @{no=4; title="Bilangan 11-20"; pages="97-128"; semester="Genap"; sub_topics=@("Membilang 11-20","Nilai Tempat","Penjumlahan 11-20","Pengurangan 11-20"); key_terms=@("bilangan","nilai tempat","operasi hitung")},
        @{no=5; title="Waktu dan Panjang"; pages="129-160"; semester="Genap"; sub_topics=@("Membaca Jam","Hari dan Bulan","Membandingkan Panjang","Mengukur dengan Satuan Tak Baku"); key_terms=@("waktu","panjang","satuan tak baku")},
        @{no=6; title="Pola Bilangan"; pages="161-192"; semester="Genap"; sub_topics=@("Pola Bilangan Sederhana","Pola Gambar","Membuat Pola"); key_terms=@("pola","bilangan","pola gambar")}
    )
    "2" = @(
        @{no=1; title="Bilangan Cacah 1-100"; pages="1-36"; semester="Ganjil"; sub_topics=@("Membilang Loncat","Nilai Tempat (Satuan-Puluhan)","Perbandingan Bilangan","Urutan Bilangan"); key_terms=@("bilangan cacah","nilai tempat","membilang loncat")},
        @{no=2; title="Penjumlahan dan Pengurangan Lanjutan"; pages="37-70"; semester="Ganjil"; sub_topics=@("Penjumlahan dengan Teknik Menyimpan","Pengurangan dengan Teknik Meminjam","Operasi Hitung Campuran"); key_terms=@("penjumlahan","pengurangan","teknik menyimpan")},
        @{no=3; title="Perkalian dan Pembagian Dasar"; pages="71-106"; semester="Ganjil"; sub_topics=@("Konsep Perkalian","Konsep Pembagian","Perkalian dengan Bilangan 1-5"); key_terms=@("perkalian","pembagian","operasi hitung")},
        @{no=4; title="Bangun Datar dan Simetri"; pages="107-138"; semester="Genap"; sub_topics=@("Sifat Bangun Datar","Simetri Lipat","Simetri Putar","Menggambar Bangun Datar"); key_terms=@("bangun datar","simetri","geometri")},
        @{no=5; title="Pengukuran Berat dan Panjang"; pages="139-170"; semester="Genap"; sub_topics=@("Mengukur Berat","Mengukur Panjang","Satuan Baku","Konversi Satuan Sederhana"); key_terms=@("berat","panjang","satuan baku")},
        @{no=6; title="Uang"; pages="171-200"; semester="Genap"; sub_topics=@("Mengenal Uang Rupiah","Nilai Uang","Kesetaraan Nilai Uang","Berbelanja"); key_terms=@("uang","rupiah","belanja")}
    )
    "3" = @(
        @{no=1; title="Bilangan Cacah 1-1.000"; pages="1-38"; semester="Ganjil"; sub_topics=@("Nilai Tempat (Ratusan-Puluhan-Satuan)","Membaca Bilangan 1-1.000","Membandingkan Bilangan","Urutan Bilangan"); key_terms=@("bilangan cacah","nilai tempat","ratusan")},
        @{no=2; title="Operasi Hitung"; pages="39-76"; semester="Ganjil"; sub_topics=@("Penjumlahan dan Pengurangan","Perkalian dan Pembagian","Operasi Campuran","Soal Cerita"); key_terms=@("operasi hitung","perkalian","pembagian")},
        @{no=3; title="Uang dan Kaitannya dengan Bilangan"; pages="77-108"; semester="Ganjil"; sub_topics=@("Menghitung Nilai Uang","Kesetaraan Uang","Menghitung Kembalian","Pengelolaan Keuangan Sederhana"); key_terms=@("uang","keuangan","kembalian")},
        @{no=4; title="Bangun Datar dan Bangun Ruang"; pages="109-144"; semester="Genap"; sub_topics=@("Unsur Bangun Datar","Unsur Bangun Ruang","Luas Bangun Datar Sederhana","Volume Bangun Ruang Sederhana"); key_terms=@("bangun datar","bangun ruang","luas","volume")},
        @{no=5; title="Pengukuran"; pages="145-180"; semester="Genap"; sub_topics=@("Mengukur Panjang dan Berat","Konversi Satuan","Mengukur Waktu","Membaca Jam Digital dan Analog"); key_terms=@("pengukuran","satuan","waktu")},
        @{no=6; title="Pecahan Sederhana"; pages="181-216"; semester="Genap"; sub_topics=@("Mengenal Pecahan","Pecahan Senilai","Membandingkan Pecahan","Pecahan dalam Soal Cerita"); key_terms=@("pecahan","pembilang","penyebut")}
    )
    "4" = @(
        @{no=1; title="Bilangan Cacah Besar"; pages="1-36"; semester="Ganjil"; sub_topics=@("Nilai Tempat hingga Jutaan","Membaca Bilangan Besar","Pembulatan","Taksiran"); key_terms=@("bilangan cacah","pembulatan","taksiran")},
        @{no=2; title="Faktor dan Kelipatan"; pages="37-72"; semester="Ganjil"; sub_topics=@("Faktor Bilangan","Kelipatan Bilangan","FPB","KPK"); key_terms=@("faktor","kelipatan","FPB","KPK")},
        @{no=3; title="Perkalian dan Pembagian Lanjutan"; pages="73-110"; semester="Ganjil"; sub_topics=@("Perkalian Ratusan","Pembagian dengan Hasil Dua Angka","Operasi Hitung Campuran","Soal Cerita"); key_terms=@("perkalian","pembagian","operasi hitung")},
        @{no=4; title="Bangun Datar dan Luas"; pages="111-148"; semester="Genap"; sub_topics=@("Keliling Bangun Datar","Luas Bangun Datar","Segitiga dan Segiempat","Hubungan Antar Bangun"); key_terms=@("bangun datar","keliling","luas")},
        @{no=5; title="Pecahan dan Desimal"; pages="149-184"; semester="Genap"; sub_topics=@("Pecahan Biasa dan Campuran","Desimal","Penjumlahan Pecahan","Pengurangan Pecahan"); key_terms=@("pecahan","desimal","operasi pecahan")},
        @{no=6; title="Pengukuran Sudut"; pages="185-216"; semester="Genap"; sub_topics=@("Mengenal Sudut","Mengukur Sudut","Jenis Sudut","Menggambar Sudut"); key_terms=@("sudut","busur","derajat")}
    )
    "5" = @(
        @{no=1; title="Operasi Hitung Pecahan"; pages="1-40"; semester="Ganjil"; sub_topics=@("Penjumlahan Pecahan Berbeda Penyebut","Pengurangan Pecahan","Perkalian Pecahan","Pembagian Pecahan"); key_terms=@("pecahan","operasi hitung","penyebut")},
        @{no=2; title="Kecepatan dan Debit"; pages="41-78"; semester="Ganjil"; sub_topics=@("Konsep Kecepatan","Menghitung Kecepatan","Konsep Debit","Menghitung Debit"); key_terms=@("kecepatan","debit","jarak","waktu")},
        @{no=3; title="Bangun Ruang dan Volume"; pages="79-118"; semester="Ganjil"; sub_topics=@("Volume Kubus","Volume Balok","Jaring-Jaring Bangun Ruang","Luas Permukaan"); key_terms=@("bangun ruang","volume","kubus","balok")},
        @{no=4; title="Statistika Sederhana"; pages="119-154"; semester="Genap"; sub_topics=@("Mengumpulkan Data","Menyajikan Data dalam Tabel","Diagram Batang","Diagram Lingkaran"); key_terms=@("data","diagram","statistika")},
        @{no=5; title="Bilangan Berpangkat dan Akar"; pages="155-188"; semester="Genap"; sub_topics=@("Bilangan Berpangkat","Akar Pangkat Dua","Akar Pangkat Tiga","Operasi Bilangan Berpangkat"); key_terms=@("pangkat","akar","bilangan")},
        @{no=6; title="Skala dan Denah"; pages="189-220"; semester="Genap"; sub_topics=@("Konsep Skala","Membaca Denah","Membuat Denah","Perbandingan Skala"); key_terms=@("skala","denah","perbandingan")}
    )
    "6" = @(
        @{no=1; title="Bilangan Bulat"; pages="1-36"; semester="Ganjil"; sub_topics=@("Mengenal Bilangan Bulat","Operasi Bilangan Bulat","Garis Bilangan","Soal Cerita Bilangan Bulat"); key_terms=@("bilangan bulat","positif","negatif")},
        @{no=2; title="Operasi Hitung Lanjutan"; pages="37-74"; semester="Ganjil"; sub_topics=@("Perpangkatan dan Akar","Operasi Campuran","Pembulatan dan Taksiran","Kelipatan dan Faktor"); key_terms=@("operasi hitung","perpangkatan","akar")},
        @{no=3; title="Bangun Ruang dan Luas Permukaan"; pages="75-112"; semester="Ganjil"; sub_topics=@("Prisma dan Limas","Tabung dan Kerucut","Luas Permukaan","Volume Bangun Ruang"); key_terms=@("bangun ruang","luas permukaan","volume","prisma")},
        @{no=4; title="Statistika dan Peluang"; pages="113-148"; semester="Genap"; sub_topics=@("Rata-Rata Hitung","Median","Modus","Peluang Sederhana"); key_terms=@("rata-rata","median","modus","peluang")},
        @{no=5; title="Sistem Koordinat"; pages="149-182"; semester="Genap"; sub_topics=@("Bidang Koordinat","Titik Koordinat","Menggambar Bangun pada Koordinat","Pencerminan"); key_terms=@("koordinat","sumbu x","sumbu y")},
        @{no=6; title="Pengolahan Data"; pages="183-220"; semester="Genap"; sub_topics=@("Mengumpulkan dan Mengolah Data","Menyajikan Data","Menafsirkan Data","Membuat Kesimpulan"); key_terms=@("data","diagram","pengolahan data")}
    )
}

foreach ($kelas in $mathData.Keys) {
    $chapters = $mathData[$kelas]
    $json = @{
        bookId = "sd-mat-$kelas"
        isbn = "978-623-194-0$kelas`1-X"
        publisher = "Kemendikbudristek"
        chapters = $chapters
    } | ConvertTo-Json -Depth 4
    $json | Set-Content -Path "$sdDir\matematika_$kelas.json" -Encoding UTF8
}

# === BAHASA INDONESIA SD ===
$indoData = @{
    "1" = @(
        @{no=1; title="Aku Suka Membaca"; pages="1-32"; semester="Ganjil"; sub_topics=@("Mengenal Huruf","Membaca Suku Kata","Membaca Kata Sederhana","Menulis Huruf"); key_terms=@("membaca","menulis","huruf")},
        @{no=2; title="Keluargaku"; pages="33-64"; semester="Ganjil"; sub_topics=@("Mengenal Anggota Keluarga","Menulis Nama Anggota Keluarga","Bercerita tentang Keluarga","Menyimak Cerita"); key_terms=@("keluarga","bercerita","menyimak")},
        @{no=3; title="Lingkungan Sekolah"; pages="65-96"; semester="Ganjil"; sub_topics=@("Mengenal Lingkungan Sekolah","Tata Tertib Sekolah","Bertanya dan Menjawab","Belajar di Rumah dan Sekolah"); key_terms=@("sekolah","tata tertib","bertanya")},
        @{no=4; title="Binatang di Sekitarku"; pages="97-128"; semester="Genap"; sub_topics=@("Mengenal Binatang","Ciri-Ciri Binatang","Mendeskripsikan Binatang","Membaca Cerita Binatang"); key_terms=@("binatang","deskripsi","cerita")},
        @{no=5; title="Bermain dan Belajar"; pages="129-160"; semester="Genap"; sub_topics=@("Kata-Kata Baru","Menyusun Kalimat Sederhana","Membaca Cerita Pendek","Menulis Kalimat"); key_terms=@("kalimat","kata","cerita")},
        @{no=6; title="Tanaman di Sekitarku"; pages="161-192"; semester="Genap"; sub_topics=@("Mengenal Tanaman","Merawat Tanaman","Manfaat Tanaman","Membaca Puisi Sederhana"); key_terms=@("tanaman","merawat","puisi")}
    )
    "2" = @(
        @{no=1; title="Kegiatan Sehari-Hari"; pages="1-34"; semester="Ganjil"; sub_topics=@("Kosakata Baru","Menyusun Kalimat","Bercerita tentang Kegiatan","Menyimak Petunjuk"); key_terms=@("kegiatan","kalimat","petunjuk")},
        @{no=2; title="Tempat Umum"; pages="35-68"; semester="Ganjil"; sub_topics=@("Mengenal Tempat Umum","Pertanyaan dan Jawaban","Mendeskripsikan Tempat","Membaca Denah Sederhana"); key_terms=@("tempat umum","deskripsi","denah")},
        @{no=3; title="Benda di Sekitar"; pages="69-100"; semester="Ganjil"; sub_topics=@("Benda Hidup dan Tak Hidup","Sifat Benda","Kegunaan Benda","Mengelompokkan Benda"); key_terms=@("benda","sifat","kelompok")},
        @{no=4; title="Pengalaman Pribadi"; pages="101-134"; semester="Genap"; sub_topics=@("Menceritakan Pengalaman","Menulis Cerita Sederhana","Membaca Cerita Rakyat","Nilai Moral dalam Cerita"); key_terms=@("pengalaman","cerita","moral")},
        @{no=5; title="Budaya dan Kesenian"; pages="135-168"; semester="Genap"; sub_topics=@("Mengenal Budaya Daerah","Lagu Daerah","Tarian Daerah","Membaca Cerita Budaya"); key_terms=@("budaya","kesenian","daerah")},
        @{no=6; title="Lingkungan dan Alam"; pages="169-200"; semester="Genap"; sub_topics=@("Menjaga Lingkungan","Membaca Teks Informasi","Menulis Laporan Sederhana","Presentasi"); key_terms=@("lingkungan","laporan","presentasi")}
    )
    "3" = @(
        @{no=1; title="Pertumbuhan dan Perkembangan"; pages="1-36"; semester="Ganjil"; sub_topics=@("Pertumbuhan Manusia","Perkembangan Hewan","Perkembangan Tumbuhan","Menulis Teks Deskripsi"); key_terms=@("pertumbuhan","perkembangan","deskripsi")},
        @{no=2; title="Makanan Sehat dan Bergizi"; pages="37-72"; semester="Ganjil"; sub_topics=@("Makanan Sehat","Gizi Seimbang","Membaca Label Makanan","Menulis Teks Prosedur"); key_terms=@("makanan","gizi","prosedur")},
        @{no=3; title="Pekerjaan dan Profesi"; pages="73-108"; semester="Ganjil"; sub_topics=@("Macam-Macam Profesi","Tugas dan Tanggung Jawab","Wawancara Sederhana","Membaca Teks Wawancara"); key_terms=@("profesi","pekerjaan","wawancara")},
        @{no=4; title="Transportasi"; pages="109-144"; semester="Genap"; sub_topics=@("Alat Transportasi","Transportasi Darat, Air, Udara","Membaca Jadwal","Menulis Teks Eksposisi"); key_terms=@("transportasi","jadwal","eksposisi")},
        @{no=5; title="Peristiwa Alam"; pages="145-180"; semester="Genap"; sub_topics=@("Peristiwa Alam","Bencana Alam","Membaca Berita","Menulis Teks Berita"); key_terms=@("peristiwa alam","berita","bencana")},
        @{no=6; title="Teknologi dan Informasi"; pages="181-216"; semester="Genap"; sub_topics=@("Teknologi Sederhana","Menggunakan Internet","Membaca Informasi Digital","Menulis Email Sederhana"); key_terms=@("teknologi","informasi","digital")}
    )
    "4" = @(
        @{no=1; title="Keanekaragaman Budaya"; pages="1-36"; semester="Ganjil"; sub_topics=@("Budaya Daerah","Rumah Adat","Pakaian Adat","Makanan Tradisional"); key_terms=@("budaya","adat","tradisional")},
        @{no=2; title="Hemat Energi"; pages="37-72"; semester="Ganjil"; sub_topics=@("Sumber Energi","Penghematan Energi","Energi Alternatif","Membaca Teks Persuasi"); key_terms=@("energi","hemat","persuasi")},
        @{no=3; title="Kisah dan Legenda"; pages="73-108"; semester="Ganjil"; sub_topics=@("Legenda Daerah","Cerita Rakyat","Unsur Intrinsik Cerita","Menulis Kembali Cerita"); key_terms=@("legenda","cerita rakyat","unsur intrinsik")},
        @{no=4; title="Kewirausahaan"; pages="109-144"; semester="Genap"; sub_topics=@("Mengenal Wirausaha","Produk dan Jasa","Membuat Iklan Sederhana","Menulis Teks Iklan"); key_terms=@("wirausaha","iklan","produk")},
        @{no=5; title="Lingkungan Hidup"; pages="145-180"; semester="Genap"; sub_topics=@("Ekosistem","Pencemaran Lingkungan","Pelestarian Alam","Menulis Teks Laporan"); key_terms=@("lingkungan","ekosistem","laporan")},
        @{no=6; title="Karya Ilmiah Sederhana"; pages="181-216"; semester="Genap"; sub_topics=@("Karya Tulis","Struktur Laporan","Menyusun Laporan","Presentasi Ilmiah"); key_terms=@("karya tulis","laporan","presentasi")}
    )
    "5" = @(
        @{no=1; title="Organ Tubuh Manusia"; pages="1-38"; semester="Ganjil"; sub_topics=@("Organ Pernapasan","Organ Pencernaan","Gangguan Organ Tubuh","Membaca Teks Eksplanasi"); key_terms=@("organ tubuh","pernapasan","eksplanasi")},
        @{no=2; title="Peristiwa dalam Kehidupan"; pages="39-76"; semester="Ganjil"; sub_topics=@("Peristiwa Penting","Tokoh Bersejarah","Membaca Biografi","Menulis Teks Biografi"); key_terms=@("peristiwa","tokoh","biografi")},
        @{no=3; title="Sains dan Teknologi"; pages="77-114"; semester="Ganjil"; sub_topics=@("Penemuan Sains","Teknologi Modern","Dampak Teknologi","Menulis Teks Argumentasi"); key_terms=@("sains","teknologi","argumentasi")},
        @{no=4; title="Persatuan dan Kesatuan"; pages="115-150"; semester="Genap"; sub_topics=@("Bhinneka Tunggal Ika","Gotong Royong","Membaca Teks Proklamasi","Menulis Pidato"); key_terms=@("persatuan","bhinneka","pidato")},
        @{no=5; title="Pelestarian Sumber Daya Alam"; pages="151-186"; semester="Genap"; sub_topics=@("Sumber Daya Alam","Pelestarian SDA","Membaca Artikel","Menulis Artikel"); key_terms=@("sumber daya alam","artikel","pelestarian")},
        @{no=6; title="Sastra Anak"; pages="187-224"; semester="Genap"; sub_topics=@("Puisi","Pantun","Cerpen","Menulis Karya Sastra"); key_terms=@("puisi","pantun","cerpen")}
    )
    "6" = @(
        @{no=1; title="Kemerdekaan dan Perjuangan"; pages="1-36"; semester="Ganjil"; sub_topics=@("Sejarah Kemerdekaan","Pahlawan Nasional","Membaca Teks Sejarah","Menulis Teks Narasi Sejarah"); key_terms=@("kemerdekaan","pahlawan","narasi")},
        @{no=2; title="Globalisasi"; pages="37-72"; semester="Ganjil"; sub_topics=@("Dampak Globalisasi","Globalisasi Budaya","Membaca Teks Eksposisi","Berdebat dan Berargumen"); key_terms=@("globalisasi","eksposisi","debat")},
        @{no=3; title="Keadilan dan Hak Asasi"; pages="73-108"; semester="Ganjil"; sub_topics=@("Hak dan Kewajiban","Keadilan Sosial","Membaca UUD 1945","Menulis Opini"); key_terms=@("hak","keadilan","opini")},
        @{no=4; title="Kesehatan dan Olahraga"; pages="109-144"; semester="Genap"; sub_topics=@("Hidup Sehat","Olahraga dan Prestasi","Membaca Artikel Kesehatan","Menulis Resensi Buku"); key_terms=@("kesehatan","olahraga","resensi")},
        @{no=5; title="Laporan dan Penelitian"; pages="145-180"; semester="Genap"; sub_topics=@("Metode Penelitian","Menulis Laporan Penelitian","Karya Ilmiah","Presentasi"); key_terms=@("penelitian","laporan","karya ilmiah")},
        @{no=6; title="Apresiasi Sastra"; pages="181-218"; semester="Genap"; sub_topics=@("Novel Anak","Drama","Penghargaan Sastra","Membaca dan Mengapresiasi Sastra"); key_terms=@("sastra","novel","drama")}
    )
}

foreach ($kelas in $indoData.Keys) {
    $chapters = $indoData[$kelas]
    $json = @{
        bookId = "sd-indo-$kelas"
        isbn = "978-623-194-1$kelas`1-X"
        publisher = "Kemendikbudristek"
        chapters = $chapters
    } | ConvertTo-Json -Depth 4
    $json | Set-Content -Path "$sdDir\indo_$kelas.json" -Encoding UTF8
}

# === PENDIDIKAN PANCASILA SD ===
$ppknData = @{
    "1" = @(
        @{no=1; title="Aku Anak Indonesia"; pages="1-30"; semester="Ganjil"; sub_topics=@("Mengenal Identitas Diri","Aku Bangga Menjadi Indonesia","Lambang Negara Garuda Pancasila","Menyanyikan Lagu Kebangsaan"); key_terms=@("identitas","bangsa","pancasila")},
        @{no=2; title="Keluarga dan Sekolah"; pages="31-60"; semester="Ganjil"; sub_topics=@("Hak dan Kewajiban di Rumah","Hak dan Kewajiban di Sekolah","Aturan di Keluarga","Aturan di Sekolah"); key_terms=@("hak","kewajiban","aturan")},
        @{no=3; title="Teman dan Pertemanan"; pages="61-90"; semester="Ganjil"; sub_topics=@("Bermain Bersama Teman","Menghargai Perbedaan","Tolong-Menolong","Gotong Royong"); key_terms=@("teman","gotong royong","perbedaan")},
        @{no=4; title="Lingkungan Sekitar"; pages="91-120"; semester="Genap"; sub_topics=@("Lingkungan Rumah","Lingkungan Sekolah","Menjaga Kebersihan","Mencintai Alam"); key_terms=@("lingkungan","kebersihan","alam")},
        @{no=5; title="Budaya dan Kesenian"; pages="121-150"; semester="Genap"; sub_topics=@("Mengenal Budaya Daerah","Permainan Tradisional","Lagu Daerah","Makanan Khas Daerah"); key_terms=@("budaya","tradisional","daerah")},
        @{no=6; title="Nilai-Nilai Pancasila"; pages="151-180"; semester="Genap"; sub_topics=@("Pengamalan Pancasila","Simbol Pancasila","Makna Sila-Sila Pancasila","Pancasila dalam Kehidupan"); key_terms=@("pancasila","sila","pengamalan")}
    )
    "2" = @(
        @{no=1; title="Pancasila dalam Kehidupan"; pages="1-34"; semester="Ganjil"; sub_topics=@("Sejarah Pancasila","Penerapan Sila Pertama","Penerapan Sila Kedua","Penerapan Sila Ketiga"); key_terms=@("pancasila","sejarah","sila")},
        @{no=2; title="Aturan dan Norma"; pages="35-68"; semester="Ganjil"; sub_topics=@("Norma dalam Keluarga","Norma di Sekolah","Norma di Masyarakat","Akibat Melanggar Aturan"); key_terms=@("norma","aturan","masyarakat")},
        @{no=3; title="Keragaman Indonesia"; pages="69-102"; semester="Ganjil"; sub_topics=@("Keragaman Suku","Keragaman Bahasa","Keragaman Agama","Bhinneka Tunggal Ika"); key_terms=@("keragaman","bhinneka","suku","agama")},
        @{no=4; title="Hak dan Kewajiban"; pages="103-136"; semester="Genap"; sub_topics=@("Hak di Rumah","Kewajiban di Rumah","Hak dan Kewajiban di Sekolah","Tanggung Jawab"); key_terms=@("hak","kewajiban","tanggung jawab")},
        @{no=5; title="Musyawarah dan Demokrasi"; pages="137-170"; semester="Genap"; sub_topics=@("Musyawarah","Voting","Keputusan Bersama","Menghargai Pendapat"); key_terms=@("musyawarah","demokrasi","keputusan")},
        @{no=6; title="Cinta Tanah Air"; pages="171-204"; semester="Genap"; sub_topics=@("Pahlawan Nasional","Cinta Produk Indonesia","Menjaga NKRI","Semangat Nasionalisme"); key_terms=@("tanah air","pahlawan","nasionalisme")}
    )
    "3" = @(
        @{no=1; title="Arti Lambang Negara"; pages="1-36"; semester="Ganjil"; sub_topics=@("Garuda Pancasila","Bendera Merah Putih","Bahasa Indonesia","Lambang Daerah"); key_terms=@("lambang negara","garuda","bendera")},
        @{no=2; title="Keberagaman di Sekitar"; pages="37-72"; semester="Ganjil"; sub_topics=@("Suku Bangsa","Agama di Indonesia","Toleransi Beragama","Budaya Gotong Royong"); key_terms=@("keberagaman","toleransi","gotong royong")},
        @{no=3; title="Pemerintahan Desa dan Kelurahan"; pages="73-108"; semester="Ganjil"; sub_topics=@("Struktur Pemerintahan Desa","Struktur Pemerintahan Kelurahan","Tugas Perangkat Desa","Partisipasi Masyarakat"); key_terms=@("pemerintahan","desa","kelurahan")},
        @{no=4; title="Hak Asasi Manusia"; pages="109-142"; semester="Genap"; sub_topics=@("Pengertian HAM","Jenis-Jenis HAM","Contoh HAM dalam Kehidupan","Pelanggaran HAM"); key_terms=@("HAM","hak asasi","pelanggaran")},
        @{no=5; title="Kewajiban dan Tanggung Jawab"; pages="143-176"; semester="Genap"; sub_topics=@("Kewajiban Warga Negara","Tanggung Jawab Sosial","Disiplin","Integritas"); key_terms=@("kewajiban","tanggung jawab","disiplin")},
        @{no=6; title="Persatuan dan Kesatuan"; pages="177-210"; semester="Genap"; sub_topics=@("Makna Persatuan","Bahaya Perpecahan","Memperkuat Persatuan","Semangat Kekeluargaan"); key_terms=@("persatuan","kesatuan","kekeluargaan")}
    )
    "4" = @(
        @{no=1; title="Nilai-Nilai Pancasila"; pages="1-36"; semester="Ganjil"; sub_topics=@("Pancasila sebagai Dasar Negara","Implementasi Sila 1-5","Pancasila dalam Kehidupan Sehari-Hari","Pancasila sebagai Pandangan Hidup"); key_terms=@("pancasila","dasar negara","pandangan hidup")},
        @{no=2; title="Konstitusi dan Hukum"; pages="37-72"; semester="Ganjil"; sub_topics=@("UUD 1945","Hukum dan Peraturan","Hak dan Kewajiban Warga Negara","Lembaga Negara"); key_terms=@("konstitusi","uud 1945","hukum")},
        @{no=3; title="Pemerintahan Daerah"; pages="73-108"; semester="Ganjil"; sub_topics=@("Pemerintah Provinsi","Pemerintah Kabupaten/Kota","Pemilihan Kepala Daerah","Peran Masyarakat"); key_terms=@("pemerintahan","daerah","pilkada")},
        @{no=4; title="Lembaga-Lembaga Negara"; pages="109-144"; semester="Genap"; sub_topics=@("Lembaga Legislatif","Lembaga Eksekutif","Lembaga Yudikatif","Lembaga Independen"); key_terms=@("lembaga negara","legislatif","eksekutif","yudikatif")},
        @{no=5; title="Budaya Demokrasi"; pages="145-180"; semester="Genap"; sub_topics=@("Prinsip Demokrasi","Pemilu","Kebebasan Berpendapat","Demokrasi di Sekolah"); key_terms=@("demokrasi","pemilu","kebebasan")},
        @{no=6; title="Globalisasi dan Identitas Bangsa"; pages="181-216"; semester="Genap"; sub_topics=@("Dampak Globalisasi","Mempertahankan Identitas","Budaya Asing","Filter Budaya"); key_terms=@("globalisasi","identitas","budaya")}
    )
    "5" = @(
        @{no=1; title="Pancasila dan UUD 1945"; pages="1-38"; semester="Ganjil"; sub_topics=@("Hubungan Pancasila dan UUD 1945","Pembukaan UUD 1945","Pokok Pikiran Pembukaan","Implementasi Pancasila"); key_terms=@("pancasila","uud 1945","pembukaan")},
        @{no=2; title="Sistem Pemerintahan"; pages="39-76"; semester="Ganjil"; sub_topics=@("Presidensial","Pembagian Kekuasaan","Kementerian Negara","Pemerintahan Pusat dan Daerah"); key_terms=@("pemerintahan","presidensial","kekuasaan")},
        @{no=3; title="Hak Warga Negara"; pages="77-114"; semester="Ganjil"; sub_topics=@("Hak Politik","Hak Ekonomi","Hak Sosial Budaya","Hak Pendidikan"); key_terms=@("hak warga","politik","ekonomi")},
        @{no=4; title="Kewajiban dan Tanggung Jawab"; pages="115-152"; semester="Genap"; sub_topics=@("Membayar Pajak","Mematuhi Hukum","Bela Negara","Partisipasi Pembangunan"); key_terms=@("kewajiban","pajak","bela negara")},
        @{no=5; title="Hubungan Internasional"; pages="153-188"; semester="Genap"; sub_topics=@("Diplomasi","Perjanjian Internasional","PBB","Peran Indonesia di Dunia"); key_terms=@("internasional","diplomasi","PBB")},
        @{no=6; title="Pembangunan Nasional"; pages="189-224"; semester="Genap"; sub_topics=@("Pembangunan Ekonomi","Pembangunan Pendidikan","Pembangunan Kesehatan","Pembangunan Infrastruktur"); key_terms=@("pembangunan","ekonomi","infrastruktur")}
    )
    "6" = @(
        @{no=1; title="Pancasila sebagai Ideologi"; pages="1-36"; semester="Ganjil"; sub_topics=@("Ideologi Terbuka","Pancasila vs Ideologi Lain","Relevansi Pancasila","Pancasila di Era Digital"); key_terms=@("ideologi","pancasila","era digital")},
        @{no=2; title="Pertahanan dan Keamanan"; pages="37-72"; semester="Ganjil"; sub_topics=@("TNI dan POLRI","Sistem Pertahanan","Keamanan Nasional","Wawasan Kebangsaan"); key_terms=@("pertahanan","keamanan","TNI","POLRI")},
        @{no=3; title="Kemerdekaan Beragama"; pages="73-108"; semester="Ganjil"; sub_topics=@("Agama di Indonesia","Kebebasan Beribadah","Toleransi Antar Umat","Kerukunan Beragama"); key_terms=@("agama","toleransi","kerukunan")},
        @{no=4; title="Otonomi Daerah"; pages="109-144"; semester="Genap"; sub_topics=@("Desentralisasi","Dana Desa","Perda","Pembangunan Daerah"); key_terms=@("otonomi","desentralisasi","daerah")},
        @{no=5; title="Masyarakat Madani"; pages="145-180"; semester="Genap"; sub_topics=@("Ciri Masyarakat Madani","Organisasi Masyarakat","Partisipasi Warga","Kontrol Sosial"); key_terms=@("masyarakat madani","organisasi","partisipasi")},
        @{no=6; title="Proyek Kewarganegaraan"; pages="181-216"; semester="Genap"; sub_topics=@("Penelitian Sosial Sederhana","Pengamatan Lingkungan","Laporan Kewarganegaraan","Presentasi dan Diskusi"); key_terms=@("proyek","kewarganegaraan","penelitian")}
    )
}

foreach ($kelas in $ppknData.Keys) {
    $chapters = $ppknData[$kelas]
    $json = @{
        bookId = "sd-pkn-$kelas"
        isbn = "978-623-194-2$kelas`1-X"
        publisher = "Kemendikbudristek"
        chapters = $chapters
    } | ConvertTo-Json -Depth 4
    $json | Set-Content -Path "$sdDir\pkn_$kelas.json" -Encoding UTF8
}

# === IPAS SD ===
$ipasData = @{
    "1" = @(
        @{no=1; title="Tubuhku"; pages="1-30"; semester="Ganjil"; sub_topics=@("Mengenal Anggota Tubuh","Panca Indra","Merawat Tubuh","Makanan Sehat"); key_terms=@("tubuh","panca indra","sehat")},
        @{no=2; title="Hewan dan Tumbuhan"; pages="31-60"; semester="Ganjil"; sub_topics=@("Hewan di Sekitar","Tumbuhan di Sekitar","Ciri Makhluk Hidup","Perkembangbiakan"); key_terms=@("hewan","tumbuhan","makhluk hidup")},
        @{no=3; title="Benda di Sekitar"; pages="61-90"; semester="Ganjil"; sub_topics=@("Benda Hidup dan Tak Hidup","Sifat Benda","Kegunaan Benda","Perubahan Benda"); key_terms=@("benda","sifat","perubahan")},
        @{no=4; title="Lingkunganku"; pages="91-120"; semester="Genap"; sub_topics=@("Lingkungan Alam","Lingkungan Buatan","Menjaga Lingkungan","Bencana Alam"); key_terms=@("lingkungan","alam","bencana")},
        @{no=5; title="Cuaca dan Musim"; pages="121-150"; semester="Genap"; sub_topics=@("Cuaca","Musim","Pengaruh Cuaca","Adaptasi Makhluk Hidup"); key_terms=@("cuaca","musim","adaptasi")},
        @{no=6; title="Bumi dan Alam Semesta"; pages="151-180"; semester="Genap"; sub_topics=@("Matahari","Bulan","Bintang","Siang dan Malam"); key_terms=@("bumi","matahari","bulan","bintang")}
    )
    "2" = @(
        @{no=1; title="Tumbuhan Sumber Kehidupan"; pages="1-34"; semester="Ganjil"; sub_topics=@("Bagian Tumbuhan","Fotosintesis","Manfaat Tumbuhan","Pelestarian Tumbuhan"); key_terms=@("tumbuhan","fotosintesis","pelestarian")},
        @{no=2; title="Hewan dan Habitatnya"; pages="35-68"; semester="Ganjil"; sub_topics=@("Jenis Hewan","Habitat","Rantai Makanan","Pelestarian Hewan"); key_terms=@("hewan","habitat","rantai makanan")},
        @{no=3; title="Gaya dan Gerak"; pages="69-102"; semester="Ganjil"; sub_topics=@("Macam Gaya","Pengaruh Gaya","Gerak Benda","Energi Gerak"); key_terms=@("gaya","gerak","energi")},
        @{no=4; title="Udara dan Air"; pages="103-136"; semester="Genap"; sub_topics=@("Sifat Udara","Manfaat Udara","Sifat Air","Manfaat Air"); key_terms=@("udara","air","sifat")},
        @{no=5; title="Tanah dan Batuan"; pages="137-170"; semester="Genap"; sub_topics=@("Jenis Tanah","Manfaat Tanah","Jenis Batuan","Manfaat Batuan"); key_terms=@("tanah","batuan","manfaat")},
        @{no=6; title="Tata Surya"; pages="171-204"; semester="Genap"; sub_topics=@("Planet","Matahari","Bumi sebagai Planet","Gerhana"); key_terms=@("tata surya","planet","gerhana")}
    )
    "3" = @(
        @{no=1; title="Makhluk Hidup dan Ekosistem"; pages="1-36"; semester="Ganjil"; sub_topics=@("Ekosistem","Rantai Makanan","Jaring-Jaring Makanan","Keseimbangan Ekosistem"); key_terms=@("ekosistem","rantai makanan","keseimbangan")},
        @{no=2; title="Makanan dan Pencernaan"; pages="37-72"; semester="Ganjil"; sub_topics=@("Sistem Pencernaan","Makanan Bergizi","Gizi Seimbang","Gangguan Pencernaan"); key_terms=@("pencernaan","gizi","makanan")},
        @{no=3; title="Perubahan Wujud Benda"; pages="73-108"; semester="Ganjil"; sub_topics=@("Wujud Benda","Perubahan Fisika","Perubahan Kimia","Suhu dan Kalor"); key_terms=@("wujud","perubahan","suhu","kalor")},
        @{no=4; title="Sumber Energi"; pages="109-144"; semester="Genap"; sub_topics=@("Energi Panas","Energi Cahaya","Energi Bunyi","Energi Alternatif"); key_terms=@("energi","panas","cahaya","bunyi")},
        @{no=5; title="Lingkungan dan Masyarakat"; pages="145-180"; semester="Genap"; sub_topics=@("Interaksi Manusia","Kebutuhan Manusia","Kegiatan Ekonomi","Pencemaran Lingkungan"); key_terms=@("lingkungan","masyarakat","ekonomi")},
        @{no=6; title="Keragaman Hayati"; pages="181-216"; semester="Genap"; sub_topics=@("Keanekaragaman Hayati","Flora Indonesia","Fauna Indonesia","Pelestarian Keanekaragaman"); key_terms=@("keanekaragaman","flora","fauna")}
    )
    "4" = @(
        @{no=1; title="Organ Tubuh Manusia"; pages="1-38"; semester="Ganjil"; sub_topics=@("Sistem Pernapasan","Sistem Peredaran Darah","Sistem Ekskresi","Gangguan Organ Tubuh"); key_terms=@("organ","pernapasan","peredaran darah")},
        @{no=2; title="Gaya dan Magnet"; pages="39-74"; semester="Ganjil"; sub_topics=@("Gaya Gravitasi","Gaya Gesek","Gaya Magnet","Penerapan Gaya"); key_terms=@("gaya","gravitasi","magnet")},
        @{no=3; title="Sumber Daya Alam"; pages="75-112"; semester="Ganjil"; sub_topics=@("SDA Hayati","SDA Non-Hayati","Persebaran SDA","Pengelolaan SDA"); key_terms=@("sumber daya alam","hayati","pengelolaan")},
        @{no=4; title="Kegiatan Ekonomi"; pages="113-148"; semester="Genap"; sub_topics=@("Produksi","Distribusi","Konsumsi","Pasar dan Uang"); key_terms=@("ekonomi","produksi","distribusi","konsumsi")},
        @{no=5; title="Sejarah dan Peninggalan"; pages="149-184"; semester="Genap"; sub_topics=@("Kerajaan Hindu-Buddha","Kerajaan Islam","Peninggalan Sejarah","Museum"); key_terms=@("sejarah","kerajaan","peninggalan")},
        @{no=6; title="Planet dan Bumi"; pages="185-220"; semester="Genap"; sub_topics=@("Rotasi Bumi","Revolusi Bumi","Gerhana Matahari","Gerhana Bulan"); key_terms=@("bumi","rotasi","revolusi","gerhana")}
    )
    "5" = @(
        @{no=1; title="Sistem dalam Tubuh"; pages="1-38"; semester="Ganjil"; sub_topics=@("Sistem Saraf","Sistem Hormon","Sistem Imun","Pola Hidup Sehat"); key_terms=@("sistem tubuh","saraf","imun","sehat")},
        @{no=2; title="Cahaya dan Bunyi"; pages="39-76"; semester="Ganjil"; sub_topics=@("Sifat Cahaya","Optik","Sifat Bunyi","Frekuensi dan Amplitudo"); key_terms=@("cahaya","bunyi","optik","frekuensi")},
        @{no=3; title="Peta dan Geografi"; pages="77-114"; semester="Ganjil"; sub_topics=@("Peta","Kenampakan Alam","Kenampakan Buatan","Iklim dan Cuaca"); key_terms=@("peta","geografi","iklim")},
        @{no=4; title="Perjuangan Bangsa Indonesia"; pages="115-152"; semester="Genap"; sub_topics=@("Penjajahan","Kebangkitan Nasional","Proklamasi","Tokoh Perjuangan"); key_terms=@("perjuangan","proklamasi","pahlawan")},
        @{no=5; title="Listrik dan Teknologi"; pages="153-188"; semester="Genap"; sub_topics=@("Listrik Statis","Listrik Dinamis","Rangkaian Listrik","Teknologi Sederhana"); key_terms=@("listrik","teknologi","rangkaian")},
        @{no=6; title="Pelestarian Lingkungan"; pages="189-224"; semester="Genap"; sub_topics=@("Daur Ulang","Konservasi","Ekowisata","Pembangunan Berkelanjutan"); key_terms=@("lingkungan","daur ulang","konservasi")}
    )
    "6" = @(
        @{no=1; title="Perkembangan Makhluk Hidup"; pages="1-36"; semester="Ganjil"; sub_topics=@("Pertumbuhan Manusia","Perkembangan Manusia","Puberitas","Pertumbuhan pada Tumbuhan dan Hewan"); key_terms=@("pertumbuhan","perkembangan","pubertas")},
        @{no=2; title="Magnet dan Listrik"; pages="37-72"; semester="Ganjil"; sub_topics=@("Medan Magnet","Elektromagnet","Generator","Teknologi Kelistrikan"); key_terms=@("magnet","listrik","elektromagnet")},
        @{no=3; title="Globalisasi dan Perubahan Sosial"; pages="73-108"; semester="Ganjil"; sub_topics=@("Globalisasi","Perubahan Sosial","Modernisasi","Akulturasi Budaya"); key_terms=@("globalisasi","perubahan sosial","modernisasi")},
        @{no=4; title="Tata Surya dan Luar Angkasa"; pages="109-144"; semester="Genap"; sub_topics=@("Sistem Tata Surya","Eksplorasi Luar Angkasa","Satelit","Misi ke Bulan dan Mars"); key_terms=@("tata surya","luar angkasa","satelit")},
        @{no=5; title="Kerja Sama dan Organisasi"; pages="145-180"; semester="Genap"; sub_topics=@("ASEAN","PBB","Kerja Sama Bilateral","Kerja Sama Multilateral"); key_terms=@("ASEAN","PBB","kerja sama")},
        @{no=6; title="Proyek IPAS Terpadu"; pages="181-218"; semester="Genap"; sub_topics=@("Metode Ilmiah","Percobaan Sains","Laporan Penelitian","Presentasi"); key_terms=@("proyek","ilmiah","penelitian")}
    )
}

foreach ($kelas in $ipasData.Keys) {
    $chapters = $ipasData[$kelas]
    $json = @{
        bookId = "sd-ipas-$kelas"
        isbn = "978-623-194-3$kelas`1-X"
        publisher = "Kemendikbudristek"
        chapters = $chapters
    } | ConvertTo-Json -Depth 4
    $json | Set-Content -Path "$sdDir\ipas_$kelas.json" -Encoding UTF8
}

# === PJOK SD ===
$pjokData = @{
    "1" = @(
        @{no=1; title="Gerak Dasar"; pages="1-30"; semester="Ganjil"; sub_topics=@("Jalan","Lari","Lompat","Lempar"); key_terms=@("gerak","jalan","lari","lompat")},
        @{no=2; title="Aktivitas Permainan"; pages="31-60"; semester="Ganjil"; sub_topics=@("Permainan Tradisional","Permainan Bola","Estafet","Kucing-Tikusan"); key_terms=@("permainan","tradisional","bola")},
        @{no=3; title="Gerak Ritmik"; pages="61-90"; semester="Ganjil"; sub_topics=@("Gerak Tepuk Tangan","Gerak Iringan Musik","Tarian Sederhana","Senam Irama"); key_terms=@("ritmik","irama","senam")},
        @{no=4; title="Kebugaran Jasmani"; pages="91-120"; semester="Genap"; sub_topics=@("Latihan Kekuatan","Latihan Kelenturan","Latihan Keseimbangan","Latihan Kelincahan"); key_terms=@("kebugaran","kekuatan","kelenturan","keseimbangan")},
        @{no=5; title="Aktivitas Air"; pages="121-150"; semester="Genap"; sub_topics=@("Bermain Air","Mengapung","Meluncur","Gerakan Dasar Renang"); key_terms=@("air","renang","mengapung")},
        @{no=6; title="Pola Hidup Sehat"; pages="151-180"; semester="Genap"; sub_topics=@("Makanan Bergizi","Kebersihan Diri","Istirahat","Olahraga Teratur"); key_terms=@("sehat","gizi","kebersihan")}
    )
    "2" = @(
        @{no=1; title="Gerak Non-Lokomotor"; pages="1-34"; semester="Ganjil"; sub_topics=@("Memutar","Mengayun","Membungkuk","Menekuk"); key_terms=@("gerak","non-lokomotor","memutar")},
        @{no=2; title="Manipulasi Gerak"; pages="35-68"; semester="Ganjil"; sub_topics=@("Melempar","Menangkap","Menendang","Memukul"); key_terms=@("manipulasi","melempar","menendang")},
        @{no=3; title="Olahraga Bola Besar"; pages="69-102"; semester="Ganjil"; sub_topics=@("Sepak Bola","Bola Voli","Bola Basket","Modifikasi Permainan"); key_terms=@("bola besar","sepak bola","voli")},
        @{no=4; title="Olahraga Bola Kecil"; pages="103-136"; semester="Genap"; sub_topics=@("Kasti","Rounders","Bulu Tangkis","Tenis Meja"); key_terms=@("bola kecil","kasti","bulu tangkis")},
        @{no=5; title="Senam Lantai"; pages="137-170"; semester="Genap"; sub_topics=@("Guling Depan","Guling Belakang","Kayang","Sikap Lilin"); key_terms=@("senam","lantai","guling")},
        @{no=6; title="Etika dan Keselamatan"; pages="171-204"; semester="Genap"; sub_topics=@("Etika Olahraga","Keselamatan Aktivitas","P3K","Sportivitas"); key_terms=@("etika","keselamatan","P3K")}
    )
    "3" = @(
        @{no=1; title="Kombinasi Gerak Dasar"; pages="1-36"; semester="Ganjil"; sub_topics=@("Kombinasi Jalan-Lari","Kombinasi Lompat-Lempar","Kombinasi Gerak Ritmik","Rangkaian Gerak"); key_terms=@("kombinasi","gerak","rangkaian")},
        @{no=2; title="Atletik"; pages="37-72"; semester="Ganjil"; sub_topics=@("Lari Jarak Pendek","Lompat Jauh","Lempar Turbo","Tolak Peluru"); key_terms=@("atletik","lari","lompat","lempar")},
        @{no=3; title="Olahraga Beladiri"; pages="73-108"; semester="Ganjil"; sub_topics=@("Pencak Silat","Kuda-Kuda","Pukulan","Tangkisan"); key_terms=@("beladiri","pencak silat","pukulan")},
        @{no=4; title="Kebugaran dan Kesehatan"; pages="109-144"; semester="Genap"; sub_topics=@("Tes Kebugaran","Latihan Sirkuit","Interval Training","Pemulihan"); key_terms=@("kebugaran","sirkuit","training")},
        @{no=5; title="Renang Gaya Dasar"; pages="145-180"; semester="Genap"; sub_topics=@("Renang Gaya Bebas","Pernapasan","Koordinasi Gerak","Keselamatan di Air"); key_terms=@("renang","gaya bebas","keselamatan")},
        @{no=6; title="Pola Hidup Aktif"; pages="181-216"; semester="Genap"; sub_topics=@("Aktivitas Fisik Harian","Manfaat Olahraga","Gizi dan Olahraga","Pencegahan Cedera"); key_terms=@("aktif","olahraga","cedera")}
    )
    "4" = @(
        @{no=1; title="Permainan Invasi"; pages="1-36"; semester="Ganjil"; sub_topics=@("Sepak Bola Lanjutan","Bola Basket Lanjutan","Strategi Serangan","Strategi Pertahanan"); key_terms=@("permainan","invasi","strategi")},
        @{no=2; title="Permainan Net"; pages="37-72"; semester="Ganjil"; sub_topics=@("Bola Voli Mini","Bulu Tangkis Lanjutan","Servis","Smash"); key_terms=@("net","voli","bulu tangkis")},
        @{no=3; title="Senam Artistik"; pages="73-108"; semester="Ganjil"; sub_topics=@("Lompat Kangkang","Lompat Jongkok","Meroda","Handstand"); key_terms=@("senam","artistik","lompat")},
        @{no=4; title="Aktivitas Luar Kelas"; pages="109-144"; semester="Genap"; sub_topics=@("Jelajah Alam","Perkemahan","Orientasi Lapangan","Konservasi Alam"); key_terms=@("luar kelas","alam","perkemahan")},
        @{no=5; title="Pengukuran Kebugaran"; pages="145-180"; semester="Genap"; sub_topics=@("Indeks Massa Tubuh","VO2 Max","Tes Kekuatan","Evaluasi Kebugaran"); key_terms=@("pengukuran","kebugaran","IMT")},
        @{no=6; title="Nilai-Nilai Olahraga"; pages="181-216"; semester="Genap"; sub_topics=@("Kerja Sama Tim","Kompetisi Sehat","Fair Play","Kepemimpinan"); key_terms=@("nilai","kerja sama","fair play")}
    )
    "5" = @(
        @{no=1; title="Permainan Bola Besar"; pages="1-38"; semester="Ganjil"; sub_topics=@("Futsal","Bola Tangan","Rugbi Mini","Variasi Gerak"); key_terms=@("bola besar","futsal","variasi")},
        @{no=2; title="Permainan Bola Kecil"; pages="39-76"; semester="Ganjil"; sub_topics=@("Softball","Kasti Lanjutan","Golf Mini","Variasi Gerak"); key_terms=@("bola kecil","softball","variasi")},
        @{no=3; title="Aktivitas Ritmik"; pages="77-114"; semester="Ganjil"; sub_topics=@("Senam Aerobik","Senam SKJ","Gerak Berirama","Koreografi Sederhana"); key_terms=@("ritmik","aerobik","senam")},
        @{no=4; title="Aktivitas Air Lanjutan"; pages="115-152"; semester="Genap"; sub_topics=@("Renang Gaya Punggung","Renang Gaya Dada","Pertolongan di Air","Lomba Renang"); key_terms=@("air","renang","gaya")},
        @{no=5; title="Kesehatan Reproduksi"; pages="153-188"; semester="Genap"; sub_topics=@("Kesehatan Reproduksi","Pola Asuh","Bahaya Narkoba","Perilaku Sehat"); key_terms=@("reproduksi","narkoba","sehat")},
        @{no=6; title="Perencanaan Aktivitas"; pages="189-224"; semester="Genap"; sub_topics=@("Program Latihan","Periodisasi","FITT Principle","Jurnal Aktivitas"); key_terms=@("perencanaan","program","FITT")}
    )
    "6" = @(
        @{no=1; title="Olahraga Prestasi"; pages="1-36"; semester="Ganjil"; sub_topics=@("Atletik Lanjutan","Renang Lanjutan","Nomor Perlombaan","Rekor dan Prestasi"); key_terms=@("prestasi","atletik","renang")},
        @{no=2; title="Senam dan Akrobatik"; pages="37-72"; semester="Ganjil"; sub_topics=@("Rangkaian Senam","Akrobatik Berpasangan","Koreografi Senam","Penilaian Senam"); key_terms=@("senam","akrobatik","rangkaian")},
        @{no=3; title="Pencak Silat Lanjutan"; pages="73-108"; semester="Ganjil"; sub_topics=@("Jurus","Pertandingan","Seni Bela Diri","Prestasi"); key_terms=@("pencak silat","jurus","pertandingan")},
        @{no=4; title="Kebugaran dan Nutrisi"; pages="109-144"; semester="Genap"; sub_topics=@("Gizi Olahraga","Suplemen","Hidrasi","Pemulihan Cedera"); key_terms=@("gizi","nutrisi","pemulihan")},
        @{no=5; title="Aktivitas Petualangan"; pages="145-180"; semester="Genap"; sub_topics=@("Panjat Tebing","Arung Jeram","Mendaki Gunung","Navigasi Alam"); key_terms=@("petualangan","alam","navigasi")},
        @{no=6; title="Manajemen Olahraga"; pages="181-216"; semester="Genap"; sub_topics=@("Organisasi Olahraga","Kepanitiaan","Event Olahraga","Karier Olahraga"); key_terms=@("manajemen","organisasi","karier")}
    )
}

foreach ($kelas in $pjokData.Keys) {
    $chapters = $pjokData[$kelas]
    $json = @{
        bookId = "sd-pjok-$kelas"
        isbn = "978-623-194-4$kelas`1-X"
        publisher = "Kemendikbudristek"
        chapters = $chapters
    } | ConvertTo-Json -Depth 4
    $json | Set-Content -Path "$sdDir\pjok_$kelas.json" -Encoding UTF8
}

# === SENI RUPA SD ===
$seniData = @{
    "1" = @(
        @{no=1; title="Mengenal Seni Rupa"; pages="1-30"; semester="Ganjil"; sub_topics=@("Apa Itu Seni Rupa","Unsur Seni Rupa","Alat dan Bahan Menggambar","Menggambar Bebas"); key_terms=@("seni rupa","unsur","menggambar")},
        @{no=2; title="Warna dan Bentuk"; pages="31-60"; semester="Ganjil"; sub_topics=@("Warna Dasar","Campuran Warna","Bentuk Geometris","Bentuk Organis"); key_terms=@("warna","bentuk","geometris")},
        @{no=3; title="Menggambar Ekspresif"; pages="61-90"; semester="Ganjil"; sub_topics=@("Menggambar Alam","Menggambar Imajinasi","Menggambar Cerita","Kolase Sederhana"); key_terms=@("menggambar","ekspresif","imajinasi")},
        @{no=4; title="Mencetak dan Membentuk"; pages="91-120"; semester="Genap"; sub_topics=@("Mencetak dengan Alam","Mencetak dengan Bahan Buatan","Membentuk dengan Plastisin","Membentuk dengan Tanah Liat"); key_terms=@("mencetak","membentuk","plastisin")},
        @{no=5; title="Kriya Sederhana"; pages="121-150"; semester="Genap"; sub_topics=@("Membuat Boneka","Membuat Topeng","Anyaman Sederhana","Merancang Kartu Ucapan"); key_terms=@("kriya","boneka","anyaman")},
        @{no=6; title="Apresiasi Seni"; pages="151-180"; semester="Genap"; sub_topics=@("Mengamati Karya Seni","Mendeskripsikan Karya","Pameran Kecil","Menghargai Karya Teman"); key_terms=@("apresiasi","karya seni","pameran")}
    )
    "2" = @(
        @{no=1; title="Garis dan Bidang"; pages="1-34"; semester="Ganjil"; sub_topics=@("Macam Garis","Tekstur","Bidang","Ruang"); key_terms=@("garis","bidang","tekstur")},
        @{no=2; title="Teknik Menggambar"; pages="35-68"; semester="Ganjil"; sub_topics=@("Menggambar Observasi","Menggambar Perspektif","Proporsi","Komposisi"); key_terms=@("teknik","observasi","perspektif")},
        @{no=3; title="Lukisan dan Mozaik"; pages="69-102"; semester="Ganjil"; sub_topics=@("Teknik Melukis","Cat Air","Cat Akrilik","Mozaik dari Bahan Alam"); key_terms=@("lukisan","mozaik","cat air")},
        @{no=4; title="Patung dan Relief"; pages="103-136"; semester="Genap"; sub_topics=@("Patung Bentuk Manusia","Patung Bentuk Hewan","Relief Sederhana","Alat Membuat Patung"); key_terms=@("patung","relief","bentuk")},
        @{no=5; title="Desain dan Pola"; pages="137-170"; semester="Genap"; sub_topics=@("Ragam Hias","Pola Batik Sederhana","Desain Produk","Menggambar Fashion"); key_terms=@("desain","pola","batik")},
        @{no=6; title="Pameran dan Kritik"; pages="171-204"; semester="Genap"; sub_topics=@("Menyelenggarakan Pameran","Katalog Sederhana","Kritik Karya","Portofolio"); key_terms=@("pameran","kritik","portofolio")}
    )
    "3" = @(
        @{no=1; title="Unsur dan Prinsip Seni"; pages="1-36"; semester="Ganjil"; sub_topics=@("Titik, Garis, Bidang","Warna dan Value","Tekstur dan Ruang","Prinsip Kesatuan dan Keseimbangan"); key_terms=@("unsur","prinsip","kesatuan")},
        @{no=2; title="Menggambar Alam Benda"; pages="37-72"; semester="Ganjil"; sub_topics=@("Sketsa","Arsiran","Perspektif Satu Titik","Menggambar Benda Mati"); key_terms=@("sketsa","arsiran","perspektif")},
        @{no=3; title="Lukis Alam dan Pemandangan"; pages="73-108"; semester="Ganjil"; sub_topics=@("Lanskap","Pemandangan Alam","Teknik Plakat","Teknik Aquarel"); key_terms=@("lanskap","pemandangan","plakat")},
        @{no=4; title="Seni Grafis"; pages="109-144"; semester="Genap"; sub_topics=@("Cetak Tinggi","Cetak Dalam","Sablon","Desain Grafis Sederhana"); key_terms=@("grafis","cetak","sablon")},
        @{no=5; title="Kerajinan Tangan"; pages="145-180"; semester="Genap"; sub_topics=@("Kerajinan Kertas","Kerajinan Bambu","Kerajinan Kain Flannel","Kerajinan Daur Ulang"); key_terms=@("kerajinan","tangan","daur ulang")},
        @{no=6; title="Apresiasi dan Ekspresi"; pages="181-216"; semester="Genap"; sub_topics=@("Menganalisis Karya","Ekspresi Diri","Galeri Seni","Seniman Daerah"); key_terms=@("apresiasi","ekspresi","seniman")}
    )
    "4" = @(
        @{no=1; title="Seni Rupa Dua Dimensi"; pages="1-36"; semester="Ganjil"; sub_topics=@("Unsur 2D","Prinsip 2D","Teknik 2D Lanjutan","Medium 2D"); key_terms=@("dua dimensi","2D","medium")},
        @{no=2; title="Seni Rupa Tiga Dimensi"; pages="37-72"; semester="Ganjil"; sub_topics=@("Unsur 3D","Teknik 3D","Bahan 3D","Pameran 3D"); key_terms=@("tiga dimensi","3D","teknik")},
        @{no=3; title="Ilustrasi dan Komik"; pages="73-108"; semester="Ganjil"; sub_topics=@("Ilustrasi Cerita","Komik Strip","Manga Sederhana","Layout dan Balon Kata"); key_terms=@("ilustrasi","komik","layout")},
        @{no=4; title="Ragam Hias Nusantara"; pages="109-144"; semester="Genap"; sub_topics=@("Motif Batik","Motif Ukir","Ornamen Daerah","Penerapan Ragam Hias"); key_terms=@("ragam hias","batik","ornamen")},
        @{no=5; title="Desain Komunikasi Visual"; pages="145-180"; semester="Genap"; sub_topics=@("Tipografi","Layout","Logo","Poster"); key_terms=@("DKV","tipografi","logo","poster")},
        @{no=6; title="Proyek Seni Rupa"; pages="181-216"; semester="Genap"; sub_topics=@("Perencanaan Proyek","Proses Kreatif","Pameran Akhir","Portofolio Digital"); key_terms=@("proyek","kreatif","portofolio")}
    )
    "5" = @(
        @{no=1; title="Seni Lukis Modern"; pages="1-36"; semester="Ganjil"; sub_topics=@("Aliran Seni Lukis","Seniman Indonesia","Ekspresionisme","Impresionisme"); key_terms=@("seni lukis","modern","aliran")},
        @{no=2; title="Seni Patung Kontemporer"; pages="37-72"; semester="Ganjil"; sub_topics=@("Patung Figuratif","Patung Abstrak","Instalasi","Bahan Temuan"); key_terms=@("patung","kontemporer","instalasi")},
        @{no=3; title="Fotografi dan Videografi"; pages="73-108"; semester="Ganjil"; sub_topics=@("Komposisi Foto","Pencahayaan","Editing Foto","Pengenalan Video"); key_terms=@("fotografi","videografi","komposisi")},
        @{no=4; title="Desain Interior dan Arsitektur"; pages="109-144"; semester="Genap"; sub_topics=@("Ruang","Tata Ruang","Maket","Denah Bangunan"); key_terms=@("desain interior","arsitektur","maket")},
        @{no=5; title="Kriya dan Produk"; pages="145-180"; semester="Genap"; sub_topics=@("Keramik","Kriya Logam","Produk Fungsional","Branding Produk"); key_terms=@("kriya","produk","keramik")},
        @{no=6; title="Seni Rupa dan Teknologi"; pages="181-216"; semester="Genap"; sub_topics=@("Desain Digital","Animasi Sederhana","3D Modeling","Portofolio Digital"); key_terms=@("digital","animasi","3D")}
    )
    "6" = @(
        @{no=1; title="Kurator dan Apresiator"; pages="1-36"; semester="Ganjil"; sub_topics=@("Peran Kurator","Menulis Resensi","Teori Estetika","Fungsi Seni"); key_terms=@("kurator","apresiasi","estetika")},
        @{no=2; title="Seni Rupa dan Masyarakat"; pages="37-72"; semester="Ganjil"; sub_topics=@("Seni Publik","Seni Jalanan","Komunitas Seni","Seni dan Ekonomi"); key_terms=@("masyarakat","publik","komunitas")},
        @{no=3; title="Multimedia dan Animasi"; pages="73-108"; semester="Ganjil"; sub_topics=@("Stop Motion","Animasi 2D","Storyboard","Audio Visual"); key_terms=@("multimedia","animasi","storyboard")},
        @{no=4; title="Kewirausahaan Seni"; pages="109-144"; semester="Genap"; sub_topics=@("Bisnis Karya Seni","Harga Karya","Platform Jual Beli","Galeri Online"); key_terms=@("wirausaha","bisnis","galeri")},
        @{no=5; title="Proyek Akhir Seni Rupa"; pages="145-180"; semester="Genap"; sub_topics=@("Konsep Proyek","Eksekusi","Pameran Akhir","Evaluasi"); key_terms=@("proyek akhir","pameran","evaluasi")},
        @{no=6; title="Seni Rupa Nusantara"; pages="181-216"; semester="Genap"; sub_topics=@("Seni Rupa Tradisional","Seni Rupa Kontemporer","Warisan Budaya","Pelestarian"); key_terms=@("nusantara","tradisional","warisan")}
    )
}

foreach ($kelas in $seniData.Keys) {
    $chapters = $seniData[$kelas]
    $json = @{
        bookId = "sd-seni-$kelas"
        isbn = "978-623-194-5$kelas`1-X"
        publisher = "Kemendikbudristek"
        chapters = $chapters
    } | ConvertTo-Json -Depth 4
    $json | Set-Content -Path "$sdDir\seni_$kelas.json" -Encoding UTF8
}

# === PAI SD ===
$paiData = @{
    "1" = @(
        @{no=1; title="Aku Cinta Al-Qur'an"; pages="1-32"; semester="Ganjil"; sub_topics=@("Mengenal Al-Qur'an","Membaca Basmalah","Surat Al-Fatihah","Surat An-Nas dan Al-Falaq"); key_terms=@("Al-Qur'an","basmalah","surat")},
        @{no=2; title="Rukun Iman"; pages="33-64"; semester="Ganjil"; sub_topics=@("Iman kepada Allah","Iman kepada Malaikat","Iman kepada Kitab","Iman kepada Rasul"); key_terms=@("iman","rukun","Allah","malaikat")},
        @{no=3; title="Bersuci dan Shalat"; pages="65-96"; semester="Ganjil"; sub_topics=@("Tata Cara Wudhu","Bersuci","Shalat Wajib","Gerakan Shalat"); key_terms=@("bersuci","wudhu","shalat")},
        @{no=4; title="Akhlak Terpuji"; pages="97-128"; semester="Genap"; sub_topics=@("Jujur","Disiplin","Tanggung Jawab","Santun dan Hormat"); key_terms=@("akhlak","jujur","disiplin")},
        @{no=5; title="Kisah Nabi"; pages="129-160"; semester="Genap"; sub_topics=@("Nabi Adam","Nabi Nuh","Nabi Ibrahim","Nabi Muhammad"); key_terms=@("nabi","kisah","rasul")},
        @{no=6; title="Hidup Bersih dan Sehat"; pages="161-192"; semester="Genap"; sub_topics=@("Kebersihan Sebagian dari Iman","Adab Makan","Adab Minum","Adab Buang Air"); key_terms=@("bersih","sehat","adab")}
    )
    "2" = @(
        @{no=1; title="Al-Qur'an Pedoman Hidupku"; pages="1-34"; semester="Ganjil"; sub_topics=@("Surat Al-Ikhlas","Surat Al-Kautsar","Surat An-Nashr","Huruf Hijaiyah dan Harakat"); key_terms=@("Al-Qur'an","surat","hijaiyah")},
        @{no=2; title="Rukun Islam"; pages="35-68"; semester="Ganjil"; sub_topics=@("Syahadat","Shalat","Puasa","Zakat","Haji"); key_terms=@("rukun Islam","syahadat","shalat","puasa")},
        @{no=3; title="Shalat Berjamaah"; pages="69-102"; semester="Ganjil"; sub_topics=@("Keutamaan Shalat Berjamaah","Makmum dan Imam","Shalat Sunnah","Dzikir dan Doa"); key_terms=@("shalat","berjamaah","dzikir")},
        @{no=4; title="Akhlak kepada Orang Tua"; pages="103-136"; semester="Genap"; sub_topics=@("Berbakti kepada Ibu","Berbakti kepada Ayah","Guru","Adab kepada Orang Tua"); key_terms=@("akhlak","orang tua","guru")},
        @{no=5; title="Kisah Teladan"; pages="137-170"; semester="Genap"; sub_topics=@("Kisah Luqman","Kisah Nabi Yusuf","Kisah Nabi Musa","Teladan dari Kisah"); key_terms=@("kisah","teladan","nabi")},
        @{no=6; title="Puasa dan Zakat"; pages="171-204"; semester="Genap"; sub_topics=@("Puasa Ramadhan","Kewajiban Zakat","Zakat Fitrah","Hikmah Puasa"); key_terms=@("puasa","zakat","ramadhan")}
    )
    "3" = @(
        @{no=1; title="Al-Qur'an dan Hadits"; pages="1-36"; semester="Ganjil"; sub_topics=@("Surat Al-Ashr","Surat Al-Ma'un","Surat Al-Fiil","Pengenalan Hadits"); key_terms=@("Al-Qur'an","hadits","surat")},
        @{no=2; title="Malaikat dan Tugasnya"; pages="37-72"; semester="Ganjil"; sub_topics=@("Nama Malaikat","Tugas Malaikat","Jibril dan Mikail","Raqib dan Atid"); key_terms=@("malaikat","tugas","Jibril")},
        @{no=3; title="Shalat Sunnah"; pages="73-108"; semester="Ganjil"; sub_topics=@("Shalat Dhuha","Shalat Tahajud","Shalat Rawatib","Shalat Idain"); key_terms=@("shalat","sunnah","dhuha","tahajud")},
        @{no=4; title="Puasa Sunnah"; pages="109-142"; semester="Genap"; sub_topics=@("Puasa Senin Kamis","Puasa Syawal","Puasa Arafah","Hikmah Puasa Sunnah"); key_terms=@("puasa","sunnah","syawal")},
        @{no=5; title="Akhlak Terpuji dan Tercela"; pages="143-176"; semester="Genap"; sub_topics=@("Pemaaf","Pemalu","Takabur","Hasad Dengki"); key_terms=@("akhlak","terpuji","tercela")},
        @{no=6; title="Kisah Nabi Muhammad"; pages="177-210"; semester="Genap"; sub_topics=@("Masa Kecil Nabi","Diangkat Menjadi Rasul","Hijrah","Perjuangan Nabi"); key_terms=@("Nabi Muhammad","hijrah","perjuangan")}
    )
    "4" = @(
        @{no=1; title="Al-Qur'an Surat Pendek"; pages="1-36"; semester="Ganjil"; sub_topics=@("Surat At-Tin","Surat Al-Qadr","Surat Al-Bayyinah","Tajwid Sederhana"); key_terms=@("Al-Qur'an","tajwid","surat")},
        @{no=2; title="Khalifah dan Pemimpin"; pages="37-72"; semester="Ganjil"; sub_topics=@("Khalifah Abu Bakar","Khalifah Umar","Khalifah Utsman","Khalifah Ali"); key_terms=@("khalifah","pemimpin","sahabat")},
        @{no=3; title="Shalat Jumat dan Idain"; pages="73-108"; semester="Ganjil"; sub_topics=@("Kewajiban Shalat Jumat","Khutbah","Shalat Idul Fitri","Shalat Idul Adha"); key_terms=@("shalat","Jumat","Idain")},
        @{no=4; title="Puasa Wajib dan Sunnah"; pages="109-144"; semester="Genap"; sub_topics=@("Puasa Ramadhan (Lanjutan)","Hikmah Puasa","Malam Lailatul Qadar","I'tikaf"); key_terms=@("puasa","Lailatul Qadar","i'tikaf")},
        @{no=5; title="Ikhlas dan Sabar"; pages="145-180"; semester="Genap"; sub_topics=@("Ikhlas Beribadah","Sabar dalam Ujian","Syukur Nikmat","Tawakal"); key_terms=@("ikhlas","sabar","syukur","tawakal")},
        @{no=6; title="Haji dan Umrah"; pages="181-216"; semester="Genap"; sub_topics=@("Rukun Haji","Wajib Haji","Tata Cara Umrah","Hikmah Haji"); key_terms=@("haji","umrah","rukun")}
    )
    "5" = @(
        @{no=1; title="Al-Qur'an Surat Panjang"; pages="1-38"; semester="Ganjil"; sub_topics=@("Surat Al-Maidah Ayat 1-3","Surat Al-Maidah Ayat 8","Surat Al-Hujurat Ayat 12","Makharijul Huruf"); key_terms=@("Al-Qur'an","makharijul","hijaiyah")},
        @{no=2; title="Rasul Ulul Azmi"; pages="39-76"; semester="Ganjil"; sub_topics=@("Nabi Nuh AS","Nabi Ibrahim AS","Nabi Musa AS","Nabi Isa AS","Nabi Muhammad SAW"); key_terms=@("rasul","ulul azmi","nabi")},
        @{no=3; title="Zakat dan Sedekah"; pages="77-114"; semester="Ganjil"; sub_topics=@("Zakat Mal","Zakat Fitrah","Sedekah","Infak"); key_terms=@("zakat","sedekah","infak")},
        @{no=4; title="Meneladani Sahabat"; pages="115-152"; semester="Genap"; sub_topics=@("Bilal bin Rabah","Umar bin Khattab","Aisyah RA","Ali bin Abi Thalib"); key_terms=@("sahabat","teladan","Bilal","Umar")},
        @{no=5; title="Hidup Sederhana"; pages="153-188"; semester="Genap"; sub_topics=@("Qanaah","Hidup Sederhana","Menjauhi Sifat Boros","Menabung"); key_terms=@("sederhana","qanaah","boros")},
        @{no=6; title="Muamalah dalam Islam"; pages="189-224"; semester="Genap"; sub_topics=@("Jual Beli","Utang Piutang","Sewa Menyewa","Larangan Riba"); key_terms=@("muamalah","jual beli","riba")}
    )
    "6" = @(
        @{no=1; title="Al-Qur'an dan Hadits Lanjutan"; pages="1-36"; semester="Ganjil"; sub_topics=@("Surat Ali Imran Ayat 190-191","Surat Al-Baqarah Ayat 177","Hadits tentang Ilmu","Hadits tentang Niat"); key_terms=@("Al-Qur'an","hadits","ilmu","niat")},
        @{no=2; title="Takdir dan Qada"; pages="37-72"; semester="Ganjil"; sub_topics=@("Qada dan Qadar","Takdir Mubram","Takdir Mu'allaq","Ikhlas Menerima Takdir"); key_terms=@("takdir","qada","qadar")},
        @{no=3; title="Pernikahan dalam Islam"; pages="73-108"; semester="Ganjil"; sub_topics=@("Hukum Nikah","Rukun Nikah","Keluarga Sakinah","Hak dan Kewajiban Suami Istri"); key_terms=@("nikah","keluarga","sakinah")},
        @{no=4; title="Warisan dalam Islam"; pages="109-144"; semester="Genap"; sub_topics=@("Hukum Waris","Ahli Waris","Bagian Waris","Hikmah Waris"); key_terms=@("waris","faraidh","ahli waris")},
        @{no=5; title="Dakwah dan Peradaban"; pages="145-180"; semester="Genap"; sub_topics=@("Dakwah di Nusantara","Wali Songo","Kerajaan Islam","Kesenian Islam"); key_terms=@("dakwah","Wali Songo","peradaban")},
        @{no=6; title="Mempersiapkan Masa Depan"; pages="181-216"; semester="Genap"; sub_topics=@("Menuntut Ilmu","Etos Kerja Islam","Karier dan Profesi","Berorganisasi"); key_terms=@("masa depan","ilmu","karier")}
    )
}

foreach ($kelas in $paiData.Keys) {
    $chapters = $paiData[$kelas]
    $json = @{
        bookId = "sd-pai-$kelas"
        isbn = "978-623-194-6$kelas`1-X"
        publisher = "Kemendikbudristek"
        chapters = $chapters
    } | ConvertTo-Json -Depth 4
    $json | Set-Content -Path "$sdDir\pai_$kelas.json" -Encoding UTF8
}

Write-Host "All SD books created successfully!"
