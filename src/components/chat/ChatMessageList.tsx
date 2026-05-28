import React from 'react';
import { Bot, User, Loader, Volume2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { ChatMessage } from '../../utils/ChatContext';

interface ChatMessageListProps {
  chatHistory: ChatMessage[];
  loadingHistory: boolean;
  loading: boolean;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  onSpeak: (text: string) => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
    chatHistory,
    loadingHistory,
    loading,
    chatContainerRef,
    onSpeak
}) => {
    return (
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
                            {message.role === 'model' && <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 animate-smartty-float" />}
                            <div className={`chat-message p-3 rounded-[1.2rem] max-w-[85%] sm:max-w-lg break-words overflow-x-auto relative group ${message.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none'}`}>
                                {message.role === 'model' && (
                                    <button
                                        onClick={() => onSpeak(message.parts[0].text)}
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
                                            rehypePlugins={[rehypeKatex, rehypeRaw]}
                                        >
                                            {(() => {
                                                let text = message.parts[0].text;
                                                // Robust detection: if text contains \begin{...} but isn't wrapped in $$ or ```
                                                if (text.includes('\\begin{') && !text.includes('$$')) {
                                                    text = text.replace(/(\\begin\{[a-z*]+\}[\s\S]*?\\end\{[a-z*]+\})/g, '$$\n$1\n$$');
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
                            <Bot className="w-8 h-8 text-blue-500 flex-shrink-0 animate-smartty-think" />
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
    );
};

export default React.memo(ChatMessageList);
