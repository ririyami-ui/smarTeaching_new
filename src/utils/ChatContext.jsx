import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Load history on auth change
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) {
        setLoadingHistory(true);
        // Load from localStorage
        const storedKey = `chat_history_${user.uid}`;
        const storedHistory = localStorage.getItem(storedKey);

        if (storedHistory) {
          try {
            const parsed = JSON.parse(storedHistory);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setChatHistory(parsed);
            } else {
              // Fallback valid init
              const greetingMessage = {
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
          // Initialize new
          const greetingMessage = {
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

  // Persist to localStorage on change
  useEffect(() => {
    if (currentUser && chatHistory.length > 0) {
      localStorage.setItem(`chat_history_${currentUser.uid}`, JSON.stringify(chatHistory));
    }
  }, [chatHistory, currentUser]);

  const addMessageToHistory = (message) => {
    setChatHistory(prev => [...prev, message]);
  };

  const clearChat = () => {
    if (currentUser) {
      localStorage.removeItem(`chat_history_${currentUser.uid}`);
      const greetingMessage = {
        role: 'model',
        parts: [{ text: `Siap! Chat sudah bersih. Ayo, kita mulai obrolan baru yang fresh! ✨` }]
      };
      setChatHistory([greetingMessage]);
    }
  };

  const value = {
    chatHistory,
    loadingHistory,
    addMessageToHistory,
    setChatHistory,
    clearChat
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};