"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  type SopCopilotIntent,
  type SopCopilotContextIdentity,
  type SopCopilotReadContext,
  type SopCopilotNavigationDirective,
  computeSessionBoundaryKey,
  isSameDocumentSessionTransition,
} from "../types/copilot";
import { classifySopScopeSync } from "../lib/sopScopeGuard";
import { executeCopilotReadIntelligence } from "../lib/sopCopilotIntelligence";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  intent?: SopCopilotIntent;
  allowed?: boolean;
  isMixed?: boolean;
  reasonCode?: string;
  references?: {
    sectionIds?: string[];
    validationIssueIds?: string[];
  };
  navigation?: SopCopilotNavigationDirective;
  isMockResponse?: boolean;
}

interface SuggestionCard {
  id: string;
  title: string;
  description: string;
  icon: (props: { className?: string }) => React.ReactElement;
  samplePrompt: string;
  mockReply: string;
}

export interface SOPCopilotProps {
  contextIdentity?: SopCopilotContextIdentity;
  readContext?: SopCopilotReadContext;
  documentInstanceId?: string;
  onNavigateToSection?: (sectionId: string) => void;
  onOpenValidationTab?: () => void;
}

// ── Robot Avatar Component ───────────────────────────────────────────────────

interface RobotAvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  withGlow?: boolean;
}

/**
 * Custom Robot Avatar for SOP Copilot.
 * Uses the supplied official futuristic robot image asset with white shell,
 * black face, glowing white eyes, and illuminated blue-purple-cyan border.
 */
export function RobotAvatar({
  size = "md",
  className = "",
  withGlow = false,
}: RobotAvatarProps) {
  // Size classes
  const sizeClasses = {
    sm: "w-7 h-7 p-0.5",
    md: "w-10 h-10 p-1",
    lg: "w-16 h-16 sm:w-[70px] sm:h-[70px] p-1.5",
    xl: "w-22 h-22 sm:w-24 sm:h-24 p-2",
  }[size];

  return (
    <div className={`relative flex items-center justify-center flex-shrink-0 select-none ${className}`}>
      {/* Subtle ambient cyan/blue/purple glow */}
      {withGlow && (
        <span
          className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-blue-600/30 via-purple-600/30 to-cyan-400/30 blur-md pointer-events-none animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Circular Avatar Shell with sleek dark-tech backdrop */}
      <div
        className={`relative ${sizeClasses} rounded-full bg-gradient-to-br from-slate-900 via-[#0e1628] to-[#161f36] border border-indigo-400/50 shadow-md shadow-indigo-950/20 overflow-hidden flex items-center justify-center`}
      >
        <img
          src="/images/sop-copilot-robot-transparent.png"
          alt="SOP Copilot Robot Avatar"
          className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(59,130,246,0.35)]"
          loading="eager"
        />
      </div>
    </div>
  );
}

// ── Crisp SVG Icons ──────────────────────────────────────────────────────────

function CloseIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendPlaneIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

function ShieldAlertIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" />
    </svg>
  );
}

function BankFinanceIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function DocumentExplainIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ClipboardReviewIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}

function ResetIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

// ── Suggestion Cards Configuration ───────────────────────────────────────────

