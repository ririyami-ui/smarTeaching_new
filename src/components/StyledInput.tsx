import React, { useState, useEffect, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Mic, MicOff, Sparkles, LucideIcon } from 'lucide-react';
import { polishJournalText } from '../utils/gemini';
import toast from 'react-hot-toast';

import { useSettings } from '../utils/SettingsContext';

type BaseInputProps = InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>;

interface StyledInputProps extends BaseInputProps {
  label?: string;
  type?: string; 
  voiceEnabled?: boolean;
  onPolish?: boolean;
  containerClassName?: string;
  icon?: LucideIcon;
}

const StyledInput: React.FC<StyledInputProps> = ({ label, type = 'text', voiceEnabled = false, icon: Icon, value, onChange, name, ...props }) => {
  const { geminiModel } = useSettings();
  const [isListening, setIsListening] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [recognition, setRecognition] = useState<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const SpeechRecognitionCtor = (w.SpeechRecognition || w.webkitSpeechRecognition) as unknown as new () => { start: () => void; stop: () => void; continuous: boolean; interimResults: boolean; lang: string; onstart: (() => void) | null; onend: (() => void) | null; onerror: ((event: { error: string }) => void) | null; onresult: ((event: { results: SpeechRecognitionResult[][] }) => void) | null };
    if (voiceEnabled && w.ActiveXObject === undefined && SpeechRecognitionCtor) {
      const recog = new SpeechRecognitionCtor();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'id-ID';

      recog.onstart = () => setIsListening(true);
      recog.onend = () => setIsListening(false);
      recog.onerror = (event: { error: string }) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        toast.error('Gagal merekam suara: ' + event.error);
      };

      recog.onresult = (event: { results: SpeechRecognitionResult[][] }) => {
        const transcript = (event.results[0] as unknown as { transcript: string }[])[0].transcript;
        if (onChange) {
          const fakeEvent = {
            target: {
              value: value ? `${value} ${transcript}` : transcript,
              name: name
            }
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(fakeEvent);
        }
      };

      setRecognition(recog);
    }
  }, [voiceEnabled, value, onChange, name]);

  const toggleListening = () => {
    if (!recognition) {
      toast.error('Browser Anda tidak mendukung perekaman suara.');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handlePolish = async () => {
    if (!value) return;
    setIsPolishing(true);
    try {
      const polished = await polishJournalText(value as string, geminiModel, label);
      if (onChange) {
        onChange({
          target: {
            value: polished,
            name: name
          }
        } as React.ChangeEvent<HTMLInputElement>);
      }
      toast.success('Teks telah dirapikan oleh AI!');
    } catch {
      toast.error('Gagal merapikan teks.');
    } finally {
      setIsPolishing(false);
    }
  };

  const inputClasses = `w-full ${Icon ? 'pl-12' : 'px-5'} py-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-300 dark:text-white placeholder-gray-400 shadow-sm hover:border-primary/30 ${props.className || ''}`;

  return (
    <div className={`space-y-2 ${props.containerClassName || 'w-full'}`}>
      {label && <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-2">{label}</label>}
      <div className="relative group flex items-center">
        {Icon && (
          <div className="absolute left-4 z-10 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
            <Icon size={20} />
          </div>
        )}
         {type === 'textarea' ? (
          <textarea
            {...props}
            value={value}
            onChange={onChange}
            className={`${inputClasses} min-h-[100px] resize-y pr-12`}
          />
        ) : (
          <input
            {...props}
            type={type}
            value={value}
            onChange={onChange}
            className={`${inputClasses} ${voiceEnabled ? 'pr-12' : ''}`}
          />
        )}

        {voiceEnabled && (
          <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-1.5 rounded-lg transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-400 dark:hover:bg-gray-500'}`}
              title={isListening ? "Berhenti merekam" : "Mulai merekam suara"}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            {value && (
              <button
                type="button"
                onClick={handlePolish}
                disabled={isPolishing}
                className={`p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors ${isPolishing ? 'animate-spin' : ''}`}
                title="Rapikan dengan AI"
              >
                <Sparkles size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StyledInput;

