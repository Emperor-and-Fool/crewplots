// Phase 4: RichTextEditor component - Extracted from messaging-system.tsx
// TipTap-based rich text editor with workflow-specific features

import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon } from 'lucide-react';
import type { WorkflowType } from '../types/messaging.types';
import { WORKFLOW_CONFIGS } from '../types/workflow.types';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  enabled?: boolean;
  workflow: WorkflowType;
  readOnly?: boolean;
  minHeight?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Type your message...',
  enabled = true,
  workflow,
  readOnly = false,
  minHeight = '120px'
}: RichTextEditorProps) {
  const workflowConfig = WORKFLOW_CONFIGS[workflow];
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editable: !readOnly && enabled,
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  // Only show toolbar if rich text is enabled for this workflow
  const showToolbar = workflowConfig.features.enableRichText && !readOnly;

  return (
    <div className="border rounded-md">
      {showToolbar && (
        <div className="border-b p-2 flex flex-wrap gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-muted' : ''}
          >
            <Bold className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-muted' : ''}
          >
            <Italic className="h-4 w-4" />
          </Button>

          {workflowConfig.features.enableMarkdown && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive('bulletList') ? 'bg-muted' : ''}
              >
                <List className="h-4 w-4" />
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive('orderedList') ? 'bg-muted' : ''}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={setLink}
                className={editor.isActive('link') ? 'bg-muted' : ''}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
      
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 focus-within:outline-none"
        style={{ minHeight }}
      />
      
      {/* Character count for certain workflows */}
      {workflow === 'application' && (
        <div className="text-xs text-muted-foreground p-2 border-t">
          {editor.storage.characterCount?.characters() || content.length} / 1000 characters
        </div>
      )}
    </div>
  );
}