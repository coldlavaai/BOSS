'use client'

import { useState, useRef } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import {
  Bold,
  Italic,
  Underline,
  Link,
  Image,
  Code,
  List,
  ListOrdered,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'

interface RichHtmlEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichHtmlEditor({
  value,
  onChange,
  placeholder = 'Enter HTML content...',
  className = '',
}: RichHtmlEditorProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertAtCursor = (before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)

    const newValue =
      value.substring(0, start) + before + selectedText + after + value.substring(end)

    onChange(newValue)

    // Reset cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + selectedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleBold = () => insertAtCursor('<strong>', '</strong>')
  const handleItalic = () => insertAtCursor('<em>', '</em>')
  const handleUnderline = () => insertAtCursor('<u>', '</u>')
  const handleBulletList = () => insertAtCursor('<ul>\n  <li>', '</li>\n</ul>')
  const handleNumberedList = () => insertAtCursor('<ol>\n  <li>', '</li>\n</ol>')

  const handleInsertLink = () => {
    if (!linkUrl) return
    const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText || linkUrl}</a>`
    insertAtCursor(linkHtml)
    setLinkUrl('')
    setLinkText('')
    setShowLinkDialog(false)
  }

  const handleInsertImage = () => {
    if (!imageUrl) return
    const imageHtml = `<img src="${imageUrl}" alt="${imageAlt || 'Image'}" style="max-width: 200px; height: auto;" />`
    insertAtCursor(imageHtml)
    setImageUrl('')
    setImageAlt('')
    setShowImageDialog(false)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-2">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 p-2 border rounded-lg bg-muted/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBold}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleItalic}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUnderline}
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <div className="w-px h-8 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBulletList}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNumberedList}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <div className="w-px h-8 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowLinkDialog(true)}
              title="Insert Link"
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowImageDialog(true)}
              title="Insert Image"
            >
              <Image className="h-4 w-4" />
            </Button>
            <div className="w-px h-8 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertAtCursor('<br />')}
              title="Line Break"
            >
              <Code className="h-4 w-4" />
            </Button>
          </div>

          {/* HTML Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full min-h-[200px] p-3 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <p className="text-xs text-muted-foreground">
            Use the toolbar buttons or write HTML directly. Images should be hosted URLs.
          </p>
        </TabsContent>

        <TabsContent value="preview">
          <div className="min-h-[200px] p-4 border rounded-lg bg-white">
            {value ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            ) : (
              <p className="text-muted-foreground italic">No content to preview</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Insert Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>Add a hyperlink to your signature</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label htmlFor="link-text">Link Text (optional)</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Click here"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInsertLink}
              disabled={!linkUrl}
              style={{ backgroundColor: '#d52329' }}
              className="text-white hover:opacity-90"
            >
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insert Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>
              Add an image to your signature (must be a hosted URL)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload your image to a hosting service (Imgur, Cloudinary, etc.) and paste
                the URL here
              </p>
            </div>
            <div>
              <Label htmlFor="image-alt">Alt Text (optional)</Label>
              <Input
                id="image-alt"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Company Logo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInsertImage}
              disabled={!imageUrl}
              style={{ backgroundColor: '#d52329' }}
              className="text-white hover:opacity-90"
            >
              Insert Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
