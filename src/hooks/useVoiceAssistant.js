import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useVoiceAssistant = (chatHistory, loading) => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef(null);

    // Enhanced text-to-speech pre-processing for mathematical notation
    const preprocessMathText = (text) => {
        let processed = text;
        // Remove Markdown boldness and italics
        processed = processed.replace(/\*\*([^*]+)\*\*/g, '$1');
        processed = processed.replace(/\*([^*]+)\*/g, '$1');
        // Remove Markdown headers (hash symbols)
        processed = processed.replace(/#+/g, '');
        // Basic LaTeX replacements
        processed = processed.replace(/\\\(/g, '').replace(/\\\)/g, '');
        processed = processed.replace(/\\\[/g, '').replace(/\\\]/g, '');
        processed = processed.replace(/\$/g, '');
        processed = processed.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 per $2');
        processed = processed.replace(/\\times/g, 'kali');
        processed = processed.replace(/\^/g, ' pangkat ');
        // Remove complex math symbols or simplify
        processed = processed.replace(/\\begin\{[^}]+\}/g, '');
        processed = processed.replace(/\\end\{[^}]+\}/g, '');
        processed = processed.replace(/\\text\{([^}]+)\}/g, '$1');
        return processed;
    };

    const speakText = useCallback((text) => {
        if (!window.speechSynthesis) return;

        // Stop any existing speech
        window.speechSynthesis.cancel();

        const cleanText = preprocessMathText(text);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'id-ID';
        utterance.rate = 1.05;
        utterance.pitch = 1.02;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        const getBestIndoVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            const premiumVoice = voices.find(v =>
                (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium')) &&
                (v.lang.includes('id-ID') || v.lang.includes('id_ID') || v.lang === 'id')
            );
            if (premiumVoice) return premiumVoice;

            const platformVoice = voices.find(v =>
                (v.name.includes('Ardi') || v.name.includes('Gadis') || v.name.includes('Damayanti')) &&
                v.lang.includes('id')
            );
            if (platformVoice) return platformVoice;

            return voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
        };

        const bestVoice = getBestIndoVoice();
        if (bestVoice) utterance.voice = bestVoice;

        window.speechSynthesis.speak(utterance);
    }, []);

    const stopSpeaking = useCallback(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, []);

    // Speech Recognition Setup
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'id-ID';

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onresult = (event) => {
                const transcriptResult = event.results[0][0].transcript;
                setTranscript(transcriptResult);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                toast.error("Gagal mengenali suara. Pastikan izin mikrofon aktif.");
            };

            recognitionRef.current = recognition;
        }
    }, []);

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) {
            toast.error("Browser Anda tidak mendukung fitur suara.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setTranscript(''); // Clear previous transcript
            recognitionRef.current.start();
        }
    }, [isListening]);

    // Auto-speak effect for new model messages
    useEffect(() => {
        if (autoSpeak && chatHistory.length > 0) {
            const lastMessage = chatHistory[chatHistory.length - 1];
            if (lastMessage.role === 'model' && !loading) {
                speakText(lastMessage.parts[0].text);
            }
        }
    }, [chatHistory, autoSpeak, loading, speakText]);

    return {
        isListening,
        isSpeaking,
        autoSpeak,
        setAutoSpeak,
        transcript,
        setTranscript,
        speakText,
        stopSpeaking,
        toggleListening
    };
};