const SUGGESTION_CARDS: SuggestionCard[] = [
  {
    id: "fix-validation",
    title: "Fix validation errors",
    description: "Understand which document details are missing.",
    icon: ShieldAlertIcon,
    samplePrompt: "Help me understand what's missing in my validation checks.",
    mockReply: "Reviewing validation checks...",
  },
  {
    id: "add-financial",
    title: "Add financial details",
    description: "Organize your bank and funding information.",
    icon: BankFinanceIcon,
    samplePrompt: "Help me organize my bank and funding information.",
    mockReply: "Inspecting financial information...",
  },
  {
    id: "explain-sop",
    title: "Explain my SOP",
    description: "Understand the content of my document.",
    icon: DocumentExplainIcon,
    samplePrompt: "Summarize this SOP.",
    mockReply: "Generating document summary...",
  },
  {
    id: "review-missing",
    title: "Review missing information",
    description: "Identify details that need attention.",
    icon: ClipboardReviewIcon,
    samplePrompt: "Show me what needs attention in my current draft.",
    mockReply: "Checking missing information...",
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export function SOPCopilot({
  contextIdentity,
  readContext,
  documentInstanceId,
  onNavigateToSection,
  onOpenValidationTab,
}: SOPCopilotProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fallback identity if mounted without explicit context props
  const activeIdentity: SopCopilotContextIdentity = {
    studentId: contextIdentity?.studentId ?? "student-default",
    programId: contextIdentity?.programId ?? "current-program",
    documentType: contextIdentity?.documentType ?? "VISA_COVER_LETTER",
    documentId: contextIdentity?.documentId,
    sectionId: contextIdentity?.sectionId,
  };

  // ── Session Boundary Guard (Phase 2.1 A1 & Phase 3.1) ──────────────────────
  // Strong boundary includes documentId / draftId and optional runtime instanceId
  const sessionBoundaryKey = computeSessionBoundaryKey(activeIdentity, documentInstanceId);
  const prevSessionBoundaryRef = useRef<string>(sessionBoundaryKey);

  useEffect(() => {
    const prevKey = prevSessionBoundaryRef.current;
    if (prevKey !== sessionBoundaryKey) {
      if (isSameDocumentSessionTransition(prevKey, sessionBoundaryKey)) {
        // Same logical document was just saved with an active draft ID.
        // Adopt the new draft boundary without wiping the current active conversation.
        prevSessionBoundaryRef.current = sessionBoundaryKey;
      } else {
        // Genuine context boundary change (Student, Program, Document Type, or different Draft opened).
        // Reset conversation history to maintain strict context isolation.
        setMessages([]);
        setInputValue("");
        setIsTyping(false);
        prevSessionBoundaryRef.current = sessionBoundaryKey;
      }
    }
  }, [sessionBoundaryKey]);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Focus textarea on desktop when opened
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages, isTyping]);

  // Handle escape key to close panel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleResetChat = () => {
    setMessages([]);
    setInputValue("");
    setIsTyping(false);
  };

  // Dispatch a message through the Server-side Scope Guard & Read Intelligence
  const handleSendMessage = async (explicitText?: string) => {
    const textToSend = (explicitText ?? inputValue).trim();
    if (!textToSend || isTyping) return;

    const timeString = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newUserMessage: ChatMessage = {
      id: "msg-" + Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: timeString,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Authoritative Server-side Scope Guard & Read Intelligence Call
      const res = await fetch("/api/sop/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          contextIdentity: activeIdentity,
          readContext: readContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const replyText =
        typeof data.response === "string" && data.response.trim()
          ? data.response
          : "I can only assist with SOP and student-application document tasks.";

      // If response includes navigation directive, trigger existing workspace navigation
      if (data.navigation?.sectionId) {
        onNavigateToSection?.(data.navigation.sectionId);
      }

      const newAssistantMessage: ChatMessage = {
        id: "msg-assistant-" + Date.now(),
        sender: "assistant",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        intent: data.intent,
        allowed: data.allowed,
        isMixed: data.isMixed,
        reasonCode: data.reasonCode,
        references: data.references,
        navigation: data.navigation,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
    } catch {
      // Offline fallback: evaluate deterministic client-side scope guard & read intelligence
      const fallbackResult = classifySopScopeSync(textToSend, activeIdentity);

      let replyText = fallbackResult.suggestedReply;
      let navDirective: SopCopilotNavigationDirective | undefined;
      let references: ChatMessage["references"];

      if (fallbackResult.allowed && readContext) {
        const intel = executeCopilotReadIntelligence(
          textToSend,
          fallbackResult.intent,
          readContext
        );
        replyText = intel.message;
        navDirective = intel.navigation;
        references = intel.references;
        if (intel.navigation?.sectionId) {
          onNavigateToSection?.(intel.navigation.sectionId);
        }
      }

      const newAssistantMessage: ChatMessage = {
        id: "msg-assistant-" + Date.now(),
        sender: "assistant",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        intent: fallbackResult.intent,
        allowed: fallbackResult.allowed,
        isMixed: fallbackResult.isMixed,
        reasonCode: fallbackResult.reasonCode,
        navigation: navDirective,
        references,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: SuggestionCard) => {
    handleSendMessage(suggestion.samplePrompt);
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* ── 1. Floating Chatbot Launcher ───────────────────────────────────── */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out ${
          isOpen ? "scale-90 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
        style={{ willChange: "transform, opacity" }}
      >
        <button
          type="button"
          id="sop-copilot-launcher-btn"
          onClick={handleOpen}
          aria-label="Open SOP Copilot"
          title="Open SOP Copilot"
          className="group relative flex items-center justify-center rounded-full p-0.5 bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-400 shadow-xl shadow-indigo-600/30 hover:shadow-2xl hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-4 focus:ring-cyan-400/40"
        >
          {/* Subtle animated floating aura */}
          <span
            className="absolute -inset-1 rounded-full bg-gradient-to-tr from-blue-600/35 via-purple-600/35 to-cyan-400/35 blur-xs group-hover:blur-sm transition-all duration-300 animate-pulse pointer-events-none"
            aria-hidden="true"
          />

          {/* Prominent Custom Robot Avatar */}
          <RobotAvatar size="lg" withGlow={false} />

          {/* Active Status Notification Dot */}
          <span
            className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-900 shadow-sm animate-pulse z-10"
            title="SOP Copilot is active"
          />

          {/* Floating Pill Tooltip on Hover */}
          <span className="absolute right-full mr-3.5 px-3 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-xs text-white text-xs font-semibold shadow-lg whitespace-nowrap opacity-0 translate-x-1.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 pointer-events-none flex items-center gap-1.5 border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>SOP Copilot</span>
          </span>
        </button>
      </div>

      {/* ── 2. Chatbot Panel ──────────────────────────────────────────────── */}
      <div
        id="sop-copilot-panel"
        role="dialog"
        aria-modal="true"
        aria-label="SOP Copilot Assistant"
        className={`fixed z-50 flex flex-col bg-white border border-slate-200/90 shadow-2xl shadow-indigo-950/15 rounded-[20px] overflow-hidden transition-all duration-300 ease-out ${
          isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-6 scale-95 pointer-events-none"
        } 
        /* Mobile: nearly full-screen with comfortable margins */
        inset-x-3 bottom-3 top-16
        /* Tablet & Desktop: floating right-bottom panel */
        sm:inset-auto sm:right-6 sm:bottom-6 sm:w-[440px] sm:h-[660px] sm:max-h-[calc(100vh-4.5rem)]`}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 select-none">
          <div className="flex items-center gap-3 min-w-0">
            {/* Header Robot Avatar */}
            <div className="relative">
              <RobotAvatar size="md" withGlow={true} />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-white shadow-2xs" />
            </div>

            {/* Name, Status & Subtitle */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 leading-tight">
                  SOP Copilot
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200/60 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  Ready to help
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">
                Your AI-powered document assistant
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                id="sop-copilot-reset-btn"
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Start new conversation"
                aria-label="Start new conversation"
              >
                <ResetIcon className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              id="sop-copilot-close-btn"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Copilot"
              aria-label="Close Copilot"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Content Area: Welcome Screen OR Conversation View ──────────── */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-[#FAFBFD] flex flex-col">
          {messages.length === 0 ? (
            /* ── Welcome Screen ─────────────────────────────────────────── */
            <div className="flex-1 flex flex-col justify-between p-4 sm:p-5">
              {/* Centered Welcome Message with Custom Robot Avatar */}
              <div className="text-center my-auto pt-2 pb-4">
                <div className="relative inline-block mb-3">
                  <RobotAvatar size="xl" withGlow={true} />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                  Hi! I&apos;m SOP Copilot.
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[320px] mx-auto mt-2">
                  I&apos;m here to help you understand your SOP, organize missing information, and prepare your document for review.
                </p>
              </div>

              {/* 4 Clickable Suggestion Cards */}
              <div className="space-y-2 mt-auto pt-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                  Suggested inquiries
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTION_CARDS.map((card) => {
                    const IconComp = card.icon;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        id={`sop-suggestion-${card.id}`}
                        onClick={() => handleSuggestionClick(card)}
                        className="group flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-xs transition-all duration-150 text-left cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                            {card.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                            {card.description}
                          </p>
                        </div>
                        <span className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all text-xs font-bold pt-0.5">
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ── Conversation History ───────────────────────────────────── */
            <div className="flex-1 p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Assistant Robot Avatar */}
                  {msg.sender === "assistant" && (
                    <div className="mt-1">
                      <RobotAvatar size="sm" withGlow={false} />
                    </div>
                  )}

                  <div
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`text-xs leading-relaxed px-3.5 py-2.5 ${
                        msg.sender === "user"
                          ? "bg-blue-50 text-slate-800 border border-blue-200/90 rounded-2xl rounded-tr-xs shadow-2xs max-w-[85%]"
                          : "bg-white text-slate-800 border border-slate-200/80 rounded-2xl rounded-tl-xs shadow-2xs max-w-[92%]"
                      }`}
                    >
                      <div className="whitespace-pre-line space-y-1">
                        {msg.text.split("\n\n").map((paragraph, idx) => (
                          <p key={idx} className="m-0">
                            {paragraph}
                          </p>
                        ))}
                      </div>

                      {/* Interactive Navigation Action Badge */}
                      {msg.navigation?.sectionTitle && (
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-blue-700">
                          <span>📍</span>
                          <span>Navigated to {msg.navigation.sectionTitle}</span>
                        </div>
                      )}

                      {/* Interactive Validation Panel Button */}
                      {msg.references?.validationIssueIds &&
                        msg.references.validationIssueIds.length > 0 &&
                        onOpenValidationTab && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={onOpenValidationTab}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                            >
                              <span>View Validation Issues ({msg.references.validationIssueIds.length})</span>
                              <span>→</span>
                            </button>
                          </div>
                        )}

                      {/* Scope Guard Status Indicator */}
                      {msg.sender === "assistant" && (
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[10px] font-medium">
                          {msg.allowed ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              <span className="text-emerald-700">
                                In Scope • {msg.intent ?? "SUPPORTED"}
                              </span>
                            </>
                          ) : msg.isMixed ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                              <span className="text-amber-700">
                                Outside SOP Copilot scope (Mixed Request)
                              </span>
                            </>
                          ) : msg.intent === "UNKNOWN" ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                              <span className="text-slate-500">
                                Needs clarification
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                              <span className="text-rose-700">
                                Outside SOP Copilot scope
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-start gap-2.5 justify-start">
                  <div className="mt-1">
                    <RobotAvatar size="sm" withGlow={false} />
                  </div>
                  <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-2xs flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      SOP Copilot is thinking...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── 3. Message Input Area ───────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-slate-200/80 bg-white p-3">
          <div className="relative flex items-end gap-2 bg-[#F8FAFC] border border-slate-200 rounded-xl p-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
            <textarea
              ref={textareaRef}
              id="sop-copilot-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDownInput}
              rows={1}
              placeholder="Ask me anything about your SOP..."
              className="flex-1 max-h-24 min-h-[34px] px-2.5 py-1.5 text-xs text-slate-800 bg-transparent border-0 resize-none focus:outline-none placeholder:text-slate-400 leading-relaxed"
            />

            <button
              type="button"
              id="sop-copilot-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              aria-label="Send message"
              title="Send message"
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white shadow-xs transition-all cursor-pointer"
            >
              <SendPlaneIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Small Footer Notice */}
          <p className="text-[10px] text-slate-400 text-center mt-2 leading-none">
            Review document changes before downloading.
          </p>
        </div>
      </div>
    </>
  );
}

export default SOPCopilot;
