import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../firebase';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
  image?: string;
}

export interface ChatContextType {
  chatHistory: ChatMessage[];
  loadingHistory: boolean;
  addMessageToHistory: (message: ChatMessage) => void;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    // In JS we just returned the context, but in TS we throw an error for non-null assertion.
    // However to prevent breaking changes we can allow it or cast it
    return context as unknown as ChatContextType;
  }
  return context;
};

export const ChatProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      setCurrentUser(user);
      if (user) {
        setLoadingHistory(true);
        const storedKey = `chat_history_${user.uid}`;
        const storedHistory = localStorage.getItem(storedKey);

        if (storedHistory) {
          try {
            const parsed = JSON.parse(storedHistory);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setChatHistory(parsed);
            } else {
              const greetingMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: `Halo! Senang melihat Anda kembali. Apa nih yang mau kita bahas atau kerjakan bareng hari ini? 😊` }]
              };
              setChatHistory([greetingMessage]);
            }
          } catch (e) {
            console.error("Failed to parse chat history", e);
            setChatHistory([]);
          }
        } else {
          const greetingMessage: ChatMessage = {
            role: 'model',
            parts: [{ text: `Halo! Saya Smartty, asisten Anda. Santai saja, saya siap bantu beresin administrasi atau diskusi ide mengajar. Ada yang seru hari ini? 🚀` }]
          };
          setChatHistory([greetingMessage]);
        }
        setLoadingHistory(false);
      } else {
        setChatHistory([]);
        setLoadingHistory(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser && chatHistory.length > 0) {
      localStorage.setItem(`chat_history_${currentUser.uid}`, JSON.stringify(chatHistory));
    }
  }, [chatHistory, currentUser]);

  const addMessageToHistory = (message: ChatMessage) => {
    setChatHistory(prev => [...prev, message]);
  };

  const clearChat = () => {
    if (currentUser) {
      localStorage.removeItem(`chat_history_${currentUser.uid}`);
      const greetingMessage: ChatMessage = {
        role: 'model',
        parts: [{ text: `Siap! Chat sudah bersih. Ayo, kita mulai obrolan baru yang fresh! ✨` }]
      };
      setChatHistory([greetingMessage]);
    }
  };

  const value: ChatContextType = {
    chatHistory,
    loadingHistory,
    addMessageToHistory,
    setChatHistory,
    clearChat
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

