$outDir = "F:\app-firebase\Smart Teaching\smart-teaching-manager\src\utils\data\books\sma"
$kelasRomawi = @{10="X";11="XI";12="XII"}

$subjects = @(
    @{  # 1. Matematika Wajib
        id = "mtk"
        file = "matematika"
        label = "Matematika"
        grades = @{
            10 = @(
                @{title="Eksponen"; sub=@("Definisi dan Sifat Eksponen","Persamaan Eksponen","Pertidaksamaan Eksponen","Fungsi Eksponen","Grafik Fungsi Eksponen"); key=@("Eksponen","Bilangan Berpangkat","Fungsi Eksponensial")}
                @{title="Logaritma"; sub=@("Definisi dan Sifat Logaritma","Persamaan Logaritma","Pertidaksamaan Logaritma","Fungsi Logaritma","Grafik Fungsi Logaritma"); key=@("Logaritma","Numerus","Basis Logaritma")}
                @{title="Barisan dan Deret"; sub=@("Barisan Aritmetika","Deret Aritmetika","Barisan Geometri","Deret Geometri","Deret Geometri Tak Hingga"); key=@("Aritmetika","Geometri","Rasio","Beda")}
                @{title="Trigonometri"; sub=@("Perbandingan Trigonometri","Sudut Istimewa","Identitas Trigonometri","Aturan Sinus dan Cosinus","Grafik Fungsi Trigonometri"); key=@("Sinus","Cosinus","Tangen","Radian")}
                @{title="Sistem Persamaan Linear"; sub=@("SPLDV","SPLTV","Metode Substitusi","Metode Eliminasi","Metode Campuran"); key=@("SPLDV","SPLTV","Eliminasi","Substitusi")}
                @{title="Fungsi Kuadrat"; sub=@("Bentuk Umum Fungsi Kuadrat","Grafik Fungsi Kuadrat","Akar-Akar Persamaan Kuadrat","Diskriminan","Menyusun Persamaan Kuadrat"); key=@("Fungsi Kuadrat","Parabola","Diskriminan","Akar")}
            )
            11 = @(
                @{title="Matriks"; sub=@("Definisi dan Ordo Matriks","Operasi Matriks","Determinan Matriks","Invers Matriks","Penyelesaian SPL dengan Matriks"); key=@("Matriks","Determinan","Invers","Ordo")}
                @{title="Vektor"; sub=@("Definisi dan Notasi Vektor","Operasi Vektor","Vektor Posisi","Vektor dalam Bidang Datar","Perkalian Skalar Dua Vektor"); key=@("Vektor","Skalar","Vektor Posisi","Resultan")}
                @{title="Transformasi Geometri"; sub=@("Translasi","Refleksi","Rotasi","Dilatasi","Komposisi Transformasi"); key=@("Translasi","Refleksi","Rotasi","Dilatasi")}
                @{title="Fungsi Komposisi dan Invers"; sub=@("Relasi dan Fungsi","Sifat Fungsi","Fungsi Komposisi","Fungsi Invers","Fungsi Invers dari Komposisi"); key=@("Fungsi","Komposisi","Invers","Bijektif")}
                @{title="Polinomial"; sub=@("Bentuk Umum Polinomial","Operasi Aljabar Polinomial","Kesamaan Polinomial","Pembagian Polinomial","Teorema Sisa dan Faktor"); key=@("Polinomial","Derajat","Koefisien","Teorema Sisa")}
                @{title="Statistika"; sub=@("Penyajian Data","Ukuran Pemusatan","Ukuran Letak","Ukuran Penyebaran","Distribusi Frekuensi"); key=@("Mean","Median","Modus","Kuartil")}
            )
            12 = @(
                @{title="Limit Fungsi"; sub=@("Konsep Limit","Limit Fungsi Aljabar","Limit Fungsi Trigonometri","Limit Tak Hingga","Kekontinuan Fungsi"); key=@("Limit","Kekontinuan","Tak Hingga","Pendekatan")}
                @{title="Turunan Fungsi"; sub=@("Konsep Turunan","Aturan Turunan","Turunan Fungsi Trigonometri","Aplikasi Turunan","Nilai Maksimum dan Minimum"); key=@("Turunan","Diferensial","Gradien","Laju Perubahan")}
                @{title="Integral"; sub=@("Integral Tak Tentu","Integral Tentu","Integral Substitusi","Integral Parsial","Aplikasi Integral"); key=@("Integral","Anti Turunan","Luas Daerah","Volume Benda Putar")}
                @{title="Peluang"; sub=@("Kaidah Pencacahan","Permutasi","Kombinasi","Peluang Suatu Kejadian","Frekuensi Harapan"); key=@("Peluang","Permutasi","Kombinasi","Ruang Sampel")}
                @{title="Aturan Pencacahan"; sub=@("Aturan Perkalian","Faktorial","Permutasi Siklis","Kombinasi Berulang","Peluang Kejadian Majemuk"); key=@("Faktorial","Permutasi","Kombinasi","Peluang Majemuk")}
            )
        }
    }
    @{  # 2. Bahasa Indonesia
        id = "ind"
        file = "indo"
        label = "Bahasa Indonesia"
        grades = @{
            10 = @(
                @{title="Teks Laporan Hasil Observasi"; sub=@("Ciri dan Struktur Teks LHO","Kebahasaan Teks LHO","Menyusun Teks LHO","Menyunting Teks LHO"); key=@("Observasi","Laporan","Deskripsi","Fakta")}
                @{title="Teks Eksposisi"; sub=@("Pengertian dan Struktur","Jenis Teks Eksposisi","Kebahasaan Teks Eksposisi","Menyusun Teks Eksposisi"); key=@("Eksposisi","Argumentasi","Tesis","Penegasan")}
                @{title="Teks Anekdot"; sub=@("Ciri dan Struktur","Kebahasaan Anekdot","Menyusun Anekdot","Menganalisis Anekdot"); key=@("Anekdot","Kritik","Humor","Satire")}
                @{title="Cerita Rakyat"; sub=@("Pengertian Cerita Rakyat","Jenis Cerita Rakyat","Nilai dalam Cerita Rakyat","Menceritakan Kembali"); key=@("Cerita Rakyat","Legenda","Mite","Fabel")}
                @{title="Puisi"; sub=@("Unsur Fisik Puisi","Unsur Batin Puisi","Menganalisis Puisi","Menulis Puisi"); key=@("Puisi","Diksi","Majas","Rima")}
                @{title="Biografi"; sub=@("Pengertian Biografi","Struktur Biografi","Menulis Biografi","Keteladanan Tokoh"); key=@("Biografi","Otobiografi","Tokoh","Keteladanan")}
            )
            11 = @(
                @{title="Teks Prosedur"; sub=@("Ciri dan Struktur","Kebahasaan","Menyusun Prosedur","Menyunting Teks Prosedur"); key=@("Prosedur","Instruksi","Langkah","Syarat")}
                @{title="Teks Eksplanasi"; sub=@("Pengertian dan Struktur","Hubungan Kausal","Proses Terjadinya","Menyusun Eksplanasi"); key=@("Eksplanasi","Kausal","Proses","Fenomena")}
                @{title="Cerpen"; sub=@("Unsur Intrinsik","Unsur Ekstrinsik","Menganalisis Cerpen","Menulis Cerpen"); key=@("Cerpen","Alur","Tokoh","Latar")}
                @{title="Drama"; sub=@("Struktur Drama","Dialog Drama","Mementaskan Drama","Menganalisis Naskah Drama"); key=@("Drama","Dialog","Babak","Monolog")}
                @{title="Karya Ilmiah"; sub=@("Jenis Karya Ilmiah","Sistematika Penulisan","Kutipan dan Daftar Pustaka","Etika Penulisan"); key=@("Karya Ilmiah","Sitasi","Abstrak","Metodologi")}
                @{title="Resensi"; sub=@("Pengertian Resensi","Struktur Resensi","Menganalisis Resensi","Menulis Resensi"); key=@("Resensi","Review","Buku","Sinopsis")}
            )
            12 = @(
                @{title="Surat Lamaran Pekerjaan"; sub=@("Struktur Surat Lamaran","Kebahasaan","Menulis Surat Lamaran","Kelengkapan Dokumen"); key=@("Surat Lamaran","Aplikasi","CV","Dokumen")}
                @{title="Novel"; sub=@("Unsur Intrinsik Novel","Unsur Ekstrinsik","Menganalisis Novel","Nilai dalam Novel"); key=@("Novel","Karakterisasi","Amanat","Sudut Pandang")}
                @{title="Teks Editorial"; sub=@("Pengertian Editorial","Struktur Editorial","Kebahasaan","Menganalisis Editorial"); key=@("Editorial","Opini","Tajuk","Komentar")}
                @{title="Kritik dan Esai Sastra"; sub=@("Pengertian Kritik","Pengertian Esai","Menulis Kritik Sastra","Menulis Esai Sastra"); key=@("Kritik","Esai","Sastra","Analisis")}
                @{title="Artikel"; sub=@("Jenis Artikel","Struktur Artikel","Kebahasaan Artikel","Menulis Artikel"); key=@("Artikel","Opini","Faktual","Argumentatif")}
            )
        }
    }
    @{  # 3. Bahasa Inggris
        id = "ing"
        file = "inggris"
        label = "Bahasa Inggris"
        grades = @{
            10 = @(
                @{title="Descriptive Text"; sub=@("Social Function","Generic Structure","Language Features","Writing Descriptive Text"); key=@("Descriptive","Adjective","Simple Present","Attribute")}
                @{title="Recount Text"; sub=@("Purpose of Recount","Types of Recount","Structure of Recount","Past Tense Usage"); key=@("Recount","Past Event","Sequence","Experience")}
                @{title="Narrative Text"; sub=@("Purpose of Narrative","Structure of Narrative","Language Features","Types of Narrative"); key=@("Narrative","Fable","Legend","Fairy Tale")}
                @{title="Procedure Text"; sub=@("Purpose of Procedure","Structure","Imperative Sentences","Connectors"); key=@("Procedure","Instruction","Imperative","Steps")}
                @{title="Simple Present Tense"; sub=@("Form and Function","Verbal Sentences","Nominal Sentences","Time Signals"); key=@("Simple Present","Routine","Habit","General Truth")}
                @{title="Report Text"; sub=@("Purpose of Report","Structure","Language Features","Writing Report"); key=@("Report","Classification","General","Scientific")}
            )
            11 = @(
                @{title="Explanation Text"; sub=@("Purpose of Explanation","Generic Structure","Passive Voice Usage","Cause and Effect"); key=@("Explanation","Process","Scientific","Phenomenon")}
                @{title="Analytical Exposition"; sub=@("Purpose of Exposition","Thesis Argument Reiteration","Connecting Words","Developing Arguments"); key=@("Exposition","Argument","Thesis","Persuasive")}
                @{title="News Item"; sub=@("Purpose of News","Newsworthy Events","Background Sources","Headline Language"); key=@("News Item","Headline","Source","Event")}
                @{title="Passive Voice"; sub=@("Form of Passive","Passive in Tenses","Passive Modals","When to Use Passive"); key=@("Passive Voice","Agent","Action","Subject Focus")}
                @{title="Conditional Sentences"; sub=@("Type 0 and 1","Type 2","Type 3","Mixed Conditionals"); key=@("Conditional","If Clause","Hypothetical","Imaginary")}
                @{title="Cause and Effect"; sub=@("Cause Effect Connectors","Signal Words","Compound Sentences","Complex Sentences"); key=@("Cause","Effect","Result","Because")}
            )
            12 = @(
                @{title="Offers and Suggestions"; sub=@("Making Offers","Making Suggestions","Accepting and Declining","Polite Expressions"); key=@("Offer","Suggestion","Polite","Response")}
                @{title="Requests and Invitations"; sub=@("Making Requests","Making Invitations","Accepting Declining","Modal Verbs"); key=@("Request","Invitation","Modal","Response")}
                @{title="Caption Text"; sub=@("Purpose of Caption","Types of Caption","Writing Captions","Visual Media"); key=@("Caption","Description","Image","Context")}
                @{title="News Item Text"; sub=@("Main Events","Background Sources","Structure Review","Writing News"); key=@("News","Sources","Event","Summary")}
                @{title="Application Letter"; sub=@("Structure of Letter","Language Features","Writing Application Letter","Resume and CV"); key=@("Application","Letter","CV","Qualification")}
            )
        }
    }
    @{  # 4. Pendidikan Pancasila
        id = "pkn"
        file = "pkn"
        label = "Pendidikan Pancasila"
        grades = @{
            10 = @(
                @{title="Pancasila"; sub=@("Sejarah Pancasila","Pancasila sebagai Dasar Negara","Nilai-Nilai Pancasila","Pancasila dalam Kehidupan","Implementasi Pancasila"); key=@("Pancasila","Dasar Negara","Ideologi","Nilai")}
                @{title="Undang-Undang Dasar 1945"; sub=@("Sejarah UUD 1945","Pembukaan UUD 1945","Batang Tubuh","Amandemen UUD 1945","Pokok Pikiran"); key=@("UUD 1945","Konstitusi","Amandemen","Pembukaan")}
                @{title="NKRI"; sub=@("Konsep NKRI","Wilayah NKRI","Pemerintahan Daerah","Otonomi Daerah","Integrasi Nasional"); key=@("NKRI","Unitaris","Otonomi","Integrasi")}
                @{title="Hak Asasi Manusia"; sub=@("Pengertian HAM","Sejarah HAM","Instrumen HAM","Pelanggaran HAM","Pengadilan HAM"); key=@("HAM","Hak","Kewajiban","Pelanggaran")}
                @{title="Demokrasi"; sub=@("Pengertian Demokrasi","Jenis Demokrasi","Demokrasi Pancasila","Pemilu","Partisipasi Politik"); key=@("Demokrasi","Pemilu","Partisipasi","Kedaulatan")}
                @{title="Ketahanan Nasional"; sub=@("Konsep Ketahanan","Unsur Ketahanan","Wawasan Nusantara","Ancaman Nasional","Bela Negara"); key=@("Ketahanan","Ancaman","Bela Negara","Nasional")}
            )
            11 = @(
                @{title="Ideologi"; sub=@("Pengertian Ideologi","Ideologi Terbuka","Ideologi Pancasila","Perbandingan Ideologi","Pancasila vs Liberalisme"); key=@("Ideologi","Pancasila","Liberalisme","Komunisme")}
                @{title="Politik Hukum"; sub=@("Politik Hukum Nasional","Sumber Hukum","Hierarki Peraturan","Penegakan Hukum","Budaya Hukum"); key=@("Politik","Hukum","Penegakan","Peraturan")}
                @{title="Desentralisasi"; sub=@("Konsep Desentralisasi","Dekonsentrasi","Tugas Pembantuan","Pemerintahan Daerah","Otonomi Daerah"); key=@("Desentralisasi","Otonomi","Dekonsentrasi","Daerah")}
                @{title="Sistem Hukum Indonesia"; sub=@("Tata Hukum Indonesia","Lembaga Yudikatif","Peradilan Umum","Peradilan Agama","Peradilan Tata Usaha Negara"); key=@("Yudikatif","Peradilan","Hukum","Mahkamah")}
                @{title="Masyarakat Madani"; sub=@("Konsep Civil Society","Ciri Masyarakat Madani","Warga Negara","Organisasi Kemasyarakatan","Partisipasi Publik"); key=@("Madani","Civil Society","Partisipasi","Demokrasi")}
                @{title="Hak dan Kewajiban Warga Negara"; sub=@("Pengertian Hak dan Kewajiban","Macam Hak Warga Negara","Macam Kewajiban","Keseimbangan Hak Kewajiban","Contoh Implementasi"); key=@("Hak","Kewajiban","Warga Negara","Kewarganegaraan")}
            )
            12 = @(
                @{title="Globalisasi"; sub=@("Pengertian Globalisasi","Dampak Globalisasi","Globalisasi Politik","Globalisasi Ekonomi","Globalisasi Budaya"); key=@("Globalisasi","Modernisasi","Era Digital","Budaya Global")}
                @{title="Demokrasi Indonesia"; sub=@("Demokrasi Pancasila","Pemilu di Indonesia","Sistem Kepartaian","Kebebasan Berpendapat","Pendidikan Demokrasi"); key=@("Demokrasi","Pemilu","Partai","Pendapat")}
                @{title="Sistem Ekonomi Indonesia"; sub=@("Perekonomian Indonesia","Demokrasi Ekonomi","UMKM","BUMN BUMD","Koperasi"); key=@("Ekonomi","Demokrasi Ekonomi","UMKM","Koperasi")}
                @{title="Wawasan Nusantara"; sub=@("Konsep Wawasan Nusantara","Geopolitik Indonesia","Ketahanan Wilayah","Kekayaan Alam","Pertahanan Keamanan"); key=@("Wawasan","Nusantara","Geopolitik","Ketahanan")}
                @{title="Revolusi Mental"; sub=@("Konsep Revolusi Mental","Nilai Integritas","Etos Kerja","Gotong Royong","Implementasi Revolusi Mental"); key=@("Revolusi","Mental","Integritas","Gotong Royong")}
            )
        }
    }
    @{  # 5. PJOK
        id = "pjo"
        file = "pjok"
        label = "PJOK"
        grades = @{
            10 = @(
                @{title="Permainan Bola Besar"; sub=@("Sepak Bola","Bola Voli","Bola Basket","Teknik Dasar","Peraturan Permainan"); key=@("Sepak Bola","Bola Voli","Bola Basket","Tim")}
                @{title="Permainan Bola Kecil"; sub=@("Bulu Tangkis","Tenis Meja","Softball","Rounders","Teknik Dasar"); key=@("Bulu Tangkis","Tenis Meja","Softball","Pukulan")}
                @{title="Atletik"; sub=@("Lari Jarak Pendek","Lari Jarak Menengah","Lompat Jauh","Lempar Peluru","Lempar Lembing"); key=@("Atletik","Lari","Lompat","Lempar")}
                @{title="Beladiri"; sub=@("Pencak Silat","Kuda-Kuda","Pukulan dan Tendangan","Tangkisan","Elakan"); key=@("Pencak Silat","Beladiri","Pukulan","Tangkisan")}
                @{title="Kebugaran Jasmani"; sub=@("Komposisi","Kekuatan","Kelentukan","Daya Tahan","Kecepatan"); key=@("Kebugaran","Kekuatan","Daya Tahan","Fleksibilitas")}
                @{title="Senam"; sub=@("Senam Lantai","Senam Irama","Roll Depan","Roll Belakang","Kayang"); key=@("Senam","Lantai","Irama","Roll")}
            )
            11 = @(
                @{title="Strategi Permainan Bola Besar"; sub=@("Pola Penyerangan","Pola Pertahanan","Formasi Sepak Bola","Formasi Bola Voli","Formasi Bola Basket"); key=@("Strategi","Formasi","Penyerangan","Pertahanan")}
                @{title="Analisis Gerak"; sub=@("Prinsip Biomekanika","Analisis Gerak Lari","Analisis Gerak Lompat","Analisis Gerak Lempar","Efisiensi Gerak"); key=@("Biomekanika","Gerak","Analisis","Efisiensi")}
                @{title="Latihan Beban"; sub=@("Prinsip Latihan Beban","Jenis Latihan Beban","Program Latihan","Frekuensi dan Intensitas","Peralatan Beban"); key=@("Beban","Latihan","Intensitas","Repetisi")}
                @{title="Senam Lanjutan"; sub=@("Senam Artistik","Senam Ritmik","Unsur Kelenturan","Keseimbangan","Koordinasi"); key=@("Senam","Artistik","Ritmik","Koordinasi")}
                @{title="Kesehatan Mental"; sub=@("Pengertian Kesehatan Mental","Stres dan Kecemasan","Manajemen Stres","Olahraga dan Mental","Pola Hidup Sehat"); key=@("Mental","Stres","Relaksasi","Sehat")}
                @{title="Peraturan Permainan"; sub=@("Peraturan Sepak Bola","Peraturan Bola Voli","Peraturan Bola Basket","Peraturan Bulu Tangkis","Fair Play"); key=@("Peraturan","Wasit","Fair Play","Pelanggaran")}
            )
            12 = @(
                @{title="Kepelatihan Olahraga"; sub=@("Prinsip Kepelatihan","Metode Latihan","Program Latihan","Evaluasi Latihan","Peran Pelatih"); key=@("Pelatih","Latihan","Program","Evaluasi")}
                @{title="Manajemen Olahraga"; sub=@("Organisasi Olahraga","Event Olahraga","Pendanaan Olahraga","Pemasaran Olahraga","Prestasi Nasional"); key=@("Manajemen","Organisasi","Event","Prestasi")}
                @{title="Gizi Olahraga"; sub=@("Kebutuhan Gizi Atlet","Makronutrien","Mikronutrien","Hidrasi","Suplemen Olahraga"); key=@("Gizi","Nutrisi","Karbohidrat","Protein")}
                @{title="Penanganan Cedera Olahraga"; sub=@("Jenis Cedera","Pertolongan Pertama","RICE","Rehabilitasi","Pencegahan Cedera"); key=@("Cedera","RICE","Rehabilitasi","Pencegahan")}
                @{title="Olahraga Prestasi"; sub=@("Pembinaan Atlet","Puslatnas","PON","Olimpiade","Sport Science"); key=@("Prestasi","Pembinaan","Olimpiade","Sport Science")}
            )
        }
    }
    @{  # 6. PAI
        id = "pai"
        file = "pai"
        label = "PAI"
        grades = @{
            10 = @(
                @{title="Al-Qur'an Surah Al-Maidah"; sub=@("Teks dan Terjemahan","Tafsir Ayat Al-Maidah 48","Nilai Kemanusiaan","Keadilan dalam Islam"); key=@("Al-Maidah","Keadilan","Tafsir","Kemanusiaan")}
                @{title="Al-Qur'an Surah Yunus"; sub=@("Teks dan Terjemahan","Tafsir Yunus 40-41","Toleransi Beragama","Kebebasan Berkeyakinan"); key=@("Yunus","Toleransi","Keyakinan","Tafsir")}
                @{title="Akidah Islam"; sub=@("Rukun Iman","Iman kepada Allah","Iman kepada Malaikat","Iman kepada Kitab","Iman kepada Rasul"); key=@("Akidah","Iman","Rukun Iman","Tauhid")}
                @{title="Fiqih Muamalah dan Munakahat"; sub=@("Jual Beli dalam Islam","Hukum Jual Beli","Pernikahan dalam Islam","Mahar","Hak dan Kewajiban Suami Istri"); key=@("Muamalah","Munakahat","Jual Beli","Nikah")}
                @{title="Akhlak Terpuji"; sub=@("Husnuzan","Tawakal","Sabar","Syukur","Qanaah"); key=@("Akhlak","Husnuzan","Tawakal","Sabar")}
                @{title="Sejarah Khulafaur Rasyidin"; sub=@("Abu Bakar Ash-Shiddiq","Umar bin Khattab","Utsman bin Affan","Ali bin Abi Thalib","Peradaban Masa Khulafaur Rasyidin"); key=@("Khulafaur Rasyidin","Abu Bakar","Umar","Khalifah")}
            )
            11 = @(
                @{title="Al-Qur'an Surah Al-Baqarah"; sub=@("Teks dan Terjemahan","Tafsir Al-Baqarah 83","Perintah Berbuat Baik","Larangan Kerusakan"); key=@("Al-Baqarah","Tafsir","Perbuatan Baik","Kerusakan")}
                @{title="Al-Qur'an Surah Ali Imran"; sub=@("Teks dan Terjemahan","Tafsir Ali Imran 190-191","Tanda Kekuasaan Allah","Ulul Albab"); key=@("Ali Imran","Ulul Albab","Berpikir","Tanda")}
                @{title="Fiqih Mawaris"; sub=@("Hukum Waris Islam","Ahli Waris","Bagian Waris","Hijab","Wasiat"); key=@("Mawaris","Waris","Hijab","Wasiat")}
                @{title="Fiqih Hudud"; sub=@("Pengertian Hudud","Hukuman dalam Islam","Tujuan Hukuman","Tobat Nasuha","Hak Asasi dalam Islam"); key=@("Hudud","Hukuman","Tobat","Sanksi")}
                @{title="Akhlak dalam Kehidupan"; sub=@("Akhlak kepada Allah","Akhlak kepada Nabi","Akhlak kepada Orang Tua","Akhlak kepada Guru","Akhlak kepada Sesama"); key=@("Akhlak","Ihsan","Birrul Walidain","Adab")}
                @{title="Sejarah Dinasti Islam"; sub=@("Dinasti Umayyah","Dinasti Abbasiyah","Peradaban Umayyah","Peradaban Abbasiyah","Puncak Kejayaan Islam"); key=@("Dinasti","Umayyah","Abbasiyah","Peradaban")}
            )
            12 = @(
                @{title="Al-Qur'an Surah Luqman"; sub=@("Teks dan Terjemahan","Tafsir Luqman 13-14","Pendidikan Anak","Bersyukur"); key=@("Luqman","Pendidikan","Syukur","Nasihat")}
                @{title="Al-Qur'an Surah Ibrahim"; sub=@("Teks dan Terjemahan","Tafsir Ibrahim 32-34","Nikmat Allah","Bersyukur atas Nikmat"); key=@("Ibrahim","Nikmat","Syukur","Tafsir")}
                @{title="Fiqih Siasah Syar'iyah"; sub=@("Politik dalam Islam","Pemerintahan Islam","Kepemimpinan","Keadilan Sosial","Musyawarah"); key=@("Siasah","Politik","Pemerintahan","Musyawarah")}
                @{title="Akhlak dan Etika"; sub=@("Etika Pergaulan","Etika Bermedia Sosial","Akhlak Lingkungan","Akhlak Kewarganegaraan"); key=@("Etika","Media Sosial","Lingkungan","Pergaulan")}
                @{title="Sejarah Islam Modern"; sub=@("Kebangkitan Islam","Pembaruan Islam","Organisasi Islam Modern","Islam di Indonesia","Tokoh Pembaruan"); key=@("Modern","Pembaruan","Organisasi","Indonesia")}
            )
        }
    }
    @{  # 7. Matematika Tingkat Lanjut
        id = "mtl"
        file = "mtk_lanjut"
        label = "Matematika Tingkat Lanjut"
        grades = @{
            10 = @(
                @{title="Fungsi Rasional"; sub=@("Bentuk Fungsi Rasional","Domain dan Range","Asimtot","Grafik Fungsi Rasional","Aplikasi Fungsi Rasional"); key=@("Fungsi","Rasional","Asimtot","Domain")}
                @{title="Matriks Awal"; sub=@("Definisi dan Notasi","Jenis Matriks","Operasi Dasar","Sifat Operasi","Matriks Khusus"); key=@("Matriks","Ordo","Transpose","Skalar")}
                @{title="Vektor pada Bidang Datar"; sub=@("Vektor Posisi","Operasi Vektor","Perkalian Skalar","Proyeksi Vektor","Aplikasi Vektor"); key=@("Vektor","Bidang","Skalar","Proyeksi")}
                @{title="Fungsi Trigonometri Lanjutan"; sub=@("Fungsi Sinus dan Cosinus","Fungsi Tangen","Identitas Trigonometri","Persamaan Trigonometri","Pertidaksamaan Trigonometri"); key=@("Trigonometri","Periodik","Identitas","Amplitudo")}
                @{title="Irisan Kerucut"; sub=@("Lingkaran","Parabola","Elips","Hiperbola","Persamaan Irisan Kerucut"); key=@("Kerucut","Lingkaran","Parabola","Elips")}
            )
            11 = @(
                @{title="Polinomial Tingkat Lanjut"; sub=@("Operasi Polinomial","Teorema Sisa","Teorema Faktor","Akar Rasional","Akar Kompleks"); key=@("Polinomial","Sisa","Faktor","Akar")}
                @{title="Matriks Transformasi"; sub=@("Transformasi Linear","Matriks Refleksi","Matriks Rotasi","Komposisi Transformasi","Invers Transformasi"); key=@("Transformasi","Matriks","Linear","Geometri")}
                @{title="Fungsi Periodik"; sub=@("Konsep Periodik","Amplitudo dan Frekuensi","Fase dan Geseran","Grafik Fungsi Periodik","Aplikasi Fungsi Periodik"); key=@("Periodik","Amplitudo","Frekuensi","Fase")}
                @{title="Barisan dan Deret Tak Hingga"; sub=@("Barisan Tak Hingga","Deret Konvergen","Deret Divergen","Uji Konvergensi","Deret Geometri"); key=@("Tak Hingga","Konvergen","Divergen","Barisan")}
                @{title="Irisan Kerucut Lanjutan"; sub=@("Persamaan Lingkaran","Persamaan Parabola","Persamaan Elips","Persamaan Hiperbola","Aplikasi Irisan Kerucut"); key=@("Parabola","Elips","Hiperbola","Eksentrisitas")}
            )
            12 = @(
                @{title="Kalkulus Diferensial Lanjutan"; sub=@("Turunan Implisit","Turunan Parametrik","Turunan Tingkat Tinggi","Teorema L'Hopital","Limit Bentuk Tak Tentu"); key=@("Turunan","Implisit","Parametrik","L'Hopital")}
                @{title="Kalkulus Integral Lanjutan"; sub=@("Integral Lipat","Integral Tentu","Aplikasi Integral","Volume Benda Putar","Panjang Busur"); key=@("Integral","Lipat","Volume","Busur")}
                @{title="Vektor dalam Ruang (3D)"; sub=@("Vektor di R3","Operasi Vektor 3D","Perkalian Silang","Perkalian Skalar Tiga Vektor","Aplikasi Vektor 3D"); key=@("Vektor","Ruang","3 Dimensi","Perkalian Silang")}
                @{title="Bilangan Kompleks"; sub=@("Bentuk Kartesius","Bentuk Polar","Operasi Bilangan Kompleks","Akar Bilangan Kompleks","Aplikasi Bilangan Kompleks"); key=@("Kompleks","Imajiner","Polar","Argument")}
                @{title="Transformasi Geometri Lanjutan"; sub=@("Transformasi Linear","Komposisi Transformasi","Invers Transformasi","Matriks Transformasi","Aplikasi dalam Grafika"); key=@("Transformasi","Komposisi","Invers","Grafika")}
            )
        }
    }
    @{  # 8. Fisika
        id = "fis"
        file = "fisika"
        label = "Fisika"
        grades = @{
            10 = @(
                @{title="Besaran dan Pengukuran"; sub=@("Besaran Pokok","Besaran Turunan","Satuan SI","Alat Ukur","Angka Penting"); key=@("Besaran","Satuan","Mengukur","Angka Penting")}
                @{title="Kinematika"; sub=@("Gerak Lurus Beraturan","Gerak Lurus Berubah Beraturan","Gerak Vertikal","Gerak Parabola","Perpindahan dan Jarak"); key=@("Kinematika","Kecepatan","Percepatan","Gerak")}
                @{title="Dinamika"; sub=@("Hukum Newton","Gaya Berat","Gaya Normal","Gaya Gesek","Aplikasi Hukum Newton"); key=@("Newton","Gaya","Massa","Gesek")}
                @{title="Usaha dan Energi"; sub=@("Konsep Usaha","Energi Kinetik","Energi Potensial","Hukum Kekekalan Energi","Daya"); key=@("Usaha","Energi","Kinetik","Potensial")}
                @{title="Suhu dan Kalor"; sub=@("Skala Suhu","Pemuaian","Kalor","Kapasitas Kalor","Perpindahan Kalor"); key=@("Suhu","Kalor","Pemuaian","Konduksi")}
                @{title="Gelombang"; sub=@("Jenis Gelombang","Besaran Gelombang","Gelombang Berjalan","Gelombang Stasioner","Cepat Rambat Gelombang"); key=@("Gelombang","Frekuensi","Panjang","Amplitudo")}
            )
            11 = @(
                @{title="Mekanika"; sub=@("Momen Gaya","Momen Inersia","Kesetimbangan Benda Tegar","Titik Berat","Hukum Kekekalan Momentum"); key=@("Momen","Inersia","Kesetimbangan","Momentum")}
                @{title="Fluida"; sub=@("Tekanan Hidrostatis","Hukum Pascal","Hukum Archimedes","Tegangan Permukaan","Viskositas"); key=@("Fluida","Tekanan","Pascal","Archimedes")}
                @{title="Termodinamika"; sub=@("Hukum ke-0 Termodinamika","Hukum ke-1 Termodinamika","Hukum ke-2 Termodinamika","Siklus Termodinamika","Mesin Kalor"); key=@("Termodinamika","Entropi","Kalor","Usaha")}
                @{title="Optik"; sub=@("Cahaya","Pemantulan","Pembiasan","Lensa","Alat Optik"); key=@("Optik","Cahaya","Lensa","Pemantulan")}
                @{title="Bunyi"; sub=@("Cepat Rambat Bunyi","Frekuensi Bunyi","Resonansi","Efek Doppler","Intensitas Bunyi"); key=@("Bunyi","Resonansi","Doppler","Intensitas")}
                @{title="Cahaya"; sub=@("Sifat Cahaya","Interferensi","Difraksi","Polarisasi","Dispersi"); key=@("Cahaya","Interferensi","Difraksi","Polarisasi")}
            )
            12 = @(
                @{title="Listrik Statis"; sub=@("Muatan Listrik","Hukum Coulomb","Medan Listrik","Potensial Listrik","Energi Potensial Listrik"); key=@("Listrik","Muatan","Coulomb","Medan")}
                @{title="Listrik Dinamis"; sub=@("Arus Listrik","Hukum Ohm","Rangkaian Seri","Rangkaian Paralel","Hukum Kirchhoff"); key=@("Arus","Tegangan","Hambatan","Kirchhoff")}
                @{title="Medan Magnet"; sub=@("Sumber Medan Magnet","Gaya Lorentz","Kawat Berarus","Medan Magnet Solenoida","Aplikasi Medan Magnet"); key=@("Magnet","Lorentz","Medan","Solenoida")}
                @{title="Induksi Elektromagnetik"; sub=@("Fluks Magnetik","GGL Induksi","Transformator","Generator","Arus Bolak Balik"); key=@("Induksi","GGL","Transformator","Generator")}
                @{title="Fisika Atom dan Nuklir"; sub=@("Struktur Atom","Model Atom","Radioaktivitas","Reaksi Nuklir","Energi Nuklir"); key=@("Atom","Inti","Radioaktif","Nuklir")}
                @{title="Fisika Modern"; sub=@("Relativitas Khusus","Dilatasi Waktu","Kontraksi Panjang","Efek Fotolistrik","Dualisme Gelombang Partikel"); key=@("Relativitas","Kuantum","Fotolistrik","Dualisme")}
            )
        }
    }
    @{  # 9. Kimia
        id = "kim"
        file = "kimia"
        label = "Kimia"
        grades = @{
            10 = @(
                @{title="Struktur Atom"; sub=@("Teori Atom","Partikel Penyusun Atom","Konfigurasi Elektron","Bilangan Kuantum","SPU"); key=@("Atom","Proton","Elektron","Neutron")}
                @{title="Ikatan Kimia"; sub=@("Ikatan Ion","Ikatan Kovalen","Ikatan Logam","Ikatan Hidrogen","Gaya Antarmolekul"); key=@("Ikatan","Kovalen","Ion","Logam")}
                @{title="Stoikiometri"; sub=@("Massa Atom Relatif","Massa Molekul Relatif","Mol","Rumus Kimia","Pereaksi Pembatas"); key=@("Stoikiometri","Mol","Massa","Reaksi")}
                @{title="Larutan"; sub=@("Konsentrasi Larutan","Elektrolit Non Elektrolit","Sifat Koligatif","pH Larutan","Titrasi"); key=@("Larutan","Konsentrasi","pH","Titrasi")}
                @{title="Termokimia"; sub=@("Sistem dan Lingkungan","Entalpi","Reaksi Eksoterm","Reaksi Endoterm","Hukum Hess"); key=@("Termokimia","Entalpi","Eksoterm","Endoterm")}
            )
            11 = @(
                @{title="Laju Reaksi"; sub=@("Konsep Laju Reaksi","Faktor Laju Reaksi","Orde Reaksi","Teori Tumbukan","Katalis"); key=@("Laju","Reaksi","Katalis","Orde")}
                @{title="Kesetimbangan Kimia"; sub=@("Konsep Kesetimbangan","Tetapan Kesetimbangan","Pergeseran Kesetimbangan","Faktor Pergeseran","Asas Le Chatelier"); key=@("Kesetimbangan","Le Chatelier","Tetapan","Dinamis")}
                @{title="Asam dan Basa"; sub=@("Teori Asam Basa","pH Asam Basa","Kekuatan Asam Basa","Indikator","Hidrolisis Garam"); key=@("Asam","Basa","pH","Indikator")}
                @{title="Hidrolisis"; sub=@("Hidrolisis Garam","pH Hidrolisis","Larutan Buffer","Kapasitas Buffer","Aplikasi Buffer"); key=@("Hidrolisis","Buffer","Garam","pH")}
                @{title="Redoks dan Elektrokimia"; sub=@("Konsep Redoks","Bilangan Oksidasi","Penyetaraan Reaksi","Sel Volta","Sel Elektrolisis"); key=@("Redoks","Oksidasi","Reduksi","Elektrokimia")}
            )
            12 = @(
                @{title="Sifat Koligatif"; sub=@("Penurunan Tekanan Uap","Kenaikan Titik Didih","Penurunan Titik Beku","Tekanan Osmotik","Aplikasi Sifat Koligatif"); key=@("Koligatif","Tekanan","Titik Didih","Osmotik")}
                @{title="Elektrokimia"; sub=@("Potensial Sel","Reaksi Sel","Deret Volta","Korosi","Elektroplating"); key=@("Elektrokimia","Potensial","Volta","Korosi")}
                @{title="Kimia Organik"; sub=@("Senyawa Karbon","Gugus Fungsi","Hidrokarbon","Alkana","Alkena dan Alkuna"); key=@("Organik","Karbon","Hidrokarbon","Gugus Fungsi")}
                @{title="Polimer"; sub=@("Konsep Polimer","Polimer Adisi","Polimer Kondensasi","Kegunaan Polimer","Dampak Polimer"); key=@("Polimer","Adisi","Kondensasi","Plastik")}
                @{title="Kimia Unsur"; sub=@("Kelimpahan Unsur","Unsur Utama","Unsur Transisi","Mineral","Pembuatan Unsur"); key=@("Unsur","Periodik","Transisi","Mineral")}
            )
        }
    }
    @{  # 10. Biologi
        id = "bio"
        file = "biologi"
        label = "Biologi"
        grades = @{
            10 = @(
                @{title="Keanekaragaman Hayati"; sub=@("Keanekaragaman Gen","Keanekaragaman Spesies","Keanekaragaman Ekosistem","Klasifikasi Makhluk Hidup","Pelestarian"); key=@("Biodiversitas","Spesies","Gen","Ekosistem")}
                @{title="Virus dan Bakteri"; sub=@("Struktur Virus","Reproduksi Virus","Peran Virus","Struktur Bakteri","Peran Bakteri"); key=@("Virus","Bakteri","Replikasi","Prokariot")}
                @{title="Jamur"; sub=@("Karakteristik Jamur","Klasifikasi Jamur","Reproduksi Jamur","Peran Jamur","Zygomycota Ascomycota Basidiomycota"); key=@("Jamur","Fungi","Miselium","Spora")}
                @{title="Kingdom Plantae"; sub=@("Bryophyta","Pteridophyta","Gymnospermae","Angiospermae","Peran Tumbuhan"); key=@("Tumbuhan","Lumut","Paku","Biji")}
                @{title="Kingdom Animalia"; sub=@("Invertebrata","Vertebrata","Porifera","Arthropoda","Mamalia"); key=@("Hewan","Invertebrata","Vertebrata","Mamalia")}
                @{title="Ekosistem"; sub=@("Komponen Ekosistem","Aliran Energi","Rantai Makanan","Daur Biogeokimia","Suksesi"); key=@("Ekosistem","Rantai","Energi","Suksesi")}
            )
            11 = @(
                @{title="Sel"; sub=@("Struktur Sel","Organel Sel","Sel Tumbuhan","Sel Hewan","Perbedaan Sel"); key=@("Sel","Organel","Membran","Inti")}
                @{title="Jaringan Tumbuhan dan Hewan"; sub=@("Jaringan Meristem","Jaringan Dewasa","Jaringan Epitel","Jaringan Otot","Jaringan Saraf"); key=@("Jaringan","Meristem","Epitel","Otot")}
                @{title="Sistem Gerak"; sub=@("Rangka Manusia","Tulang","Sendi","Otot","Gangguan Gerak"); key=@("Gerak","Rangka","Otot","Sendi")}
                @{title="Sistem Peredaran Darah"; sub=@("Jantung","Pembuluh Darah","Golongan Darah","Sistem Limfatik","Gangguan Peredaran Darah"); key=@("Darah","Jantung","Pembuluh","Limfa")}
                @{title="Sistem Pencernaan"; sub=@("Organ Pencernaan","Enzim Pencernaan","Proses Pencernaan","Gizi dan Makanan","Gangguan Pencernaan"); key=@("Pencernaan","Enzim","Gizi","Organ")}
                @{title="Sistem Pernapasan"; sub=@("Alat Pernapasan","Mekanisme Pernapasan","Kapasitas Paru","Gangguan Pernapasan","Pertukaran Gas"); key=@("Pernapasan","Paru","Oksigen","Karbondioksida")}
            )
            12 = @(
                @{title="Enzim dan Metabolisme"; sub=@("Sifat Enzim","Kerja Enzim","Katabolisme","Anabolisme","Fotosintesis"); key=@("Enzim","Metabolisme","Katabolisme","Anabolisme")}
                @{title="Genetika"; sub=@("Hukum Mendel","Persilangan Monohibrid","Persilangan Dihibrid","Penyimpangan Semu","Pola Hereditas"); key=@("Genetika","Mendel","Persilangan","Hereditas")}
                @{title="Evolusi"; sub=@("Teori Evolusi","Seleksi Alam","Adaptasi","Spesiasi","Bukti Evolusi"); key=@("Evolusi","Darwin","Seleksi","Spesiasi")}
                @{title="Bioteknologi"; sub=@("Konsep Bioteknologi","Bioteknologi Konvensional","Bioteknologi Modern","Rekayasa Genetika","Dampak Bioteknologi"); key=@("Bioteknologi","Genetika","DNA Rekombinan","Bioetika")}
                @{title="Pertumbuhan dan Perkembangan"; sub=@("Pertumbuhan Primer","Pertumbuhan Sekunder","Faktor Pertumbuhan","Perkembangan Embrio","Regulasi Pertumbuhan"); key=@("Pertumbuhan","Perkembangan","Hormon","Embrio")}
            )
        }
    }
    @{  # 11. Ekonomi
        id = "eko"
        file = "ekonomi"
        label = "Ekonomi"
        grades = @{
            10 = @(
                @{title="Konsep Dasar Ekonomi"; sub=@("Definisi Ekonomi","Kebutuhan dan Kelangkaan","Pilihan dan Skala Prioritas","Biaya Peluang","Prinsip Ekonomi"); key=@("Ekonomi","Kelangkaan","Kebutuhan","Peluang")}
                @{title="Permintaan dan Penawaran"; sub=@("Hukum Permintaan","Hukum Penawaran","Kurva Permintaan","Kurva Penawaran","Keseimbangan Pasar"); key=@("Permintaan","Penawaran","Keseimbangan","Harga")}
                @{title="Pasar"; sub=@("Pasar Barang","Pasar Input","Pasar Persaingan","Pasar Monopoli","Struktur Pasar"); key=@("Pasar","Persaingan","Monopoli","Struktur")}
                @{title="Bank dan Lembaga Keuangan"; sub=@("Pengertian Bank","Jenis Bank","Fungsi Bank","Bank Sentral","OJK"); key=@("Bank","Lembaga Keuangan","OJK","Kredit")}
                @{title="Koperasi"; sub=@("Pengertian Koperasi","Prinsip Koperasi","Jenis Koperasi","SHU","Peran Koperasi"); key=@("Koperasi","SHU","Anggota","Gotong Royong")}
                @{title="APBN dan APBD"; sub=@("Pengertian APBN","Fungsi APBN","Sumber Penerimaan","Belanja Negara","APBD"); key=@("APBN","APBD","Pajak","Belanja")}
            )
            11 = @(
                @{title="Pertumbuhan Ekonomi"; sub=@("Konsep Pertumbuhan","PDB dan PNB","Faktor Pertumbuhan","Teori Pertumbuhan","Pembangunan Ekonomi"); key=@("Pertumbuhan","PDB","PNB","Pembangunan")}
                @{title="Ketenagakerjaan"; sub=@("Angkatan Kerja","Kesempatan Kerja","Pengangguran","Upah","Hubungan Industrial"); key=@("Tenaga Kerja","Pengangguran","Upah","Industrial")}
                @{title="Pajak"; sub=@("Pengertian Pajak","Fungsi Pajak","Jenis Pajak","Tarif Pajak","Ketentuan Perpajakan"); key=@("Pajak","SPT","Tarif","Wajib Pajak")}
                @{title="Perdagangan Internasional"; sub=@("Manfaat Perdagangan","Ekspor Impor","Neraca Pembayaran","Kurs Valuta Asing","Kebijakan Perdagangan"); key=@("Perdagangan","Ekspor","Impor","Kurs")}
                @{title="Akuntansi Dasar"; sub=@("Pengertian Akuntansi","Siklus Akuntansi","Persamaan Akuntansi","Jurnal Umum","Buku Besar"); key=@("Akuntansi","Jurnal","Buku Besar","Debit Kredit")}
                @{title="Laporan Keuangan"; sub=@("Laporan Laba Rugi","Laporan Perubahan Modal","Neraca","Laporan Arus Kas","Analisis Laporan"); key=@("Laporan","Keuangan","Neraca","Laba Rugi")}
            )
            12 = @(
                @{title="Akuntansi Lanjutan"; sub=@("Jurnal Penyesuaian","Neraca Lajur","Laporan Keuangan Perusahaan Dagang","Jurnal Penutup","Akuntansi Persekutuan"); key=@("Penyesuaian","Neraca Lajur","Penutup","Persekutuan")}
                @{title="Ekonomi Internasional"; sub=@("Globalisasi Ekonomi","Integrasi Ekonomi","Organisasi Ekonomi","WTO","MEA"); key=@("Internasional","Globalisasi","WTO","MEA")}
                @{title="Pembangunan Ekonomi"; sub=@("Konsep Pembangunan","Strategi Pembangunan","SDGs","Kemiskinan","Kesenjangan"); key=@("Pembangunan","SDGs","Kemiskinan","Kesenjangan")}
                @{title="Pasar Modal"; sub=@("Pengertian Pasar Modal","Instrumen Pasar Modal","Bursa Efek","Saham dan Obligasi","Indeks Harga Saham"); key=@("Pasar Modal","Saham","Obligasi","Bursa Efek")}
                @{title="BUMN dan BUMD"; sub=@("Pengertian BUMN","Badan Usaha Milik Negara","BUMD","Peran BUMN","Privatisasi"); key=@("BUMN","BUMD","Perusahaan Negara","Privatisasi")}
            )
        }
    }
    @{  # 12. Geografi
        id = "geo"
        file = "geografi"
        label = "Geografi"
        grades = @{
            10 = @(
                @{title="Dasar-Dasar Geografi"; sub=@("Konsep Geografi","Prinsip Geografi","Pendekatan Geografi","Aspek Geografi","Objek Geografi"); key=@("Geografi","Spasial","Wilayah","Lingkungan")}
                @{title="Tata Surya"; sub=@("Teori Terbentuknya","Matahari","Planet","Bumi","Bulan"); key=@("Tata Surya","Planet","Bumi","Matahari")}
                @{title="Atmosfer"; sub=@("Lapisan Atmosfer","Cuaca dan Iklim","Suhu Udara","Tekanan Udara","Angin"); key=@("Atmosfer","Cuaca","Iklim","Angin")}
                @{title="Litosfer"; sub=@("Batuan Pembentuk Bumi","Tektonik Lempeng","Gempa Bumi","Gunung Api","Tenaga Eksogen"); key=@("Litosfer","Tektonik","Gempa","Batuan")}
                @{title="Hidrosfer"; sub=@("Siklus Air","Air Tanah","Sungai","Danau","Laut"); key=@("Hidrosfer","Air","Sungai","Laut")}
                @{title="Biosfer"; sub=@("Persebaran Flora","Persebaran Fauna","Bioma","Faktor Persebaran","Konservasi"); key=@("Biosfer","Flora","Fauna","Bioma")}
            )
            11 = @(
                @{title="Antroposfer"; sub=@("Dinamika Penduduk","Komposisi Penduduk","Pertumbuhan Penduduk","Migrasi","Proyeksi Penduduk"); key=@("Penduduk","Demografi","Migrasi","Piramida")}
                @{title="Sumber Daya Alam"; sub=@("Jenis SDA","SDA Terbarukan","SDA Tak Terbarukan","Konservasi SDA","Pembangunan Berkelanjutan"); key=@("SDA","Konservasi","Berkelanjutan","Energi")}
                @{title="Kependudukan"; sub=@("Kualitas Penduduk","Ledakan Penduduk","Transisi Demografi","Keluarga Berencana","Bonus Demografi"); key=@("Kependudukan","Demografi","Kualitas","Bonus")}
                @{title="Kebudayaan dan Masyarakat"; sub=@("Kebudayaan Daerah","Persebaran Budaya","Akulturasi","Asimilasi","Globalisasi Budaya"); key=@("Budaya","Akulturasi","Tradisi","Modernisasi")}
                @{title="Industri"; sub=@("Pengertian Industri","Klasifikasi Industri","Lokasi Industri","Kawasan Industri","Industrialisasi"); key=@("Industri","Manufaktur","Lokasi","Kawasan")}
                @{title="Konektivitas Wilayah"; sub=@("Transportasi","Interaksi Desa Kota","Pusat Pertumbuhan","Wilayah Fungsional","Keterkaitan Spasial"); key=@("Konektivitas","Transportasi","Interaksi","Wilayah")}
            )
            12 = @(
                @{title="Sistem Informasi Geografis"; sub=@("Konsep SIG","Komponen SIG","Data Spasial","Data Atribut","Analisis SIG"); key=@("SIG","Spatial","GIS","Peta")}
                @{title="Konsep Wilayah"; sub=@("Wilayah Formal","Wilayah Fungsional","Perwilayahan","Pusat Pertumbuhan","Teori Tempat Pusat"); key=@("Wilayah","Regional","Fungsional","Pusat")}
                @{title="Perencanaan Tata Ruang"; sub=@("Tata Ruang Wilayah","RTRW","Rencana Tata Ruang","Pemanfaatan Lahan","Pengendalian Tata Ruang"); key=@("Tata Ruang","RTRW","Lahan","Perencanaan")}
                @{title="Globalisasi dalam Geografi"; sub=@("Globalisasi dan Spasial","Jaringan Global","Kota Global","Pengaruh Global","Respon Lokal"); key=@("Globalisasi","Jaringan","Kota Global","Spasial")}
                @{title="Kerja Sama Regional dan Global"; sub=@("ASEAN","UNESCO","APEC","Regionalisme","Kerja Sama Selatan Selatan"); key=@("ASEAN","Regional","Global","Kerja Sama")}
            )
        }
    }
    @{  # 13. Sosiologi
        id = "sos"
        file = "sosiologi"
        label = "Sosiologi"
        grades = @{
            10 = @(
                @{title="Sosiologi sebagai Ilmu"; sub=@("Pengertian Sosiologi","Tokoh Sosiologi","Objek Sosiologi","Fungsi Sosiologi","Manfaat Sosiologi"); key=@("Sosiologi","Masyarakat","Fakta Sosial","Empiris")}
                @{title="Interaksi Sosial"; sub=@("Ciri Interaksi","Syarat Interaksi","Faktor Pembentuk","Bentuk Interaksi","Akibat Interaksi"); key=@("Interaksi","Timbal Balik","Asosiatif","Disosiatif")}
                @{title="Sosialisasi"; sub=@("Pengertian Sosialisasi","Media Sosialisasi","Proses Sosialisasi","Agen Sosialisasi","Hasil Sosialisasi"); key=@("Sosialisasi","Internalisasi","Identitas","Agen")}
                @{title="Nilai dan Norma Sosial"; sub=@("Pengertian Nilai","Pengertian Norma","Macam Norma","Klasifikasi Norma","Fungsi Norma"); key=@("Nilai","Norma","Kesopanan","Hukum")}
                @{title="Kelompok Sosial"; sub=@("Ciri Kelompok","Tipe Kelompok","In Group Out Group","Patembayan Patung","Proses Pembentukan"); key=@("Kelompok","Primer","Sekunder","Paguyuban")}
                @{title="Struktur Sosial"; sub=@("Diferensiasi Sosial","Stratifikasi Sosial","Kriteria","Konsekuensi","Interseksi Konsolidasi"); key=@("Struktur","Stratifikasi","Diferensiasi","Status")}
            )
            11 = @(
                @{title="Konflik Sosial"; sub=@("Pengertian Konflik","Sebab Konflik","Jenis Konflik","Dampak Konflik","Resolusi Konflik"); key=@("Konflik","Ketegangan","Resolusi","Mediasi")}
                @{title="Integrasi Sosial"; sub=@("Pengertian Integrasi","Faktor Integrasi","Bentuk Integrasi","Asimilasi","Multikulturalisme"); key=@("Integrasi","Harmoni","Multikultural","Asimilasi")}
                @{title="Mobilitas Sosial"; sub=@("Pengertian Mobilitas","Bentuk Mobilitas","Saluran Mobilitas","Faktor Pendorong","Dampak Mobilitas"); key=@("Mobilitas","Vertikal","Horizontal","Status")}
                @{title="Diferensiasi Sosial"; sub=@("Konsep Diferensiasi","Diferensiasi Ras","Diferensiasi Etnis","Diferensiasi Agama","Diferensiasi Gender"); key=@("Diferensiasi","Ras","Etnis","Gender")}
                @{title="Kekuasaan dan Kewenangan"; sub=@("Pengertian Kekuasaan","Sumber Kekuasaan","Tipe Otoritas","Legitimasi","Distribusi Kekuasaan"); key=@("Kekuasaan","Otoritas","Legitimasi","Pengaruh")}
                @{title="Dinamika Masyarakat"; sub=@("Perubahan Sosial","Masyarakat Tradisional","Masyarakat Modern","Masyarakat Digital","Tantangan Global"); key=@("Dinamika","Modern","Digital","Global")}
            )
            12 = @(
                @{title="Modernisasi dan Globalisasi"; sub=@("Konsep Modernisasi","Syarat Modernisasi","Dampak Modernisasi","Globalisasi Budaya","Globalisasi Ekonomi"); key=@("Modernisasi","Globalisasi","Industrialisasi","Modern")}
                @{title="Ketimpangan Sosial"; sub=@("Konsep Ketimpangan","Kemiskinan","Kesenjangan Ekonomi","Ketimpangan Pendidikan","Solusi Ketimpangan"); key=@("Ketimpangan","Kemiskinan","Kesenjangan","Eksklusi")}
                @{title="Kearifan Lokal"; sub=@("Pengertian Kearifan Lokal","Bentuk Kearifan","Fungsi Kearifan","Pelestarian","Pemberdayaan"); key=@("Kearifan","Lokal","Tradisi","Adat")}
                @{title="Perubahan Sosial"; sub=@("Teori Perubahan","Faktor Perubahan","Bentuk Perubahan","Dampak Perubahan","Penolakan Perubahan"); key=@("Perubahan","Evolusi","Revolusi","Dampak")}
                @{title="Penelitian Sosial"; sub=@("Metode Penelitian","Jenis Penelitian","Teknik Pengumpulan Data","Analisis Data","Laporan Penelitian"); key=@("Penelitian","Metode","Data","Analisis")}
            )
        }
    }
)

