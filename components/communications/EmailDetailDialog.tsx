'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Mail, User, Calendar, Reply, Forward, Trash2 } from 'lucide-react'
import { Database } from '@/types/database'
import { format } from 'date-fns'

type EmailThread = Database['public']['Tables']['email_threads']['Row'] & {
  customer?: Database['public']['Tables']['customers']['Row']
}

interface EmailDetailDialogProps {
  email: EmailThread | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReply?: () => void
}

export function EmailDetailDialog({
  email,
  open,
  onOpenChange,
  onReply,
}: EmailDetailDialogProps) {
  const [markingAsRead, setMarkingAsRead] = useState(false)

  // Mark as read when opened
  useEffect(() => {
    if (email && open && !email.is_read) {
      markAsRead()
    }
  }, [email, open])

  const markAsRead = async () => {
    if (!email || email.is_read || markingAsRead) return

    setMarkingAsRead(true)

    try {
      const response = await fetch('/api/emails/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email.id,
          isRead: true,
        }),
      })

      if (!response.ok) {
        console.error('Failed to mark email as read')
      }
    } catch (error) {
      console.error('Error marking email as read:', error)
    } finally {
      setMarkingAsRead(false)
    }
  }

  if (!email) return null

  const displayDate = email.sent_at || email.received_at || email.created_at
  const fromDisplay = email.is_sent
    ? `To: ${email.to_emails?.[0] || 'Unknown'}`
    : `From: ${email.from_name || email.from_email}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-4 pr-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold truncate">{email.subject}</h2>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{fromDisplay}</span>
                {email.customer && (
                  <>
                    <span>•</span>
                    <User className="h-4 w-4" />
                    <span>{email.customer.name}</span>
                  </>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Email Metadata */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {format(new Date(displayDate), 'MMMM d, yyyy \'at\' h:mm a')}
                  </span>
                </div>
                {email.to_emails && email.to_emails.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    To: {email.to_emails.join(', ')}
                  </div>
                )}
                {email.cc_emails && email.cc_emails.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Cc: {email.cc_emails.join(', ')}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {email.is_sent && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Sent
                  </Badge>
                )}
                {!email.is_sent && email.is_read && (
                  <Badge variant="outline">Read</Badge>
                )}
                {!email.is_sent && !email.is_read && (
                  <Badge variant="default">Unread</Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Email Body */}
          <div className="prose prose-sm max-w-none">
            {email.body_html ? (
              <div
                className="email-body"
                dangerouslySetInnerHTML={{ __html: email.body_html }}
              />
            ) : email.body_text ? (
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {email.body_text}
              </pre>
            ) : (
              <p className="text-muted-foreground italic">No content</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {!email.is_sent && onReply && (
              <Button
                onClick={() => {
                  onReply()
                  onOpenChange(false)
                }}
                style={{ backgroundColor: '#d52329' }}
                className="text-white hover:opacity-90"
              >
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
