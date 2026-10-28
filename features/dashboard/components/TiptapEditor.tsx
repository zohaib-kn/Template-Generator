"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";

export interface FormattingState {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  textAlign: "left" | "center" | "right";
  heading: "H1" | "H2" | "H3" | "Body";
}

export interface TiptapEditorProps {
  initialContent: string;
  editable?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  zoomLevel?: number;
  onUpdate?: (html: string, wordCount: number) => void;
  onEditorReady?: (editor: Editor | null) => void;
  onFormatChange?: (state: FormattingState) => void;
}

export function TiptapEditor({
  initialContent,
  editable = true,
  fontSize = 11,
  fontFamily = "Calibri, Carlito, Aptos, 'Segoe UI', sans-serif",
  textColor = "#111111",
  zoomLevel = 100,
  onUpdate,
  onEditorReady,
  onFormatChange,
}: TiptapEditorProps) {
  const getFormatState = (ed: Editor): FormattingState => {
    let textAlign: "left" | "center" | "right" = "left";
    if (ed.isActive({ textAlign: "center" })) textAlign = "center";
    else if (ed.isActive({ textAlign: "right" })) textAlign = "right";

    let heading: "H1" | "H2" | "H3" | "Body" = "Body";
    if (ed.isActive("heading", { level: 1 })) heading = "H1";
    else if (ed.isActive("heading", { level: 2 })) heading = "H2";
    else if (ed.isActive("heading", { level: 3 })) heading = "H3";

    return {
      isBold: ed.isActive("bold"),
      isItalic: ed.isActive("italic"),
      isUnderline: ed.isActive("underline"),
      isStrike: ed.isActive("strike"),
      textAlign,
      heading,
    };
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      FontFamily,
    ],
    content: initialContent,
    editable: editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap outline-none min-h-[700px] w-full text-slate-800 leading-relaxed focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const text = ed.getText();
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      if (onUpdate) {
        onUpdate(html, words);
      }
      if (onFormatChange) {
        onFormatChange(getFormatState(ed));
      }
    },
    onSelectionUpdate: ({ editor: ed }) => {
      if (onFormatChange) {
        onFormatChange(getFormatState(ed));
      }
    },
    onTransaction: ({ editor: ed }) => {
      if (onFormatChange) {
        onFormatChange(getFormatState(ed));
      }
    },
  });

  // Sync editable status when prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Notify parent of editor ready/destroy
  useEffect(() => {
    if (onEditorReady) {
      onEditorReady(editor);
    }
    return () => {
      if (onEditorReady) {
        onEditorReady(null);
      }
    };
  }, [editor, onEditorReady]);

  // Sync content when initialContent changes from outside (e.g. document switch or AI modification)
  useEffect(() => {
    if (editor && initialContent) {
      const currentHtml = editor.getHTML();
      // Only set if different to preserve active selection when user is typing
      if (currentHtml !== initialContent && !editor.isFocused) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent]);

  return (
    <div
      className="tiptap-container w-full"
      style={{
        fontSize: `${fontSize}px`,
        fontFamily: fontFamily,
        color: textColor,
      }}
    >
      <style jsx global>{`
        .tiptap {
          outline: none !important;
        }
        .tiptap h1 {
          font-size: 1.55rem;
          font-weight: 700;
          color: #0f172a;
          margin-top: 1.5rem;
          margin-bottom: 0.6rem;
          line-height: 1.25;
        }
        .tiptap h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin-top: 1.35rem;
          margin-bottom: 0.5rem;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid #e2e8f0;
          line-height: 1.35;
        }
        .tiptap h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin-top: 1rem;
          margin-bottom: 0.25rem;
        }
        .tiptap p {
          font-size: inherit;
          color: inherit;
          line-height: 1.18;
          margin-top: 0;
          margin-bottom: 7px;
          text-align: justify;
          text-justify: inter-word;
        }
        .tiptap a {
          color: #1d4ed8;
          text-decoration: underline;
        }
        .tiptap ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.95rem;
          font-size: 0.95rem;
          color: #334155;
        }
        .tiptap ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0.95rem;
          font-size: 0.95rem;
          color: #334155;
        }
        .tiptap li {
          margin-bottom: 0.25rem;
          line-height: 1.6;
        }
        .tiptap u {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .tiptap s {
          text-decoration: line-through;
        }
        .tiptap blockquote {
          border-left: 3px solid #6366f1;
          padding-left: 1rem;
          font-style: italic;
          color: #475569;
          margin: 1rem 0;
        }
      `}</style>
      <EditorContent editor={editor} />
    </div>
  );
}
