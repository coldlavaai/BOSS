'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Mail,
  MessageSquare,
  Send,
  Search,
  Filter,
  Plus,
  Phone,
  Settings,
  Inbox,
  SendHorizonal,
  FileText,
  User,
} from 'lucide-react'
import { Database } from '@/types/database'
import { format } from 'date-fns'
import { ComposeEmailDialog } from './ComposeEmailDialog'
import { EmailDetailDialog } from './EmailDetailDialog'

type EmailIntegration = Database['public']['Tables']['email_integrations']['Row']
type EmailThread = Database['public']['Tables']['email_threads']['Row'] & {
  customer?: Database['public']['Tables']['customers']['Row']
  job?: Database['public']['Tables']['jobs']['Row'] & {
    service?: Database['public']['Tables']['services']['Row']
  }
}
type SmsMessage = Database['public']['Tables']['sms_messages']['Row'] & {
  customer?: Database['public']['Tables']['customers']['Row']
  job?: Database['public']['Tables']['jobs']['Row'] & {
    service?: Database['public']['Tables']['services']['Row']
  }
}
type WhatsappMessage = Database['public']['Tables']['whatsapp_messages']['Row'] & {
  customer?: Database['public']['Tables']['customers']['Row']
  job?: Database['public']['Tables']['jobs']['Row'] & {
    service?: Database['public']['Tables']['services']['Row']
  }
}

interface CommunicationsInboxProps {
  emailIntegrations: EmailIntegration[]
  emails: EmailThread[]
  smsMessages: SmsMessage[]
  whatsappMessages: WhatsappMessage[]
}

