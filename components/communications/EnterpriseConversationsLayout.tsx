'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mail,
  MessageSquare,
  Phone,
  Search,
  User,
  Calendar,
  Wrench,
  Send,
  Star,
  MoreVertical,
  Inbox,
  SendHorizonal,
  Plus,
  ChevronLeft,
  RefreshCw,
  Paperclip,
  X,
  File,
  Upload,
  Download,
  Trash2,
  FolderOpen,
  Edit2,
  Check,
} from 'lucide-react'
import { Database } from '@/types/database'
import { format } from 'date-fns'
import { IntegrationStatusHeader } from './IntegrationStatusHeader'
import { AddCustomerDialog } from '@/components/customers/AddCustomerDialog'
import { CreateJobDialog } from '@/components/board/CreateJobDialog'
import Link from 'next/link'

type EmailIntegration = Database['public']['Tables']['email_integrations']['Row']
type EmailThread = Database['public']['Tables']['email_threads']['Row']
type SmsMessage = Database['public']['Tables']['sms_messages']['Row']
type Customer = Database['public']['Tables']['customers']['Row']
type Job = Database['public']['Tables']['jobs']['Row'] & {
  service?: Database['public']['Tables']['services']['Row']
  pipeline_stage?: Database['public']['Tables']['pipeline_stages']['Row']
  job_add_ons?: Array<{
    add_on: {
      id: string
      name: string
      description: string | null
      price_incl_vat: number
    }
  }>
}
type EmailAttachment = {
  id: string
  email_thread_id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  created_at: string
}

