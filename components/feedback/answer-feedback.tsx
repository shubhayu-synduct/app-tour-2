"use client"

import { useState, useRef, useEffect } from 'react'
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react'
import { getFirebaseFirestore } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { MovingBorder } from "@/components/ui/moving-border";
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';

interface AnswerFeedbackProps {
  conversationId: string;
  threadId: string;
  answerText?: string;
  onReload?: () => void;
  isReloading?: boolean;
  messageId?: string;
}

const FEEDBACK_OPTIONS_HELPFUL = [
  'Relevant', 'Accurate', 'High-grade evidence', 'Comprehensive', 'Sufficient detail', 'Concise', 'Patient-tailored', 'Recent Information', 'Well-referenced', 'Highly Satisfied', 'Moderately Satisified'
];

const FEEDBACK_OPTIONS_NOT_HELPFUL = [
  'Incorrect', 'Low-grade evidence', 'Missing information', 'Too long', 'Generic', 'Outdated', 'Poorly referenced', 'Patient safety concern', 'Dissatisfied', 'Too short'
];

export default function AnswerFeedback({ 
  conversationId, 
  threadId, 
  answerText = '',
  onReload,
  isReloading,
  messageId
}: AnswerFeedbackProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
  const [contextOfUse, setContextOfUse] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState<null | 'helpful' | 'not_helpful'>(null);
  const [thankYou, setThankYou] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState<{
    helpful?: boolean;
    not_helpful?: boolean;
  }>({});
  const feedbackFormRef = useRef<HTMLDivElement>(null);
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  // Add useEffect for auto-scrolling
  useEffect(() => {
    if (showForm && feedbackFormRef.current) {
      feedbackFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showForm]);

  const toggleFeedback = (option: string) => {
    setSelectedFeedback(prev =>
      prev.includes(option) ? prev.filter(r => r !== option) : [...prev, option]
    );
  };

  const toggleContext = (option: string) => {
    setContextOfUse(prev =>
      prev.includes(option) ? prev.filter(r => r !== option) : [...prev, option]
    );
  };

  const handleFeedbackClick = (type: 'helpful' | 'not_helpful') => {
    // If clicking the same type that's already open, close it
    if (showForm === type) {
      setShowForm(null);
      setSelectedFeedback([]);
      setFeedbackText('');
      setThankYou(false);
      // Scroll back to the button container
      setTimeout(() => {
        if (buttonContainerRef.current) {
          buttonContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      // If clicking a different type, switch to it
      setShowForm(type);
      setSelectedFeedback([]);
      setFeedbackText('');
      setThankYou(false);
    }
  };

  const handleCancel = () => {
    setShowForm(null);
    setSelectedFeedback([]);
    setFeedbackText('');
  };

  const saveFeedback = async () => {
    setIsSubmitting(true);
    try {
      const feedbackType = showForm === 'helpful' ? 'helpful' : 'not_helpful';
      const feedbackData = {
        options: selectedFeedback,
        text_comment: feedbackText,
        timestamp: new Date().toISOString()
      };

      logger.debug('Attempting to save feedback to Firebase:', {
        conversationId,
        threadId,
        feedbackType,
        feedbackData
      });

      if (!threadId) {
        throw new Error('Thread ID not available yet');
      }

      const db = getFirebaseFirestore();
      const feedbackRef = doc(db, 
        'conversations', 
        conversationId, 
        'threads', 
        threadId, 
        'feedback', 
        feedbackType
      );

      await setDoc(feedbackRef, feedbackData);
      logger.debug('Feedback saved successfully to Firebase');

      setThankYou(true);
      setShowForm(null);
      setSelectedFeedback([]);
      setContextOfUse([]);
      setFeedbackText('');
      // Mark the current feedback type as submitted
      setSubmittedFeedback(prev => ({
        ...prev,
        [feedbackType]: true
      }));
    } catch (error) {
      logger.error('Error saving feedback to Firebase:', error);
      setValidationMessage('Failed to save feedback. Please try again.');
      setTimeout(() => {
        setValidationMessage('');
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyText = async () => {
    if (!answerText) return;
    try {
      await navigator.clipboard.writeText(answerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy:', error);
    }
  };

  // Helper for feedback button style
  const feedbackBtnStyle = (option: string) => {
    if (selectedFeedback.includes(option)) {
      return 'border-[#3771FE] text-[#3771FE] bg-white';
    }
    return 'border-[#C8C8C8] text-[#223258] bg-white';
  };

  // Helper for top row button style
  const topBtnStyle = (type: 'helpful' | 'not_helpful') => {
    if (showForm === type) {
      return 'border-[#3771FE] text-[#3771FE] bg-white';
    }
    if (submittedFeedback[type === 'helpful' ? 'helpful' : 'not_helpful']) {
      return 'border-[#C8C8C8] text-[#C8C8C8] bg-gray-50 cursor-not-allowed';
    }
    return 'border-[#C8C8C8] text-[#223258] bg-white';
  };

  const hasValidText = (text: string) => {
    const words = text.trim().split(/\s+/);
    return words.some(word => word.length >= 4);
  };

  const canSubmit = () => {
    return selectedFeedback.length > 0 || hasValidText(feedbackText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) {
      setValidationMessage('Please select at least one option or provide feedback with at least one word (4+ characters)');
      // Clear message after 2 seconds
      setTimeout(() => {
        setValidationMessage('');
      }, 2000);
      return;
    }
    setValidationMessage('');
    saveFeedback();
  };

  return (
    <div className="mt-4 max-w-[684px]">
      {/* Top row: Helpful, Not helpful, Copy */}
      <div ref={buttonContainerRef} className="flex flex-row items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="relative h-8 sm:h-10 w-24 sm:w-32 overflow-hidden bg-transparent p-[1px] rounded-lg">
          <div className="absolute inset-0">
            <MovingBorder duration={3000} rx="8px" ry="8px" delay={0}>
              <div className="h-8 w-20 bg-[radial-gradient(#3771FE_40%,transparent_60%)] opacity-[0.8]" />
            </MovingBorder>
          </div>
          <button
            onClick={() => handleFeedbackClick('helpful')}
            className={cn(
              "relative flex h-full w-full items-center justify-center border rounded-lg transition-all",
              topBtnStyle('helpful')
            )}
            aria-label="Helpful"
            title={submittedFeedback.helpful ? "You've already submitted helpful feedback" : "This answer was helpful"}
            disabled={submittedFeedback.helpful}
          >
            <ThumbsUp className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
            <span className="text-xs sm:text-sm">Useful...</span>
          </button>
        </div>

        <div className="relative h-8 sm:h-10 w-24 sm:w-32 overflow-hidden bg-transparent p-[1px] rounded-lg">
          <div className="absolute inset-0">
            <MovingBorder duration={3000} rx="8px" ry="8px" delay={1500}>
              <div className="h-8 w-20 bg-[radial-gradient(#3771FE_40%,transparent_60%)] opacity-[0.8]" />
            </MovingBorder>
          </div>
          <button
            onClick={() => handleFeedbackClick('not_helpful')}
            className={cn(
              "relative flex h-full w-full items-center justify-center border rounded-lg transition-all",
              topBtnStyle('not_helpful')
            )}
            aria-label="Not helpful"
            title={submittedFeedback.not_helpful ? "You've already submitted not helpful feedback" : "This answer wasn't helpful"}
            disabled={submittedFeedback.not_helpful}
          >
            <ThumbsDown className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
            <span className="text-xs sm:text-sm">Not Useful...</span>
          </button>
        </div>

        <button
          onClick={handleCopyText}
          className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border transition-all flex items-center gap-1 sm:gap-2 ${copied ? 'text-[#3771FE] border-[#3771FE]' : 'text-[#223258] border-[#223258]'} bg-white`}
          aria-label="Copy text"
          title="Copy answer text"
        >
          {copied ? (
            <>
              <Check size={14} className="text-[#3771FE] sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} className="text-[#223258] sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Copy</span>
            </>
          )}
        </button>

        {/* Reload Button */}
        {onReload && (
          <button
            onClick={onReload}
            disabled={isReloading}
            className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-[#223258] text-[#223258] bg-white transition-all flex items-center gap-1 sm:gap-2 hover:border-[#3771FE] hover:text-[#3771FE] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Retry answer"
            title="Retry this answer"
          >
            {isReloading ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-[#3771FE]"></div>
                <span className="text-xs sm:text-sm">Retrying...</span>
              </>
            ) : (
              <>
                <RotateCcw size={14} className="text-[#223258] sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">Retry</span>
              </>
            )}
          </button>
        )}
      </div>
      {/* Feedback form appears only after clicking Helpful/Not helpful */}
      {showForm && !thankYou && (
        <div ref={feedbackFormRef} className="border border-[#C8C8C8] rounded-lg p-3 sm:p-6 bg-white">
          <form onSubmit={handleSubmit}>
            <div className="mb-3 sm:mb-4">
              <div className="font-semibold mb-2 text-sm sm:text-base" style={{ color: '#62739B' }}>Why was this answer {showForm === 'helpful' ? 'useful' : 'not useful'}?</div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                {(showForm === 'helpful' ? FEEDBACK_OPTIONS_HELPFUL : FEEDBACK_OPTIONS_NOT_HELPFUL).map(option => (
                  <button
                    key={option}
                    type="button"
                    className={`px-2 sm:px-3 py-1 rounded-lg border text-xs sm:text-sm transition-colors duration-100 ${feedbackBtnStyle(option)}`}
                    onClick={() => toggleFeedback(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <textarea
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2 mt-2 text-sm sm:text-base"
                style={{ 
                  backgroundColor: 'rgba(238,243,255,0.5)',
                  color: '#62739B'
                }}
                rows={3}
                placeholder="Tell us more about your experience"
                value={feedbackText}
                onChange={e => {
                  setFeedbackText(e.target.value);
                  setValidationMessage('');
                }}
              ></textarea>
              <style jsx>{`
                textarea::placeholder {
                  color: #8997BA;
                }
              `}</style>
              <div className="text-center mb-3 sm:mb-4 text-xs sm:text-sm" style={{ color: '#8997BA' }}>
                Your feedback can helps us improve our answers
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg border border-[#C8C8C8] text-[#223258] bg-white text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm"
                style={{
                  backgroundColor: '#C6D7FF',
                  color: '#214498',
                  border: '1px solid rgba(55, 113, 254, 0.5)'
                }}
                disabled={isSubmitting}
              >
                Submit
              </button>
            </div>
            {validationMessage && (
              <div className="text-center text-red-500 text-xs sm:text-sm mt-2">
                {validationMessage}
              </div>
            )}
          </form>
        </div>
      )}
      {/* Thank you message after submit */}
      {thankYou && (
        <div className="mt-3 sm:mt-4 font-semibold text-sm sm:text-base" style={{ color: '#8997BA' }}>Thank you for your feedback!</div>
      )}
    </div>
  );
}