import booksIndex from './data/books/index.json';
import { normalizeSubjectName } from './ai/base';

export interface BookMetadata {
  id: string;
  jenjang: string;
  mapel: string;
  kelas: string;
  title: string;
  path: string;
}

export interface BookContent {
  bookId: string;
  isbn: string;
  publisher: string;
  chapters: Array<{
    no: number;
    title: string;
    pages: string;
    sub_topics: string[];
    key_terms: string[];
  }>;
}

/**
 * Mencari buku yang cocok secara otomatis berdasarkan konteks mengajar
 */
export const findAutoMatchingBook = (jenjang: string, mapel: string, kelas: string): BookMetadata | null => {
  if (!jenjang || !mapel || !kelas) return null;

  const normalizedMapel = normalizeSubjectName(mapel).toLowerCase();
  return booksIndex.find(book => 
    book.jenjang.toLowerCase() === jenjang.toLowerCase() &&
    normalizedMapel.includes(book.mapel.toLowerCase()) &&
    book.kelas.toString() === kelas.toString()
  ) || null;
};

/**
 * Memuat isi detail bab buku secara dinamis
 */
export const loadBookContent = async (path: string): Promise<BookContent | null> => {
  try {
    // Vite dynamic import support
    const modules = import.meta.glob('./data/books/**/*.json');
    const fullPath = `./data/books/${path}`;
    
    if (modules[fullPath]) {
      const data = await modules[fullPath]();
      return (data as any).default as BookContent;
    }
    return null;
  } catch (error) {
    console.error("Gagal memuat detail buku:", error);
    return null;
  }
};
