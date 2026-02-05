# Script Python untuk Ekstraksi PDF BSKAP (Alternatif)
# Install: pip install PyPDF2 atau pip install pdfplumber

import os

try:
    import pdfplumber
    use_plumber = True
except ImportError:
    try:
        import PyPDF2
        use_plumber = False
    except ImportError:
        print("❌ Silakan install library PDF terlebih dahulu:")
        print("pip install pdfplumber")
        print("atau")
        print("pip install PyPDF2")
        exit(1)

def extract_with_pdfplumber(pdf_path, output_path):
    """Ekstraksi menggunakan pdfplumber (lebih akurat)"""
    print(f"📄 Menggunakan pdfplumber untuk ekstraksi...")
    
    text_content = []
    
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Total halaman: {total_pages}")
        
        for i, page in enumerate(pdf.pages, 1):
            if i % 100 == 0:
                print(f"Progress: {i}/{total_pages} halaman...")
            
            text = page.extract_text()
            if text:
                text_content.append(f"\n\n=== HALAMAN {i} ===\n\n")
                text_content.append(text)
    
    full_text = ''.join(text_content)
    
    # Simpan ke file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(full_text)
    
    print(f"✅ Ekstraksi selesai! Total karakter: {len(full_text)}")
    return full_text

def extract_with_pypdf2(pdf_path, output_path):
    """Ekstraksi menggunakan PyPDF2 (lebih cepat tapi kurang akurat)"""
    print(f"📄 Menggunakan PyPDF2 untuk ekstraksi...")
    
    text_content = []
    
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        total_pages = len(reader.pages)
        print(f"Total halaman: {total_pages}")
        
        for i in range(total_pages):
            if (i + 1) % 100 == 0:
                print(f"Progress: {i + 1}/{total_pages} halaman...")
            
            page = reader.pages[i]
            text = page.extract_text()
            
            if text:
                text_content.append(f"\n\n=== HALAMAN {i + 1} ===\n\n")
                text_content.append(text)
    
    full_text = ''.join(text_content)
    
    # Simpan ke file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(full_text)
    
    print(f"✅ Ekstraksi selesai! Total karakter: {len(full_text)}")
    return full_text

if __name__ == "__main__":
    # Path ke PDF
    pdf_path = r"F:\app-firebase\Smart Teaching\smart-teaching-manager\Lampiran keputusan\Kepka_BSKAP_No_01k17e8396ajn15j3hcw0k773b.pdf"
    output_path = r"F:\app-firebase\Smart Teaching\smart-teaching-manager\bskap_extracted.txt"
    
    if not os.path.exists(pdf_path):
        print(f"❌ File PDF tidak ditemukan: {pdf_path}")
        exit(1)
    
    print("🚀 Memulai ekstraksi PDF BSKAP...")
    print(f"Input: {pdf_path}")
    print(f"Output: {output_path}")
    print()
    
    # Pilih library yang tersedia
    if use_plumber:
        text = extract_with_pdfplumber(pdf_path, output_path)
    else:
        text = extract_with_pypdf2(pdf_path, output_path)
    
    print(f"\n✅ File teks berhasil disimpan di:")
    print(f"   {output_path}")
    print("\n💡 Anda sekarang bisa:")
    print("   1. Buka file txt tersebut")
    print("   2. Search (Ctrl+F) untuk mata pelajaran tertentu")
    print("   3. Copy bagian yang relevan ke chat ini")
