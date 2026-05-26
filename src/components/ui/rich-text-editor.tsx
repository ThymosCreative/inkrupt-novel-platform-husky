import React, { useRef, useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RemoveFormatting,
} from 'lucide-react'

export interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  // Sync value from props only when not focused to avoid cursor jumping
  useEffect(() => {
    if (editorRef.current && !isFocused && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value, isFocused])

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  // Strip all external formatting on paste — keep only plain text structure.
  // This prevents Google Docs / Word fonts, colors and backgrounds from leaking in.
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()

      // Prefer plain text; fall back to stripping HTML if only HTML is available
      let text = e.clipboardData.getData('text/plain')

      if (!text) {
        const html = e.clipboardData.getData('text/html')
        // Strip all tags, decode basic HTML entities
        text = html
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
      }

      // Trim excessive blank lines (3+ consecutive → 2)
      text = text.replace(/\n{3,}/g, '\n\n').trim()

      // Insert as plain text at the current cursor position
      const selection = window.getSelection()
      if (!selection || !selection.rangeCount) return

      selection.deleteFromDocument()
      const range = selection.getRangeAt(0)

      // Split by double newlines (paragraphs) and insert <p> nodes
      const paragraphs = text.split(/\n\n+/)
      const fragment = document.createDocumentFragment()

      paragraphs.forEach((para, i) => {
        const p = document.createElement('p')
        // Handle single line breaks within a paragraph
        const lines = para.split('\n')
        lines.forEach((line, j) => {
          p.appendChild(document.createTextNode(line))
          if (j < lines.length - 1) p.appendChild(document.createElement('br'))
        })
        fragment.appendChild(p)
        // Add blank paragraph between paragraphs (keeps double-enter spacing)
        if (i < paragraphs.length - 1) {
          const spacer = document.createElement('p')
          spacer.appendChild(document.createElement('br'))
          fragment.appendChild(spacer)
        }
      })

      range.insertNode(fragment)

      // Move cursor to end of inserted content
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)

      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    },
    [onChange],
  )

  const execCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg)
    if (editorRef.current) {
      editorRef.current.focus()
      onChange(editorRef.current.innerHTML)
    }
  }

  const isEmpty = !value || value === '<br>' || value === '<p><br></p>'

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/20 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('bold')}
          type="button"
          title="Negrito"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('italic')}
          type="button"
          title="Itálico"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('underline')}
          type="button"
          title="Sublinhado"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('strikeThrough')}
          type="button"
          title="Tachado"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('formatBlock', 'H1')}
          type="button"
          title="Título 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('formatBlock', 'H2')}
          type="button"
          title="Título 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('formatBlock', 'H3')}
          type="button"
          title="Título 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('insertUnorderedList')}
          type="button"
          title="Lista com Marcadores"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('insertOrderedList')}
          type="button"
          title="Lista Numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('justifyLeft')}
          type="button"
          title="Alinhar à Esquerda"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('justifyCenter')}
          type="button"
          title="Centralizar"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('justifyRight')}
          type="button"
          title="Alinhar à Direita"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => execCommand('removeFormat')}
          type="button"
          title="Limpar Formatação"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 relative bg-background">
        {isEmpty && !isFocused && placeholder && (
          <div className="absolute top-6 left-6 md:top-8 md:left-8 text-muted-foreground pointer-events-none text-base md:text-lg">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          className="h-full p-6 md:p-8 outline-none overflow-y-auto prose dark:prose-invert max-w-none focus:outline-none text-base md:text-lg leading-relaxed font-serif"
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>
    </div>
  )
}

