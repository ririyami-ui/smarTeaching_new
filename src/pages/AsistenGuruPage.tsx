import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Trash2, Volume2, VolumeX, StopCircle } from 'lucide-react';
import { generateChatResponse } from '../utils/gemini';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../firebase';
import toast from 'react-hot-toast';
import { useChat } from '../utils/ChatContext';
import { useSettings } from '../utils/SettingsContext';
import '../components/TypingIndicator.css';
import './MarkdownStyles.css';
import Modal from '../components/Modal';

import ChatMessageList from '../components/chat/ChatMessageList';
import ChatInput from '../components/chat/ChatInput';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { formatDateTime } from '../utils/dateUtils';

const AsistenGuruPage = () => {
  const { geminiModel, activeSemester, academicYear } = useSettings();
  const { chatHistory, loadingHistory, addMessageToHistory, setChatHistory, clearChat } = useChat();
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: (() => void) | null }>({ isOpen: false, title: '', message: '', onConfirm: null });

  const [liveContext, setLiveContext] = useState<Record<string, unknown> | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isListening, isSpeaking, autoSpeak, setAutoSpeak,
    transcript, setTranscript, speakText, stopSpeaking, toggleListening
  } = useVoiceAssistant(chatHistory, loading);

  // Sync speech recognition transcript to input
  useEffect(() => {
    if (transcript) {
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
      setTranscript('');
      setTimeout(autoResizeTextarea, 0);
    }
  }, [transcript, setTranscript]);

  const fetchLiveContext = useCallback(async (user: { uid: string }) => {
    if (!user) return null;
    try {
      const userId = user.uid;

      // Fetch necessary data for context
      const [attSnap, gradesSnap, journalsSnap, infractionsSnap, starsSnap] = await Promise.all([
        getDocs(query(collection(db, 'attendance'), where('userId', '==', userId), where('semester', '==', activeSemester), where('academicYear', '==', academicYear), limit(500))),
        getDocs(query(collection(db, 'grades'), where('userId', '==', userId), where('semester', '==', activeSemester), where('academicYear', '==', academicYear), limit(500))),
        getDocs(query(collection(db, 'teachingJournals'), where('userId', '==', userId), where('semester', '==', activeSemester), where('academicYear', '==', academicYear), limit(200))),
        getDocs(query(collection(db, 'infractions'), where('userId', '==', userId), where('semester', '==', activeSemester), where('academicYear', '==', academicYear), limit(200))),
        getDocs(query(collection(db, 'studentAppreciations'), where('userId', '==', userId), where('semester', '==', activeSemester), where('academicYear', '==', academicYear), limit(200))),
      ]);

      const attendance = attSnap.docs.map(doc => doc.data());
      const grades = gradesSnap.docs.map(doc => doc.data());
      const journals = journalsSnap.docs.map(doc => doc.data()).slice(-5);
      const infractions = infractionsSnap.docs.map(doc => doc.data());
      const stars = starsSnap.docs.map(doc => doc.data());


      // Simplified context aggregation
      const stats = {
        avgAttendance: attendance.length > 0 ? (attendance.filter(a => a.status === 'Hadir').length / attendance.length * 100).toFixed(1) : '?',
        avgGrade: grades.length > 0 ? (grades.reduce((a, b) => a + parseFloat(b.score || 0), 0) / grades.length).toFixed(1) : '?',
        recentChallenges: journals.filter(j => j.challenges).map(j => j.challenges),
        totalInfractions: infractions.length,
        totalStars: stars.length,
        lastUpdate: formatDateTime(new Date()),
        activeSemester: activeSemester
      };

      setLiveContext(stats);
      return stats;
    } catch {
      return null;
    } finally {
      // no-op
    }
  }, [activeSemester, academicYear]);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: { role: 'user'; parts: { text: string }[]; image: string | undefined } = { role: 'user', parts: [{ text: input }], image: selectedImage ?? undefined };
    addMessageToHistory(userMessage);

    const currentInput = input;
    const currentImage = selectedImage;
    setInput(''); setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setLoading(true);
    try {
      const responseText = await generateChatResponse([...chatHistory, userMessage], currentInput, userProfile, geminiModel, currentImage, liveContext);
      addMessageToHistory({ role: 'model', parts: [{ text: responseText }] });
    } catch {
      addMessageToHistory({ role: 'model', parts: [{ text: 'Maaf, terjadi kesalahan. Silakan coba lagi.' }] });
      toast.error('Gagal merespons.');
    } finally {
      setLoading(false);
    }
  }, [input, selectedImage, chatHistory, userProfile, geminiModel, liveContext, addMessageToHistory]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(currentUser => {
      if (currentUser) {
        const fetchProfile = async () => {
          const docSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (docSnap.exists()) setUserProfile(docSnap.data());
        };
        fetchProfile();
      } else {
        setUserProfile(null);
        setLiveContext(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      fetchLiveContext(currentUser);
    }
  }, [activeSemester, academicYear, fetchLiveContext]);

  // Handle URL based prompts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialPrompt = params.get('prompt');
    if (initialPrompt && userProfile && !loading && !loadingHistory) {
      window.history.replaceState({}, '', window.location.pathname);
      setInput(initialPrompt);
    }
  }, [userProfile, loading, loadingHistory]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (input === params.get('prompt') && input && !loading && !loadingHistory) {
      handleSendMessage();
    }
  }, [input, handleSendMessage, loading, loadingHistory]);

  // Initial greeting
  useEffect(() => {
    if (userProfile && chatHistory.length === 1 && (chatHistory[0].parts[0].text.includes("Selamat datang") || chatHistory[0].parts[0].text.includes("Halo! Saya Smartty"))) {
      const hour = new Date().getHours();
      const greetingTime = hour < 11 ? "pagi" : hour < 15 ? "siang" : hour < 19 ? "sore" : "malam";
      const userName = (userProfile.name as string) || (userProfile.email as string || '').split('@')[0];
      const userTitle = (userProfile.title as string) || "Bpk/Ibu";
      setChatHistory([{
        role: 'model',
        parts: [{ text: `Halo, selamat ${greetingTime} ${userTitle} ${userName}! 👋 Senang bisa ngobrol lagi. Hari ini ada yang bisa Smartty bantu buat bikin ngajar jadi lebih ringan?` }]
      }]);
    }
  }, [userProfile, chatHistory, setChatHistory]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => { scrollToBottom(); }, [chatHistory, loading]);

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const MAX = 1024;
          if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
          else if (height > MAX) { width *= MAX / height; height = MAX; }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) return toast.error("File terlalu besar (Maks 20MB)");
      const toastId = toast.loading("Mengompresi gambar...");
      try {
        const compressed = await compressImage(file);
        setSelectedImage(compressed);
        toast.dismiss(toastId);
      } catch {
        toast.error("Gagal memproses gambar");
        toast.dismiss(toastId);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-144px)] md:h-[calc(100vh-104px)] bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Bot className={`w-5 h-5 text-blue-600 dark:text-blue-400 transition-all duration-500 ${loading ? 'animate-smartty-think' : 'animate-smartty-float animate-smartty-breathe'}`} />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Asisten Cerdas</h2>
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Online • {geminiModel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              else { setAutoSpeak(!autoSpeak); toast.success(autoSpeak ? 'Suara otomatis MATI' : 'Suara otomatis NYALA'); }
            }}
            className={`p-2 rounded-lg transition-all ${isSpeaking ? 'bg-purple-100 text-purple-600 animate-pulse' : autoSpeak ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
            title={isSpeaking ? "Matikan Suara" : "Auto Read (Suara)"}
          >
            {isSpeaking ? <StopCircle size={18} /> : (autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />)}
          </button>

          <button
            onClick={() => setConfirmModal({ isOpen: true, title: 'Hapus Chat', message: 'Apakah Anda yakin ingin menghapus seluruh riwayat percakapan ini secara permanen?', onConfirm: () => { clearChat(); toast.success('Chat dibersihkan'); setConfirmModal(prev => ({ ...prev, isOpen: false })); } })}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <ChatMessageList
        chatHistory={chatHistory}
        loadingHistory={loadingHistory}
        loading={loading}
        chatContainerRef={chatContainerRef}
        onSpeak={speakText}
      />

      <ChatInput
        input={input}
        onInputChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setInput(e.target.value); autoResizeTextarea(); }}
        onSendMessage={handleSendMessage}
        loading={loading}
        loadingHistory={loadingHistory}
        isListening={isListening}
        toggleListening={toggleListening}
        selectedImage={selectedImage}
        onImageUpload={handleImageUpload}
        onClearImage={() => { setSelectedImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
        fileInputRef={fileInputRef}
        textareaRef={textareaRef}
      />

      {confirmModal.isOpen && (
        <Modal onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-6 py-2.5 bg-gray-100 rounded-xl">Batal</button>
              <button onClick={() => confirmModal.onConfirm?.()} className="px-6 py-2.5 bg-red-600 text-white rounded-xl shadow-lg shadow-red-200 dark:shadow-none">Hapus</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AsistenGuruPage;

