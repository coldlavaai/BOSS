'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, MessageSquare, Calendar, Download, File } from 'lucide-react'
import { format } from 'date-fns'

type EmailThread = {
  id: string
  subject: string | null
  from_email: string
  from_name: string | null
  to_emails: string[]
  body_text: string | null
  body_html: string | null
  created_at: string
  sent_at: string | null
  received_at: string | null
  is_sent: boolean
  email_attachments: Array<{
    id: string
    file_name: string
    file_size: number
    storage_path: string
  }>
}

type SmsMessage = {
  id: string
  body: string
  direction: string
  from_number: string
  to_number: string
  sent_at: string | null
  received_at: string | null
  created_at: string
}

interface CustomerCommunicationsTabProps {
  customerId: string
}

export function CustomerCommunicationsTab({ customerId }: CustomerCommunicationsTabProps) {
  const [emails, setEmails] = useState<EmailThread[]>([])
  const [smsMessages, setSmsMessages] = useState<SmsMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'email' | 'sms'>('all')

  const supabase = createClient()

  useEffect(() => {
    loadCommunications()
  }, [customerId])

  const loadCommunications = async () => {
    setLoading(true)

    try {
      // Load emails
      const { data: emailData } = await supabase
        .from('email_threads')
        .select(`
          *,
          email_attachments(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (emailData) setEmails(emailData as EmailThread[])

      // Load SMS
      const { data: smsData } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (smsData) setSmsMessages(smsData as SmsMessage[])
    } catch (error) {
      console.error('Error loading communications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Combine and sort all messages
  const allMessages = [
    ...emails.map((e) => ({
      type: 'email' as const,
      timestamp: e.created_at,
      data: e,
    })),
    ...smsMessages.map((s) => ({
      type: 'sms' as const,
      timestamp: s.created_at,
      data: s,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const filteredMessages = allMessages.filter((msg) => {
    if (filter === 'all') return true
    return msg.type === filter
  })

  const totalCount = emails.length + smsMessages.length

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading communications...</div>
  }

  if (totalCount === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No communications yet</p>
        <p className="text-sm text-gray-400 mt-2">
          Send an email or SMS to start a conversation
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({totalCount})
        </Button>
        <Button
          size="sm"
          variant={filter === 'email' ? 'default' : 'outline'}
          onClick={() => setFilter('email')}
        >
          <Mail className="h-4 w-4 mr-1" />
          Emails ({emails.length})
        </Button>
        <Button
          size="sm"
          variant={filter === 'sms' ? 'default' : 'outline'}
          onClick={() => setFilter('sms')}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          SMS ({smsMessages.length})
        </Button>
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        {filteredMessages.map((message, index) => (
          <div
            key={`${message.type}-${index}`}
            className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
          >
            {message.type === 'email' ? (
              // Email Message
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">
                        {message.data.is_sent ? 'You' : message.data.from_name || message.data.from_email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {message.data.subject || '(No subject)'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={message.data.is_sent ? 'default' : 'secondary'}>
                      {message.data.is_sent ? 'Sent' : 'Received'}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {format(new Date(message.timestamp), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>

                {/* Email Body Preview */}
                <div className="text-sm text-gray-700 mb-3 line-clamp-3">
                  {message.data.body_text || 'No content'}
                </div>

                {/* Attachments */}
                {message.data.email_attachments && message.data.email_attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.data.email_attachments.map((attachment) => (
                      <Button
                        key={attachment.id}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.open(
                            `/api/files/download?path=${encodeURIComponent(attachment.storage_path)}`,
                            '_blank'
                          )
                        }}
                      >
                        <File className="h-3 w-3 mr-1" />
                        {attachment.file_name}
                        <span className="text-xs text-gray-500 ml-1">
                          ({(attachment.file_size / 1024).toFixed(1)} KB)
                        </span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // SMS Message
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="font-medium">
                        {message.data.direction === 'outbound' ? 'You' : message.data.from_number}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={message.data.direction === 'outbound' ? 'default' : 'secondary'}>
                      {message.data.direction === 'outbound' ? 'Sent' : 'Received'}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {format(new Date(message.timestamp), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>

                {/* SMS Body */}
                <div className="text-sm text-gray-700 pl-7">
                  {message.data.body}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredMessages.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No {filter} messages found
        </div>
      )}
    </div>
  )
}
