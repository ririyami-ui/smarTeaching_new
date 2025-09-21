import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { generateChatResponse } from '../utils/gemini';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import toast from 'react-hot-toast';
import { useChat } from '../utils/ChatContext.jsx';

const AsistenGuruPage = () => {
  const { chatHistory, loadingHistory, addMessageToHistory, setChatHistory } = useChat();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);

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
    if (userProfile && chatHistory.length === 1 && chatHistory[0].parts[0].text.includes("Selamat datang")) {
        const hour = new Date().getHours();
        let greetingTime;
        if (hour < 11) greetingTime = "pagi";
        else if (hour < 15) greetingTime = "siang";
        else if (hour < 19) greetingTime = "sore";
        else greetingTime = "malam";

        const userName = userProfile.name || userProfile.email.split('@')[0];
        const greetingMessage = {
          role: 'model',
          parts: [{
            text: `Selamat ${greetingTime}, Bpk/Ibu ${userName}. Ada yang bisa kami bantu terkait pembelajaran? 😊`
          }]
        };
        setChatHistory([greetingMessage]);
    }
  }, [userProfile, chatHistory, setChatHistory]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', parts: [{ text: input }] };
    addMessageToHistory(userMessage);

    const currentInput = input;
    setInput('');
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      // Pass the updated history to the generate function
      const updatedHistory = [...chatHistory, userMessage];
      const responseText = await generateChatResponse(updatedHistory, currentInput, userProfile);

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
    <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-104px)] bg-gray-50 dark:bg-gray-900">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingHistory ? (
            <div className="flex justify-center items-center h-full">
                <Loader className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="ml-2 text-gray-500">Memuat riwayat percakapan...</p>
            </div>
        ) : (
            <>
                {chatHistory.map((message, index) => (
                <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'model' && <Bot className="w-8 h-8 text-blue-500 flex-shrink-0" />}
                    <div className={`chat-message p-3 rounded-lg max-w-lg whitespace-pre-wrap break-words overflow-x-auto ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                    {message.parts[0].text && <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{message.parts[0].text}</ReactMarkdown>}
                    </div>
                    {message.role === 'user' && <User className="w-8 h-8 text-gray-500 flex-shrink-0" />}
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
        <div className="flex items-center gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !loading && handleSendMessage()}
            placeholder="Ketik pesan Anda..."
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            disabled={loading || loadingHistory}
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || loadingHistory}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AsistenGuruPage;