type CustomerFile = {
  id: string
  customer_id: string
  user_id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  description: string | null
  category: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

interface ConversationMessage {
  id: string
  type: 'email' | 'sms'
  direction: 'inbound' | 'outbound'
  subject?: string
  body: string
  timestamp: string
  from: string
  to: string
  isRead: boolean
  attachments?: EmailAttachment[]
}

interface CustomerConversation {
  customer: Customer
  messages: ConversationMessage[]
  lastMessage: ConversationMessage
  unreadCount: number
  jobs: Job[]
}

interface EnterpriseConversationsLayoutProps {
  customers: Customer[]
  emails: (EmailThread & { customer?: Customer; email_attachments?: EmailAttachment[] })[]
  smsMessages: (SmsMessage & { customer?: Customer })[]
  jobs: Job[]
  emailIntegrations: EmailIntegration[]
  customerFiles: CustomerFile[]
}

export function EnterpriseConversationsLayout({
  customers,
  emails,
  smsMessages,
  jobs,
  emailIntegrations,
  customerFiles: allCustomerFiles,
}: EnterpriseConversationsLayoutProps) {
  // Debug logging
  console.log('[EnterpriseConversationsLayout] Customers received:', customers?.length, customers)

  const router = useRouter()

  // Auto-select customer from URL parameter (after sending message)
  const initialCustomerId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('customerId')
    : null

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'all' | 'customers'>('customers')
  const [composeType, setComposeType] = useState<'email' | 'sms' | 'whatsapp'>('email')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [newConversationMode, setNewConversationMode] = useState(false)
  const [selectedNewCustomerId, setSelectedNewCustomerId] = useState('')
  const [showSubjectField, setShowSubjectField] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false)
  const [showCreateJobDialog, setShowCreateJobDialog] = useState(false)
  const [prefilledCustomerData, setPrefilledCustomerData] = useState<{email: string; name: string} | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [uploadingCustomerFile, setUploadingCustomerFile] = useState(false)
  const [fileRenames, setFileRenames] = useState<{ [index: number]: string }>({})
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null)

  // Build conversations grouped by customer OR email address
  const conversations = useMemo(() => {
    const convMap = new Map<string, CustomerConversation>()

    // Group emails by customer (or create placeholder for unknown contacts)
    emails.forEach((email) => {
      // For emails without a customer, create a key based on email address
      let customerId: string
      let customer: Customer

      if (email.customer) {
        customerId = email.customer.id
        customer = email.customer
      } else {
        // Create placeholder customer for unknown email addresses
        const emailAddress = email.is_sent ? email.to_emails[0] : email.from_email
        customerId = `unknown-${emailAddress}`
        customer = {
          id: customerId,
          user_id: '',
          customer_id: 0,
          name: email.is_sent ? email.to_emails[0] : (email.from_name || email.from_email),
          first_name: null,
          last_name: null,
          email: emailAddress,
          phone: '',
          address: null,
          business_name: null,
          additional_contacts: {},
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
      if (!convMap.has(customerId)) {
        convMap.set(customerId, {
          customer: customer,
          messages: [],
          lastMessage: null as any,
          unreadCount: 0,
          jobs: email.customer ? jobs.filter((j) => j.customer_id === customerId) : [],
        })
      }

      const conv = convMap.get(customerId)!
      const message: ConversationMessage = {
        id: email.id,
        type: 'email',
        direction: email.is_sent ? 'outbound' : 'inbound',
        subject: email.subject,
        body: email.body_html || email.body_text || '',
        timestamp: email.sent_at || email.received_at || email.created_at,
        from: email.is_sent ? email.from_email : email.from_email,
        to: email.is_sent ? email.to_emails[0] : email.from_email,
        isRead: email.is_read,
        attachments: email.email_attachments || [],
      }

      conv.messages.push(message)
      if (!email.is_read) {
        conv.unreadCount++
      }
    })

    // Group SMS by customer
    smsMessages.forEach((sms) => {
      if (!sms.customer) return

      const customerId = sms.customer.id
      if (!convMap.has(customerId)) {
        convMap.set(customerId, {
          customer: sms.customer,
          messages: [],
          lastMessage: null as any,
          unreadCount: 0,
          jobs: jobs.filter((j) => j.customer_id === customerId),
        })
      }

      const conv = convMap.get(customerId)!
      const message: ConversationMessage = {
        id: sms.id,
        type: 'sms',
        direction: sms.direction,
        body: sms.body,
        timestamp: sms.sent_at || sms.received_at || sms.created_at,
        from: sms.from_number,
        to: sms.to_number,
        isRead: sms.is_read,
      }

      conv.messages.push(message)
      if (!sms.is_read) {
        conv.unreadCount++
      }
    })

    // Sort messages and set last message
    convMap.forEach((conv) => {
      conv.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      conv.lastMessage = conv.messages[conv.messages.length - 1]
    })

    return Array.from(convMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage?.timestamp || 0).getTime() -
        new Date(a.lastMessage?.timestamp || 0).getTime()
    )
  }, [customers, emails, smsMessages, jobs])

  // Filter conversations by view mode and search
  const filteredConversations = useMemo(() => {
    let filtered = conversations

    // Filter by view mode
    if (viewMode === 'customers') {
      // Only show conversations with actual CRM customers (not external/unknown contacts)
      filtered = filtered.filter((conv) => !conv.customer.id.startsWith('unknown-'))
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (conv) =>
          conv.customer.name.toLowerCase().includes(query) ||
          conv.customer.email.toLowerCase().includes(query) ||
          conv.lastMessage?.body.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [conversations, viewMode, searchQuery])

  const selectedConversation = conversations.find((c) => c.customer.id === selectedCustomerId)

  // Filter customer files for the selected customer
  const customerFiles = useMemo(() => {
    if (!selectedConversation) return []
    if (selectedConversation.customer.id.startsWith('unknown-')) return []
    return allCustomerFiles.filter(f => f.customer_id === selectedConversation.customer.id)
  }, [selectedConversation, allCustomerFiles])

  const handleStartNewConversation = () => {
    setNewConversationMode(true)
    setSelectedCustomerId(null)
    setComposeType('email')
    setComposeSubject('')
    setComposeBody('')
    setSelectedNewCustomerId('')
    setShowSubjectField(false)
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/integrations/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxResults: 100 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync inbox')
      }

      // Force page reload to show synced messages
      window.location.href = window.location.href
    } catch (error: any) {
      alert(error.message || 'Failed to sync inbox')
    } finally {
      setSyncing(false)
    }
  }

  const handleSend = async () => {
    // Get target email based on mode
    let targetEmail: string
    let targetCustomerId: string | null = null

    if (newConversationMode) {
      if (!selectedNewCustomerId) {
        alert('Please select a customer')
        return
      }
      const targetCustomer = customers.find((c) => c.id === selectedNewCustomerId)
      if (!targetCustomer?.email) {
        alert('Selected customer has no email address')
        return
      }
      targetEmail = targetCustomer.email
      targetCustomerId = targetCustomer.id
    } else {
      if (!selectedCustomerId || !selectedConversation) {
        alert('Please select a customer')
        return
      }
      targetEmail = selectedConversation.customer.email
      targetCustomerId = selectedConversation.customer.id.startsWith('unknown-')
        ? null
        : selectedConversation.customer.id
    }

    if (!composeBody.trim()) {
      alert('Please enter a message')
      return
    }

    setSending(true)
    setUploadingFiles(true)
    try {
      if (composeType === 'email') {
        const gmail = emailIntegrations.find((i) => i.provider === 'gmail')
        if (!gmail) {
          throw new Error('No email integration found')
        }

        // Prepare form data with files
        const formData = new FormData()
        formData.append('integrationId', gmail.id)
        formData.append('to', targetEmail)
        formData.append('subject', composeSubject)
        formData.append('body', composeBody)
        if (targetCustomerId) {
          formData.append('customerId', targetCustomerId)
        }

        // Add files
        selectedFiles.forEach((file) => {
          formData.append('files', file)
        })

        // Add rename information separately
        if (Object.keys(fileRenames).length > 0) {
          formData.append('fileRenames', JSON.stringify(fileRenames))
        }

        const response = await fetch('/api/integrations/gmail/send', {
          method: 'POST',
          body: formData, // Send as FormData, not JSON
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to send email')
        }
      } else {
        // SMS send would go here
        throw new Error('SMS not yet implemented')
      }

      // Clear form and force page reload to show the sent message
      setComposeSubject('')
      setComposeBody('')
      setSelectedFiles([])
      setFileRenames({})
      setEditingFileIndex(null)
      setNewConversationMode(false)
      setSelectedNewCustomerId('')
      setShowSubjectField(false)
      // Reload and auto-select the customer we just messaged
      const url = new URL(window.location.href)
      url.searchParams.set('customerId', targetCustomerId || 'unknown-' + targetEmail)
      window.location.href = url.toString()
    } catch (error: any) {
      alert(error.message || 'Failed to send message')
    } finally {
      setSending(false)
      setUploadingFiles(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Integration Status Header */}
      <IntegrationStatusHeader
        emailIntegrations={emailIntegrations}
        onSync={handleSync}
        syncing={syncing}
      />

      <div className="flex flex-1 h-[calc(100vh-16rem)] overflow-hidden">
        {/* Left Sidebar - Customer List - Full screen on mobile, hidden when customer selected */}
        <div className={`w-full lg:w-80 border-r flex flex-col bg-white ${selectedCustomerId && !newConversationMode ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-3 lg:p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base lg:text-xl font-bold">Conversations</h2>
            <div className="flex gap-2">
              <Button
                onClick={handleSync}
                size="sm"
                variant="outline"
                disabled={syncing}
                title="Sync Gmail inbox"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={handleStartNewConversation}
                size="sm"
                style={{ backgroundColor: '#d52329' }}
                className="text-white hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-2 mb-3">
            <Button
              variant={viewMode === 'customers' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('customers')}
              className="flex-1"
            >
              <User className="h-4 w-4 mr-2" />
              Customers
            </Button>
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('all')}
              className="flex-1"
            >
              <Inbox className="h-4 w-4 mr-2" />
              All Mail
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Mail className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.customer.id}
                onClick={() => setSelectedCustomerId(conv.customer.id)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedCustomerId === conv.customer.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                } ${conv.unreadCount > 0 ? 'bg-blue-50/30' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      conv.customer.id.startsWith('unknown-') ? 'bg-gray-300' : 'bg-blue-100'
                    }`}>
                      <User className={`h-5 w-5 ${
                        conv.customer.id.startsWith('unknown-') ? 'text-gray-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                          {conv.customer.name}
                        </h3>
                        {conv.customer.id.startsWith('unknown-') && (
                          <Badge variant="secondary" className="text-xs">External</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{conv.customer.email}</p>
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge className="bg-blue-600 text-white text-xs">{conv.unreadCount}</Badge>
                  )}
                </div>

                {conv.lastMessage && (
                  <div className="ml-12">
                    <p className={`text-sm line-clamp-2 ${conv.unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {conv.lastMessage.subject || conv.lastMessage.body}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {conv.lastMessage.type === 'email' ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {format(new Date(conv.lastMessage.timestamp), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Center - Conversation Thread - Full screen on mobile when customer selected */}
      <div className={`flex-1 flex flex-col bg-gray-50 ${!selectedCustomerId && !newConversationMode ? 'hidden lg:flex' : 'flex'}`}>
        {newConversationMode ? (
          <>
            {/* New Conversation Header */}
            <div className="bg-white border-b p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base lg:text-lg font-semibold">New Conversation</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNewConversationMode(false)
                    setSelectedNewCustomerId('')
                  }}
                >
                  <ChevronLeft className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">Back</span>
                </Button>
              </div>
            </div>

            {/* New Conversation Form */}
            <div className="flex-1 p-3 lg:p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto space-y-3 lg:space-y-4">
                {/* Customer Selector */}
                <div>
                  <label className="block text-sm font-medium mb-2">Select Customer</label>
                  {customers.length === 0 ? (
                    <div className="border border-dashed rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600 mb-2">No customers yet</p>
                      <Link href="/customers">
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Customer
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Select value={selectedNewCustomerId} onValueChange={setSelectedNewCustomerId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} - {customer.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Communication Type Selector */}
                <div>
                  <label className="block text-sm font-medium mb-2">Communication Type</label>
                  <div className="flex gap-2">
                    <Button
                      variant={composeType === 'email' ? 'default' : 'outline'}
                      onClick={() => setComposeType('email')}
                      className="flex-1"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant={composeType === 'sms' ? 'default' : 'outline'}
                      onClick={() => setComposeType('sms')}
                      className="flex-1"
                      disabled
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      SMS (Soon)
                    </Button>
                  </div>
                </div>

                {/* Compose Area */}
                {composeType === 'email' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Subject</label>
                      <Input
                        placeholder="Email subject"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Message</label>
                      <Textarea
                        placeholder="Type your message..."
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                        rows={12}
                        className="resize-none"
                      />
                    </div>

                    {/* File Attachments */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="block text-sm font-medium">Attachments</label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById('file-upload')?.click()}
                          disabled={uploadingFiles}
                        >
                          <Paperclip className="h-4 w-4 mr-2" />
                          Add Files
                        </Button>
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])
                            }
                          }}
                        />
                      </div>
                      {selectedFiles.length > 0 && (
                        <div className="space-y-1">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                              <File className="h-4 w-4 text-gray-500" />
                              {editingFileIndex === index ? (
                                <Input
                                  className="flex-1 h-8"
                                  value={fileRenames[index] || file.name}
                                  onChange={(e) => setFileRenames({ ...fileRenames, [index]: e.target.value })}
                                  onBlur={() => setEditingFileIndex(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') setEditingFileIndex(null)
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span className="flex-1 truncate">{fileRenames[index] || file.name}</span>
                              )}
                              <span className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </span>
                              {editingFileIndex !== index && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingFileIndex(index)}
                                  title="Rename file"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedFiles(prev => prev.filter((_, i) => i !== index))
                                  const newRenames = { ...fileRenames }
                                  delete newRenames[index]
                                  setFileRenames(newRenames)
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Send Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSend}
                    disabled={sending || !selectedNewCustomerId}
                    style={{ backgroundColor: '#d52329' }}
                    className="text-white hover:opacity-90"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : !selectedConversation ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Select a conversation to view messages</p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation Header */}
            <div className="bg-white border-b p-3 lg:p-4">
              <div className="flex items-center gap-2 lg:gap-3">
                {/* Mobile Back Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCustomerId(null)}
                  className="lg:hidden p-1"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 lg:h-6 lg:w-6 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm lg:text-lg font-semibold truncate">{selectedConversation.customer.name}</h2>
                    {selectedConversation.customer.id.startsWith('unknown-') && (
                      <Badge variant="secondary" className="text-xs">External</Badge>
                    )}
                  </div>
                  <p className="text-xs lg:text-sm text-gray-500 truncate">{selectedConversation.customer.email}</p>
                </div>
                {selectedConversation.customer.id.startsWith('unknown-') && (
                  <Button
                    onClick={() => {
                      setPrefilledCustomerData({
                        email: selectedConversation.customer.email,
                        name: selectedConversation.customer.name
                      })
                      setShowAddCustomerDialog(true)
                    }}
                    size="sm"
                    style={{ backgroundColor: '#d52329' }}
                    className="text-white hover:opacity-90 hidden lg:flex"
                  >
                    <Plus className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">Add as Customer</span>
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="hidden lg:flex">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-2">
              {selectedConversation.messages.map((message) => (
                <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] lg:max-w-[75%] ${message.direction === 'outbound' ? 'bg-blue-600 text-white' : 'bg-gray-100'} rounded-2xl px-3 py-2 lg:px-4 shadow-sm`}>
                    {message.subject && message.type === 'email' && (
                      <div className={`text-sm font-semibold mb-1 ${message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-700'}`}>
                        {message.subject}
                      </div>
                    )}
                    <div
                      className={`text-sm ${message.direction === 'outbound' ? 'text-white' : 'text-gray-900'}`}
                      dangerouslySetInnerHTML={{ __html: message.body }}
                    />
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className={`flex items-center gap-2 p-2 rounded text-xs ${
                              message.direction === 'outbound'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            <Paperclip className="h-3 w-3" />
                            <span className="flex-1 truncate">{attachment.file_name}</span>
                            <span className="text-xs opacity-75">
                              {(attachment.file_size / 1024).toFixed(1)} KB
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-6 w-6 p-0 ${message.direction === 'outbound' ? 'hover:bg-blue-400' : 'hover:bg-gray-300'}`}
                              onClick={() => window.open(`/api/files/download?path=${encodeURIComponent(attachment.storage_path)}`, '_blank')}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            {!selectedConversation.customer.id.startsWith('unknown-') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-6 w-6 p-0 ${message.direction === 'outbound' ? 'hover:bg-blue-400' : 'hover:bg-gray-300'}`}
                                onClick={async () => {
                                  try {
                                    await fetch('/api/files/save-to-customer', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        attachmentId: attachment.id,
                                        customerId: selectedConversation.customer.id,
                                      }),
                                    })
                                    window.location.href = window.location.href
                                  } catch (error) {
                                    console.error('Error saving to customer:', error)
                                  }
                                }}
                                title="Save to Customer Files"
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={`text-xs mt-1 ${message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {format(new Date(message.timestamp), 'h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Always-Visible Compose Area */}
            <div className="bg-white border-t">
              {/* Channel Tabs */}
              <div className="flex gap-1 p-2 border-b">
                <Button
                  variant={composeType === 'email' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setComposeType('email')}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  variant={composeType === 'sms' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setComposeType('sms')}
                  className="flex-1"
                  disabled
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  SMS
                </Button>
                <Button
                  variant={composeType === 'whatsapp' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setComposeType('whatsapp')}
                  className="flex-1"
                  disabled
                >
                  <Phone className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>

              {/* Compose Fields */}
              <div className="p-2 lg:p-4 space-y-2 lg:space-y-3">
                {/* Optional Subject Field */}
                {composeType === 'email' && showSubjectField && (
                  <Input
                    placeholder="Subject (optional)"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="text-sm"
                  />
                )}

                {/* Message Input */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder={`Type your ${composeType} message...`}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    rows={3}
                    className="resize-none flex-1 text-sm"
                  />
                </div>

                {/* File Attachments - Email Only */}
                {composeType === 'email' && selectedFiles.length > 0 && (
                  <div className="space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                        <File className="h-4 w-4 text-gray-500" />
                        {editingFileIndex === index ? (
                          <Input
                            className="flex-1 h-8"
                            value={fileRenames[index] || file.name}
                            onChange={(e) => setFileRenames({ ...fileRenames, [index]: e.target.value })}
                            onBlur={() => setEditingFileIndex(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingFileIndex(null)
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="flex-1 truncate">{fileRenames[index] || file.name}</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        {editingFileIndex !== index && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingFileIndex(index)}
                            title="Rename file"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedFiles(prev => prev.filter((_, i) => i !== index))
                            const newRenames = { ...fileRenames }
                            delete newRenames[index]
                            setFileRenames(newRenames)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  id="file-upload-bottom"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])
                    }
                  }}
                />

                {/* Actions */}
                <div className="flex justify-between items-center gap-2">
                  <div className="flex gap-1 lg:gap-2">
                    {composeType === 'email' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSubjectField(!showSubjectField)}
                          className="text-xs lg:text-sm"
                        >
                          <span className="hidden lg:inline">{showSubjectField ? 'Hide' : 'Add'} Subject</span>
                          <span className="lg:hidden">Subject</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => document.getElementById('file-upload-bottom')?.click()}
                          disabled={uploadingFiles}
                        >
                          <Paperclip className="h-4 w-4 lg:mr-2" />
                          <span className="hidden lg:inline">Add Files</span>
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={sending}
                    size="sm"
                    style={{ backgroundColor: '#d52329' }}
                    className="text-white hover:opacity-90"
                  >
                    <Send className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">{sending ? 'Sending...' : 'Send'}</span>
                    <span className="lg:hidden">Send</span>
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Sidebar - Customer Details - Hidden on mobile */}
      {selectedConversation && (
        <div className="hidden lg:block w-80 border-l bg-white overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Contact Details</h3>

            {/* Customer Info */}
            <div className="space-y-3 mb-6">
              {/* Name */}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700 font-medium">{selectedConversation.customer.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{selectedConversation.customer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{selectedConversation.customer.phone}</span>
              </div>
              {selectedConversation.customer.business_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">{selectedConversation.customer.business_name}</span>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Jobs & Services */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Jobs ({selectedConversation.jobs.length})
                </h4>
                {!selectedConversation.customer.id.startsWith('unknown-') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCreateJobDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {selectedConversation.jobs.length === 0 ? (
                <p className="text-sm text-gray-500">No jobs yet</p>
              ) : (
                <div className="space-y-2">
                  {selectedConversation.jobs.slice(0, 5).map((job) => (
                    <Card key={job.id} className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm">{job.service?.name || 'Service'}</h5>
                          {job.job_add_ons && job.job_add_ons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {job.job_add_ons.map((ja) => (
                                <span
                                  key={ja.add_on.id}
                                  className="inline-flex items-center text-[10px] font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded"
                                >
                                  + {ja.add_on.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs border-0 ml-2 flex-shrink-0"
                          style={{
                            backgroundColor: job.pipeline_stage?.color + '20' || '#e5e7eb',
                            color: job.pipeline_stage?.color || '#6b7280'
                          }}
                        >
                          {job.pipeline_stage?.name || job.status || 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(job.booking_datetime), 'MMM d, yyyy')}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-green-600">
                        £{(job.total_price / 100).toFixed(2)}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Files Section */}
            {!selectedConversation.customer.id.startsWith('unknown-') && (
              <>
                <Separator className="my-4" />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Files
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => document.getElementById('customer-file-upload')?.click()}
                      disabled={uploadingCustomerFile}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>

                  <input
                    id="customer-file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setUploadingCustomerFile(true)
                        try {
                          for (const file of Array.from(e.target.files)) {
                            const formData = new FormData()
                            formData.append('file', file)
                            formData.append('customerId', selectedConversation.customer.id)
                            formData.append('category', 'sent')

                            await fetch('/api/files/customer/upload', {
                              method: 'POST',
                              body: formData,
                            })
                          }
                          // Reload to show new files
                          window.location.href = window.location.href
                        } catch (error) {
                          console.error('Error uploading files:', error)
                        } finally {
                          setUploadingCustomerFile(false)
                        }
                      }
                    }}
                  />

                  {customerFiles.length === 0 ? (
                    <p className="text-sm text-gray-500">No files yet</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Sent Files */}
                      {customerFiles.filter(f => f.category === 'sent' || f.category === 'document').length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            Sent ({customerFiles.filter(f => f.category === 'sent' || f.category === 'document').length})
                          </h5>
                          <div className="space-y-2">
                            {customerFiles.filter(f => f.category === 'sent' || f.category === 'document').map((file) => (
                              <div key={file.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                                <File className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{file.file_name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(file.file_size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    window.open(`/api/files/download?path=${encodeURIComponent(file.storage_path)}`, '_blank')
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    if (confirm('Delete this file?')) {
                                      await fetch(`/api/files/customer/${file.id}`, {
                                        method: 'DELETE',
                                      })
                                      window.location.href = window.location.href
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Received Files */}
                      {customerFiles.filter(f => f.category === 'received' || f.category === 'email_attachment').length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                            <Inbox className="h-3 w-3" />
                            Received ({customerFiles.filter(f => f.category === 'received' || f.category === 'email_attachment').length})
                          </h5>
                          <div className="space-y-2">
                            {customerFiles.filter(f => f.category === 'received' || f.category === 'email_attachment').map((file) => (
                              <div key={file.id} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-100">
                                <File className="h-4 w-4 text-green-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{file.file_name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(file.file_size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    window.open(`/api/files/download?path=${encodeURIComponent(file.storage_path)}`, '_blank')
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    if (confirm('Delete this file?')) {
                                      await fetch(`/api/files/customer/${file.id}`, {
                                        method: 'DELETE',
                                      })
                                      window.location.href = window.location.href
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Add as Customer Dialog */}
      <AddCustomerDialog
        open={showAddCustomerDialog}
        onOpenChange={(open) => {
          setShowAddCustomerDialog(open)
          if (!open) {
            setPrefilledCustomerData(null)
          }
        }}
        onCustomerAdded={(customer) => {
          setShowAddCustomerDialog(false)
          setPrefilledCustomerData(null)
          // Reload to show the newly linked emails
          window.location.href = window.location.href
        }}
        initialEmail={prefilledCustomerData?.email}
        initialName={prefilledCustomerData?.name}
      />

      <CreateJobDialog
        open={showCreateJobDialog}
        onOpenChange={setShowCreateJobDialog}
        onJobCreated={(job) => {
          setShowCreateJobDialog(false)
          // Reload to show the new job in the sidebar
          window.location.href = window.location.href
        }}
      />
    </div>
  )
}
