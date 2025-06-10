import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link as LinkIcon,
  Undo,
  Redo,
  Type,
  Palette
} from 'lucide-react'
import { cn } from '@/lib/utils'
import React from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
  maxHeight?: string
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null
  }

  const setLink = React.useCallback(() => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30">
      <Button
        variant={editor.isActive('bold') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        variant={editor.isActive('italic') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className="h-8 w-8 p-0"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive('link') ? 'default' : 'ghost'}
        size="sm"
        onClick={setLink}
        className="h-8 w-8 p-0"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>

      <div className="w-px bg-border mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="h-8 w-8 p-0"
      >
        <Undo className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="h-8 w-8 p-0"
      >
        <Redo className="h-4 w-4" />
      </Button>

      <div className="w-px bg-border mx-1" />

      <input
        type="color"
        onInput={(event) => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()}
        value={editor.getAttributes('textStyle').color || '#000000'}
        className="h-8 w-8 rounded border border-border cursor-pointer"
        title="Text Color"
      />
    </div>
  )
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Start typing...",
  className,
  editable = true,
  maxHeight = "200px"
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      TextStyle,
      Color,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[80px] px-3 py-2',
          `max-h-[${maxHeight}] overflow-y-auto`
        ),
      },
    },
  })

  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  return (
    <div className={cn("border border-border rounded-md bg-background", className)}>
      {editable && <MenuBar editor={editor} />}
      <div 
        className="prose-editor-content"
        style={{ maxHeight: editable ? maxHeight : 'none' }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

// Read-only version for displaying messages
export function MessageDisplay({ content, className }: { content: string; className?: string }) {
  return (
    <RichTextEditor
      content={content}
      onChange={() => {}}
      editable={false}
      className={cn("border-0 bg-transparent", className)}
    />
  )
}