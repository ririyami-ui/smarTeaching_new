import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

const CHAT_HISTORY_LIMIT = 50; // Define the chat history limit

export const ChatProvider = ({ children }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const isInitialLoad = useRef(true);

  // Effect to initialize chat on login and fetch history
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (user) {
        setLoadingHistory(true);
        isInitialLoad.current = true; // Set flag on user change
        const chatDocRef = doc(db, "chats", user.uid);
        try {
          const docSnap = await getDoc(chatDocRef);
          if (docSnap.exists() && docSnap.data().messages) {
            setChatHistory(docSnap.data().messages);
          } else {
            const greetingMessage = {
              role: 'model',
              parts: [{ text: `Selamat datang di Asisten Guru! Ada yang bisa kami bantu terkait pembelajaran? 😊` }]
            };
            await setDoc(chatDocRef, { messages: [greetingMessage], userId: user.uid });
            setChatHistory([greetingMessage]);
          }
        } catch (error) {
          console.error("Error fetching or initializing chat history: ", error);
          setChatHistory([{
            role: 'model',
            parts: [{ text: `Selamat datang di Asisten Guru! Ada yang bisa kami bantu terkait pembelajaran? 😊` }]
          }]);
        } finally {
          setLoadingHistory(false);
          // Use a timeout to prevent the initial load from triggering the save effect immediately
          setTimeout(() => {
            isInitialLoad.current = false;
          }, 500);
        }
      } else {
        setChatHistory([]);
        setLoadingHistory(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect to save chat history to Firestore when it changes, skipping the initial load
  useEffect(() => {
    if (isInitialLoad.current || loadingHistory) {
      return; // Don't save on initial load
    }

    if (auth.currentUser && chatHistory.length > 0) {
      const chatDocRef = doc(db, "chats", auth.currentUser.uid);
      const limitedHistory = chatHistory.slice(Math.max(0, chatHistory.length - CHAT_HISTORY_LIMIT));

      setDoc(chatDocRef, {
        messages: limitedHistory,
        userId: auth.currentUser.uid
      }, { merge: true }).catch(error => {
        console.error("Error saving chat history to Firestore: ", error);
      });
    }
  }, [chatHistory, loadingHistory]);

  // Function to add a message to the history (in-memory only)
  const addMessageToHistory = (message) => {
    setChatHistory(prev => [...prev, message]);
  };

  const value = {
    chatHistory,
    loadingHistory,
    addMessageToHistory,
    setChatHistory,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};