export function CommunicationsInbox({
  emailIntegrations,
  emails,
  smsMessages,
  whatsappMessages,
}: CommunicationsInboxProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState<'all' | 'email' | 'sms' | 'whatsapp'>('email')
  const [emailSubTab, setEmailSubTab] = useState<'inbox' | 'sent' | 'all'>('inbox')
  const [filterUnread, setFilterUnread] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [showComposeDialog, setShowComposeDialog] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(null)
  const [showEmailDetail, setShowEmailDetail] = useState(false)

  // Get unique customers from all communications
  const customers = useMemo(() => {
    const customerSet = new Map()

    emails.forEach((email) => {
      if (email.customer) {
        customerSet.set(email.customer.id, email.customer)
      }
    })

    smsMessages.forEach((sms) => {
      if (sms.customer) {
        customerSet.set(sms.customer.id, sms.customer)
      }
    })

    whatsappMessages.forEach((wa) => {
      if (wa.customer) {
        customerSet.set(wa.customer.id, wa.customer)
      }
    })

    return Array.from(customerSet.values())
  }, [emails, smsMessages, whatsappMessages])

  // Separate inbox and sent emails
  const inboxEmails = useMemo(() => emails.filter(e => !e.is_sent), [emails])
  const sentEmails = useMemo(() => emails.filter(e => e.is_sent), [emails])

  // Combine all messages into unified feed
  const allMessages = useMemo(() => {
    const messages: Array<{
      type: 'email' | 'sms' | 'whatsapp'
      data: EmailThread | SmsMessage | WhatsappMessage
      timestamp: string
      isRead: boolean
      preview: string
      from: string
      customerId: string | null
    }> = []

    // Filter emails based on sub-tab
    const filteredEmails = selectedTab === 'email'
      ? emailSubTab === 'inbox'
        ? inboxEmails
        : emailSubTab === 'sent'
        ? sentEmails
        : emails
      : emails

    filteredEmails.forEach((email) => {
      messages.push({
        type: 'email',
        data: email,
        timestamp: email.sent_at || email.received_at || email.created_at,
        isRead: email.is_read,
        preview: email.subject,
        from: email.is_sent
          ? email.to_emails?.[0] || 'Unknown'
          : email.from_name || email.from_email,
        customerId: email.customer_id,
      })
    })

    smsMessages.forEach((sms) => {
      messages.push({
        type: 'sms',
        data: sms,
        timestamp: sms.sent_at || sms.received_at || sms.created_at,
        isRead: sms.is_read,
        preview: sms.body.substring(0, 100),
        from: sms.customer?.name || sms.from_number,
        customerId: sms.customer_id,
      })
    })

    whatsappMessages.forEach((wa) => {
      messages.push({
        type: 'whatsapp',
        data: wa,
        timestamp: wa.sent_at || wa.received_at || wa.created_at,
        isRead: wa.is_read,
        preview: wa.body.substring(0, 100),
        from: wa.customer?.name || wa.from_number,
        customerId: wa.customer_id,
      })
    })

    // Sort by timestamp descending
    return messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [emails, inboxEmails, sentEmails, smsMessages, whatsappMessages, selectedTab, emailSubTab])

  // Filter messages
  const filteredMessages = useMemo(() => {
    return allMessages.filter((message) => {
      // Filter by type
      if (selectedTab !== 'all' && message.type !== selectedTab) {
        return false
      }

      // Filter by customer
      if (selectedCustomer && message.customerId !== selectedCustomer) {
        return false
      }

      // Filter by unread
      if (filterUnread && message.isRead) {
        return false
      }

      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesPreview = message.preview.toLowerCase().includes(query)
        const matchesFrom = message.from.toLowerCase().includes(query)
        return matchesPreview || matchesFrom
      }

      return true
    })
  }, [allMessages, selectedTab, selectedCustomer, filterUnread, searchQuery])

  return (
    <div className="space-y-6">
      {/* Header with Compose Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Communications</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage all customer communications in one place
          </p>
        </div>
        <Button
          onClick={() => setShowComposeDialog(true)}
          disabled={emailIntegrations.length === 0}
          style={{ backgroundColor: '#d52329' }}
          className="text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Compose Email
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Customer Filter */}
            <div className="w-[200px]">
              <select
                value={selectedCustomer || ''}
                onChange={(e) => setSelectedCustomer(e.target.value || null)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant={filterUnread ? 'default' : 'outline'}
              onClick={() => setFilterUnread(!filterUnread)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {filterUnread ? 'Unread Only' : 'All'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages Tabs */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({allMessages.length})
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email ({emails.length})
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS ({smsMessages.length})
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <Phone className="h-4 w-4 mr-2" />
            WhatsApp ({whatsappMessages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {/* Email Sub-Tabs for Inbox/Sent/All */}
          {selectedTab === 'email' && (
            <div className="mb-4">
              <Tabs value={emailSubTab} onValueChange={(v) => setEmailSubTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="inbox">
                    <Inbox className="h-4 w-4 mr-2" />
                    Inbox ({inboxEmails.length})
                  </TabsTrigger>
                  <TabsTrigger value="sent">
                    <SendHorizonal className="h-4 w-4 mr-2" />
                    Sent ({sentEmails.length})
                  </TabsTrigger>
                  <TabsTrigger value="all">
                    All ({emails.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {filteredMessages.length === 0 ? (
                <div className="p-12 text-center">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No messages found</p>
                  {emailIntegrations.length === 0 && selectedTab === 'email' && (
                    <p className="text-sm text-gray-400 mt-2">
                      Connect your email in Settings to get started
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredMessages.map((message, index) => (
                    <div
                      key={`${message.type}-${index}`}
                      onClick={() => {
                        if (message.type === 'email') {
                          setSelectedEmail(message.data as EmailThread)
                          setShowEmailDetail(true)
                        }
                      }}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !message.isRead ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Icon */}
                          <div className="mt-1">
                            {message.type === 'email' && 'is_sent' in message.data && message.data.is_sent && (
                              <SendHorizonal className="h-5 w-5 text-green-600" />
                            )}
                            {message.type === 'email' && (!('is_sent' in message.data) || !message.data.is_sent) && (
                              <Mail className="h-5 w-5 text-blue-600" />
                            )}
                            {message.type === 'sms' && (
                              <MessageSquare className="h-5 w-5 text-green-600" />
                            )}
                            {message.type === 'whatsapp' && (
                              <Phone className="h-5 w-5 text-green-500" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`font-medium ${
                                  !message.isRead ? 'text-gray-900' : 'text-gray-600'
                                }`}
                              >
                                {message.type === 'email' && 'is_sent' in message.data && message.data.is_sent
                                  ? `To: ${message.from}`
                                  : message.from}
                              </span>
                              {!message.isRead && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                            </div>
                            <p
                              className={`text-sm ${
                                !message.isRead ? 'text-gray-900 font-medium' : 'text-gray-600'
                              } line-clamp-2`}
                            >
                              {message.preview}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {message.type.toUpperCase()}
                              </Badge>
                              {'customer' in message.data && message.data.customer && (
                                <Badge variant="secondary" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  {message.data.customer.name}
                                </Badge>
                              )}
                              {message.type === 'email' && 'is_sent' in message.data && message.data.is_sent && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  Sent
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Timestamp */}
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Compose Email Dialog */}
      <ComposeEmailDialog
        open={showComposeDialog}
        onOpenChange={setShowComposeDialog}
        emailIntegrations={emailIntegrations}
      />

      {/* Email Detail Dialog */}
      <EmailDetailDialog
        email={selectedEmail}
        open={showEmailDetail}
        onOpenChange={setShowEmailDetail}
        onReply={() => {
          // TODO: Pre-fill compose dialog with reply details
          setShowComposeDialog(true)
        }}
      />
    </div>
  )
}