$pageCounter = 1

foreach ($subj in $subjects) {
    foreach ($grade in $subj.grades.Keys) {
        $chapters = $subj.grades[$grade]
        $romawi = $kelasRomawi[$grade]
        $fileName = "{0}_{1}.json" -f $subj.file, $grade
        $filePath = Join-Path -Path $outDir -ChildPath $fileName
        $bookId = "sma-{0}-{1}" -f $subj.id, $grade
        $isbn = "978-623-194-7{0:D2}-{1}" -f $pageCounter, (($pageCounter * 3) % 10)
        $pageCounter++

        $chaptersJson = @()
        $chapterNo = 1
        $pageStart = 1

        foreach ($ch in $chapters) {
            $numSub = $ch.sub.Count
            $numKey = $ch.key.Count
            $pageLen = 22 + ($chapterNo % 4) * 3
            $pageEnd = $pageStart + $pageLen
            $semester = if ($chapterNo -le [Math]::Floor($chapters.Count / 2)) { "Ganjil" } else { "Genap" }
            if ($chapters.Count % 2 -eq 1 -and $chapterNo -eq [Math]::Ceiling($chapters.Count / 2)) {
                $semester = "Ganjil"
            }

            $chaptersJson += @{
                no = $chapterNo
                title = $ch.title
                pages = "{0}-{1}" -f $pageStart, $pageEnd
                semester = $semester
                sub_topics = $ch.sub
                key_terms = $ch.key
            }

            $chapterNo++
            $pageStart = $pageEnd + 1
        }

        $book = @{
            bookId = $bookId
            isbn = $isbn
            publisher = "Kemendikbudristek"
            chapters = $chaptersJson
        }

        $jsonString = $book | ConvertTo-Json -Depth 5
        Set-Content -Path $filePath -Value $jsonString -Encoding UTF8
        Write-Host "  [OK] $fileName ($bookId)"
    }
}

Write-Host "`nAll SMA book JSON files generated successfully in: $outDir"
