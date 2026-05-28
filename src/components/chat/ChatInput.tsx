import React from 'react';
import { Send, Mic, MicOff, Image as ImageIcon, X } from 'lucide-react';

interface ChatInputProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  loading: boolean;
  loadingHistory: boolean;
  isListening: boolean;
  toggleListening: () => void;
  selectedImage: string | null;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

const ChatInput: React.FC<ChatInputProps> = ({
    input,
    onInputChange,
    onSendMessage,
    loading,
    loadingHistory,
    isListening,
    toggleListening,
    selectedImage,
    onImageUpload,
    onClearImage,
    fileInputRef,
    textareaRef
}) => {
    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !loading) {
            e.preventDefault();
            onSendMessage();
        }
    };

    return (
        <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            {selectedImage && (
                <div className="mb-2 relative inline-block">
                    <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm" />
                    <button
                        onClick={onClearImage}
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
                    onChange={onImageUpload}
                    accept="image/*"
                    className="hidden"
                />

                {/* Image Upload Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || loadingHistory}
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 flex items-center justify-center transition-all shrink-0"
                    title="Upload Gambar / Scan Soal"
                >
                    <ImageIcon className="w-5 h-5" />
                </button>

                {/* Voice Input Button */}
                <button
                    onClick={toggleListening}
                    disabled={loading || loadingHistory}
                    className={`p-2 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0 ${isListening
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
                    onChange={onInputChange}
                    onKeyDown={handleKeyPress}
                    placeholder={isListening ? "Mendengarkan..." : "Ketik pesan atau upload soal..."}
                    className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none ${isListening ? 'ring-2 ring-red-400 border-red-400 bg-red-50 dark:bg-red-900/20 placeholder-red-400' : ''
                        }`}
                    disabled={loading || loadingHistory}
                    rows={1}
                />
                <button
                    onClick={onSendMessage}
                    disabled={loading || loadingHistory || (!input.trim() && !selectedImage)}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center transition-colors shrink-0"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default ChatInput;
