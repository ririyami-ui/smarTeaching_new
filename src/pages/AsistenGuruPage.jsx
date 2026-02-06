import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader, Mic, MicOff, Image as ImageIcon, X, Trash2, Volume2, VolumeX, StopCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS
import { generateChatResponse } from '../utils/gemini';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import toast from 'react-hot-toast';
import { useChat } from '../utils/ChatContext.jsx';
import { useSettings } from '../utils/SettingsContext';
import '../components/TypingIndicator.css'; // Import the CSS for the typing indicator
import './MarkdownStyles.css'; // Import the CSS for markdown styles
import Modal from '../components/Modal';

const AsistenGuruPage = () => {
  const { geminiModel } = useSettings();
  const { chatHistory, loadingHistory, addMessageToHistory, setChatHistory, clearChat } = useChat();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isListening, setIsListening] = useState(false); // State for voice input
  const [selectedImage, setSelectedImage] = useState(null); // State for image upload
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null); // Ref for SpeechRecognition instance
  const fileInputRef = useRef(null); // Ref for file input
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Enhanced text-to-speech pre-processing for mathematical notation
  const preprocessMathText = (text) => {
    let processed = text;

    // Step 1: Remove LaTeX delimiters FIRST (before any other processing)
    processed = processed.replace(/\$\$/g, ' '); // Display math $$...$$
    processed = processed.replace(/\$/g, ' '); // Inline math $...$
    processed = processed.replace(/\\\[/g, ' '); // Display math \[...\]
    processed = processed.replace(/\\\]/g, ' ');
    processed = processed.replace(/\\\(/g, ' '); // Inline math \(...\)
    processed = processed.replace(/\\\)/g, ' ');

    // Step 2: Remove markdown formatting
    processed = processed.replace(/\*\*/g, ''); // Bold
    processed = processed.replace(/\*/g, ''); // Italic
    processed = processed.replace(/`/g, ''); // Code
    processed = processed.replace(/#{1,6}\s/g, ''); // Headers
    processed = processed.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links
    processed = processed.replace(/^[-*+]\s/gm, ''); // List bullets
    processed = processed.replace(/_{2,}/g, ''); // Underscores (horizontal rule)

    // Step 3: Handle LaTeX square root \sqrt{...} before other processing
    // \sqrt{16} → akar 16
    processed = processed.replace(/\\sqrt\{([^}]+)\}/g, 'akar dari $1');
    // \sqrt[3]{27} → akar pangkat 3 dari 27
    processed = processed.replace(/\\sqrt\[(\d)\]\{([^}]+)\}/g, 'akar pangkat $1 dari $2');

    // Step 4: Handle LaTeX superscript with braces ^{...}
    // x^{2} → x kuadrat, x^{3} → x kubik, x^{n} → x pangkat n
    processed = processed.replace(/([a-zA-Z0-9]+)\^\{2\}/g, '$1 kuadrat');
    processed = processed.replace(/([a-zA-Z0-9]+)\^\{3\}/g, '$1 kubik');
    processed = processed.replace(/([a-zA-Z0-9]+)\^\{([^}]+)\}/g, '$1 pangkat $2');

    // Step 5: Handle LaTeX subscript with braces _{...}
    // x_{1} → x indeks 1
    processed = processed.replace(/([a-zA-Z])_\{([^}]+)\}/g, '$1 indeks $2');

    // Step 6: Convert Unicode superscripts (pangkat)
    const superscriptMap = {
      '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
      '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
      'ⁿ': 'n', '⁺': 'plus', '⁻': 'minus'
    };

    Object.entries(superscriptMap).forEach(([sup, base]) => {
      const regex = new RegExp(sup, 'g');
      processed = processed.replace(regex, ` pangkat ${base} `);
    });

    // Step 7: Convert common mathematical patterns (caret notation without braces)
    // x^2 → x kuadrat
    processed = processed.replace(/([a-zA-Z0-9]+)\^2\b/g, '$1 kuadrat');
    // x^3 → x kubik  
    processed = processed.replace(/([a-zA-Z0-9]+)\^3\b/g, '$1 kubik');
    // x^n → x pangkat n (general case)
    processed = processed.replace(/([a-zA-Z0-9]+)\^(\d+|[a-zA-Z])/g, '$1 pangkat $2');
    // x^(n+1) → x pangkat (n+1)
    processed = processed.replace(/([a-zA-Z0-9]+)\^\(([^)]+)\)/g, '$1 pangkat $2');

    // Step 5: Subscripts (indeks bawah)
    const subscriptMap = {
      '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
      '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'
    };

    Object.entries(subscriptMap).forEach(([sub, base]) => {
      const regex = new RegExp(sub, 'g');
      processed = processed.replace(regex, ` indeks ${base} `);
    });

    // Subscript notation x_1 → x indeks 1
    processed = processed.replace(/([a-zA-Z])_(\d+)/g, '$1 indeks $2');

    // Step 6: Square root √ → akar
    processed = processed.replace(/√(\d+)/g, 'akar $1');
    processed = processed.replace(/√\(([^)]+)\)/g, 'akar dari $1');
    processed = processed.replace(/\\?sqrt\(([^)]+)\)/g, 'akar dari $1');

    // Step 7: Fractions
    // LaTeX \frac{a}{b} → a per b (do this before division operator)
    processed = processed.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 per $2');
    // a/b → a per b (only for numbers to avoid breaking words)
    processed = processed.replace(/(\d+)\s*\/\s*(\d+)/g, '$1 per $2');

    // Step 8: Mathematical operators (CAREFUL - use word boundaries to avoid breaking words)
    // Replace only when operators are surrounded by spaces or numbers
    processed = processed.replace(/(\s|^)\+(\s|$)/g, '$1tambah$2');
    processed = processed.replace(/(\d)\s*\+\s*(\d)/g, '$1 tambah $2');

    // Minus/dash is tricky - only replace when clearly an operator
    processed = processed.replace(/(\d)\s*-\s*(\d)/g, '$1 kurang $2');

    // Multiplication
    processed = processed.replace(/(\s|^)×(\s|$)/g, '$1kali$2');
    processed = processed.replace(/(\s|^)·(\s|$)/g, '$1kali$2');
    processed = processed.replace(/(\d)\s*×\s*(\d)/g, '$1 kali $2');
    processed = processed.replace(/(\d)\s*·\s*(\d)/g, '$1 kali $2');

    // Division
    processed = processed.replace(/(\s|^)÷(\s|$)/g, '$1bagi$2');
    processed = processed.replace(/(\d)\s*÷\s*(\d)/g, '$1 bagi $2');

    // Equals and comparisons
    processed = processed.replace(/\s*=\s*/g, ' sama dengan ');
    processed = processed.replace(/\s*≈\s*/g, ' kira-kira sama dengan ');
    processed = processed.replace(/\s*≠\s*/g, ' tidak sama dengan ');
    processed = processed.replace(/\s*≤\s*/g, ' lebih kecil atau sama dengan ');
    processed = processed.replace(/\s*≥\s*/g, ' lebih besar atau sama dengan ');
    processed = processed.replace(/(\d)\s*<\s*(\d)/g, '$1 lebih kecil dari $2');
    processed = processed.replace(/(\d)\s*>\s*(\d)/g, '$1 lebih besar dari $2');

    // Step 9: Greek letters (common in math/science)
    const greekMap = {
      'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta',
      'ε': 'epsilon', 'θ': 'theta', 'λ': 'lambda', 'μ': 'mu',
      'π': 'pi', 'σ': 'sigma', 'τ': 'tau', 'ω': 'omega'
    };

    Object.entries(greekMap).forEach(([symbol, name]) => {
      const regex = new RegExp(symbol, 'g');
      processed = processed.replace(regex, name);
    });

    // Step 10: Scientific notation: 1.5×10³ → 1 koma 5 kali 10 pangkat 3
    processed = processed.replace(/(\d+\.?\d*)\s*[x×]\s*10\^(\d+)/g, '$1 kali 10 pangkat $2');
    processed = processed.replace(/(\d+\.?\d*)\s*[x×]\s*10([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (match, coef, exp) => {
      const expNum = exp.split('').map(char => superscriptMap[char] || char).join('');
      return `${coef} kali 10 pangkat ${expNum}`;
    });

    // Step 11: Decimal point: use "koma" for Indonesian
    processed = processed.replace(/(\d+)\.(\d+)/g, '$1 koma $2');

    // Step 12: Percentage
    processed = processed.replace(/(\d+)\s*%/g, '$1 persen');

    // Step 13: Degree symbol
    processed = processed.replace(/(\d+)\s*°/g, '$1 derajat');

    // Step 14: Chemistry formulas: H₂O → H 2 O
    processed = processed.replace(/([A-Z][a-z]?)₂/g, '$1 dua ');
    processed = processed.replace(/([A-Z][a-z]?)₃/g, '$1 tiga ');
    processed = processed.replace(/([A-Z][a-z]?)₄/g, '$1 empat ');

    // Step 15: Clean up extra spaces
    processed = processed.replace(/\s+/g, ' ').trim();

    return processed;
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) {
      toast.error('Browser tidak mendukung text-to-speech');
      return;
    }

    // Stop listening if speaking to avoid feedback loop
    window.speechSynthesis.cancel();

    // Pre-process text for natural mathematical reading
    const cleanText = preprocessMathText(text);

    // Skip if empty after cleaning
    if (!cleanText || cleanText.trim().length === 0) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Voice settings for natural Indonesian
    utterance.lang = 'id-ID';
    utterance.rate = 1.0; // Natural speed - balanced and clear
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use Indonesian voice if available
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(voice => voice.lang === 'id-ID' || voice.lang.startsWith('id'));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Auto-speak effect
  useEffect(() => {
    if (autoSpeak && chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      if (lastMessage.role === 'model' && !loading) {
        // Simple heuristic: if message is long, maybe wait or just speak
        // Ideally we check if it was just added.
        // For now, let's just speak if it's the latest and we aren't already speaking it
        speakText(lastMessage.parts[0].text);
      }
    }
  }, [chatHistory, autoSpeak, loading]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory, loading, loadingHistory]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      console.log("Auth state changed, user:", user);
      if (user) {
        const fetchProfile = async () => {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          }
        };
        fetchProfile();
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Check for prompt in query parameters
    const params = new URLSearchParams(window.location.search);
    const initialPrompt = params.get('prompt');

    if (initialPrompt && userProfile && !loading && !loadingHistory) {
      // Clear the prompt from URL to avoid re-triggering
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Trigger message send
      setInput(initialPrompt);
      // We need a small delay or use a separate effect because setInput is async
    }
  }, [userProfile, loading, loadingHistory]);

  // Effect to handle auto-sending when input is set from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialPrompt = params.get('prompt');
    if (input === initialPrompt && initialPrompt && !loading && !loadingHistory) {
      handleSendMessage();
    }
  }, [input]);

  useEffect(() => {
    if (userProfile && chatHistory.length === 1 && (chatHistory[0].parts[0].text.includes("Selamat datang") || chatHistory[0].parts[0].text.includes("Halo! Saya Smartty"))) {
      const hour = new Date().getHours();
      let greetingTime;
      if (hour < 11) greetingTime = "pagi";
      else if (hour < 15) greetingTime = "siang";
      else if (hour < 19) greetingTime = "sore";
      else greetingTime = "malam";

      const userName = userProfile.name || userProfile.email.split('@')[0];
      const userTitle = userProfile.title || "Bpk/Ibu";
      const greetingMessage = {
        role: 'model',
        parts: [{
          text: `Halo, selamat ${greetingTime} ${userTitle} ${userName}! 👋 Senang bisa ngobrol lagi. Hari ini ada yang bisa Smartty bantu buat bikin ngajar jadi lebih ringan?`
        }]
      };
      setChatHistory([greetingMessage]);
    }
  }, [userProfile, chatHistory, setChatHistory]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    autoResizeTextarea();
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // --- Voice Input Logic ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Stop after one sentence/phrase for better UX in chat
      recognition.interimResults = false;
      recognition.lang = 'id-ID'; // Indonesian

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => {
          const newValue = prev ? `${prev} ${transcript}` : transcript;
          return newValue;
        });
        // Trigger resize after state update
        setTimeout(autoResizeTextarea, 0);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        toast.error("Gagal mengenali suara. Pastikan izin mikrofon aktif.");
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("Browser does not support Speech Recognition");
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Browser Anda tidak mendukung fitur suara.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
      };
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Basic size check before processing (allow large files to be processed, but maybe warn if HUGE)
      // Removing strict 5MB limit check here as we will compress it anyway, 
      // but let's keep a sanity check for extremely large files that might crash browser memory
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File terlalu besar (Maks 20MB)");
        return;
      }

      const toastId = toast.loading("Mengompresi gambar...");
      try {
        const compressedBase64 = await compressImage(file);
        setSelectedImage(compressedBase64);
        toast.dismiss(toastId);
      } catch (error) {
        console.error("Compression failed", error);
        toast.error("Gagal memproses gambar");
        toast.dismiss(toastId);
      }
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  // -------------------------

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    // Construct user message object, potentially with image
    const userMessageContent = { role: 'user', parts: [{ text: input }] };
    if (selectedImage) {
      // Store image in history for display (optional: you might want to optimize this for long history)
      // For display purposes, we can add a local property or just use the base64
      userMessageContent.image = selectedImage;
    }

    addMessageToHistory(userMessageContent);

    const currentInput = input;
    const currentImage = selectedImage;

    setInput('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      // Pass the updated history to the generate function
      const updatedHistory = [...chatHistory, userMessageContent];
      // Pass image explicitly to the service
      const responseText = await generateChatResponse(updatedHistory, currentInput, userProfile, geminiModel, currentImage);

      const modelMessage = { role: 'model', parts: [{ text: responseText }] };
      addMessageToHistory(modelMessage);

    } catch (error) {
      console.error("Error generating content:", error);
      const errorMessage = { role: 'model', parts: [{ text: 'Maaf, terjadi kesalahan. Silakan coba lagi.' }] };
      addMessageToHistory(errorMessage);
      toast.error('Gagal merespons.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] sm:h-[calc(100vh-160px)] md:h-[calc(100vh-104px)] bg-gray-50 dark:bg-gray-900 overflow-hidden">

      {/* Header with Clear Chat */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
              if (isSpeaking) {
                stopSpeaking();
              } else {
                setAutoSpeak(!autoSpeak);
                toast.success(autoSpeak ? 'Suara otomatis MATI' : 'Suara otomatis NYALA');
              }
            }}
            className={`p-2 rounded-lg transition-all ${isSpeaking
              ? 'bg-purple-100 text-purple-600 animate-pulse'
              : autoSpeak
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-400 hover:bg-gray-100'
              }`}
            title={isSpeaking ? "Matikan Suara" : "Auto Read (Suara)"}
          >
            {isSpeaking ? <StopCircle size={18} /> : (autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />)}
          </button>

          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Hapus Chat',
                message: 'Apakah Anda yakin ingin menghapus seluruh riwayat percakapan ini secara permanen?',
                onConfirm: () => {
                  clearChat();
                  toast.success('Chat dibersihkan');
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
              });
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
            title="Hapus Riwayat Chat"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loadingHistory ? (
          <div className="flex justify-center items-center h-full">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="ml-2 text-gray-500">Memuat riwayat percakapan...</p>
          </div>
        ) : (
          <>
            {chatHistory.map((message, index) => (
              <div key={index} className={`flex items-start gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                {message.role === 'model' && <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />}
                <div className={`chat-message p-3 rounded-[1.2rem] max-w-[85%] sm:max-w-lg break-words overflow-x-auto relative group ${message.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none'}`}>
                  {message.role === 'model' && (
                    <button
                      onClick={() => speakText(message.parts[0].text)}
                      className="absolute -right-8 top-0 p-1 text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-all bg-white/80 dark:bg-gray-900/80 rounded-full shadow-sm"
                      title="Bacakan"
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                  {message.image && (
                    <div className="mb-2">
                      <img src={message.image} alt="User Upload" className="max-w-full rounded-lg max-h-60 border border-white/20" />
                    </div>
                  )}
                  {message.parts[0].text && (
                    <div className="markdown-content text-sm sm:text-base">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {(() => {
                          let text = message.parts[0].text;
                          // Robust detection: if text contains \begin{...} but isn't wrapped in $$ or ```
                          // and it's not already within a code block or math block
                          if (text.includes('\\begin{') && !text.includes('$$')) {
                            // Simple auto-wrap for raw LaTeX blocks that AI failed to delimit
                            // Find blocks starting with \begin and ending with \end
                            text = text.replace(/(\\begin\{[a-z\*]+\}[\s\S]*?\\end\{[a-z\*]+\})/g, '$$\n$1\n$$');
                          }
                          return text;
                        })()}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                {message.role === 'user' && <User className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 flex-shrink-0" />}
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-3 justify-start">
                <Bot className="w-8 h-8 text-blue-500 flex-shrink-0 animate-pulse" />
                <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        {selectedImage && (
          <div className="mb-2 relative inline-block">
            <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm" />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Image Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || loadingHistory}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 flex items-center justify-center transition-all"
            title="Upload Gambar / Scan Soal"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Voice Input Button */}
          <button
            onClick={toggleListening}
            disabled={loading || loadingHistory}
            className={`p-2 rounded-lg flex items-center justify-center transition-all duration-300 ${isListening
              ? 'bg-red-500 text-white animate-pulse shadow-lg ring-2 ring-red-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            title="Input Suara (Voice-to-Text)"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !loading && handleSendMessage()}
            placeholder={isListening ? "Mendengarkan..." : "Ketik pesan atau upload soal..."}
            className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none ${isListening ? 'ring-2 ring-red-400 border-red-400 bg-red-50 dark:bg-red-900/20 placeholder-red-400' : ''
              }`}
            disabled={loading || loadingHistory}
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || loadingHistory || (!input.trim() && !selectedImage)}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
      {confirmModal.isOpen && (
        <Modal onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
              >
                Batal
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AsistenGuruPage;