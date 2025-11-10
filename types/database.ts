export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type JobStatus =
  | 'to_call_back'
  | 'new_booking'
  | 'job_in_progress'
  | 'job_completed'
  | 'review_request_sent'
  | 'review_received'
  | 'archived'

export type JobSource = 'manual' | 'sophie' | 'widget' | 'phone' | 'email' | 'other'

export type CarSize = 'Small' | 'Medium' | 'Large' | 'XL'

export interface Database {
  public: {
    Tables: {
      pipeline_stages: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          display_order: number
          is_archived: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string
          display_order: number
          is_archived?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string
          display_order?: number
          is_archived?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          user_id: string
          customer_id: number
          name: string
          first_name: string | null
          last_name: string | null
          phone: string
          email: string
          address: string | null
          business_name: string | null
          additional_contacts: Json
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          customer_id?: number
          name: string
          first_name?: string | null
          last_name?: string | null
          phone: string
          email: string
          address?: string | null
          business_name?: string | null
          additional_contacts?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: number
          name?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string
          email?: string
          address?: string | null
          business_name?: string | null
          additional_contacts?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cars: {
        Row: {
          id: string
          customer_id: string
          make: string
          model: string
          year: number
          color: string | null
          registration_plate: string | null
          size_category: CarSize
          size_override: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          make: string
          model: string
          year: number
          color?: string | null
          registration_plate?: string | null
          size_category: CarSize
          size_override?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          make?: string
          model?: string
          year?: number
          color?: string | null
          registration_plate?: string | null
          size_category?: CarSize
          size_override?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      service_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          display_order: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          display_order?: number
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          display_order?: number
          active?: boolean
          created_at?: string
        }
      }
      calendar_settings: {
        Row: {
          id: string
          user_id: string
          monday_open: string | null
          monday_close: string | null
          monday_enabled: boolean
          tuesday_open: string | null
          tuesday_close: string | null
          tuesday_enabled: boolean
          wednesday_open: string | null
          wednesday_close: string | null
          wednesday_enabled: boolean
          thursday_open: string | null
          thursday_close: string | null
          thursday_enabled: boolean
          friday_open: string | null
          friday_close: string | null
          friday_enabled: boolean
          saturday_open: string | null
          saturday_close: string | null
          saturday_enabled: boolean
          sunday_open: string | null
          sunday_close: string | null
          sunday_enabled: boolean
          buffer_minutes: number
          lunch_break_start: string | null
          lunch_break_end: string | null
          lunch_break_enabled: boolean
          min_booking_hours: number
          max_booking_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          monday_open?: string | null
          monday_close?: string | null
          monday_enabled?: boolean
          tuesday_open?: string | null
          tuesday_close?: string | null
          tuesday_enabled?: boolean
          wednesday_open?: string | null
          wednesday_close?: string | null
          wednesday_enabled?: boolean
          thursday_open?: string | null
          thursday_close?: string | null
          thursday_enabled?: boolean
          friday_open?: string | null
          friday_close?: string | null
          friday_enabled?: boolean
          saturday_open?: string | null
          saturday_close?: string | null
          saturday_enabled?: boolean
          sunday_open?: string | null
          sunday_close?: string | null
          sunday_enabled?: boolean
          buffer_minutes?: number
          lunch_break_start?: string | null
          lunch_break_end?: string | null
          lunch_break_enabled?: boolean
          min_booking_hours?: number
          max_booking_days?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          monday_open?: string | null
          monday_close?: string | null
          monday_enabled?: boolean
          tuesday_open?: string | null
          tuesday_close?: string | null
          tuesday_enabled?: boolean
          wednesday_open?: string | null
          wednesday_close?: string | null
          wednesday_enabled?: boolean
          thursday_open?: string | null
          thursday_close?: string | null
          thursday_enabled?: boolean
          friday_open?: string | null
          friday_close?: string | null
          friday_enabled?: boolean
          saturday_open?: string | null
          saturday_close?: string | null
          saturday_enabled?: boolean
          sunday_open?: string | null
          sunday_close?: string | null
          sunday_enabled?: boolean
          buffer_minutes?: number
          lunch_break_start?: string | null
          lunch_break_end?: string | null
          lunch_break_enabled?: boolean
          min_booking_hours?: number
          max_booking_days?: number
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string | null
          duration_hours: number | null
          duration_minutes: number
          duration_text: string
          availability: string
          includes: string[]
          notes: string | null
          default_coating_years: number | null
          warranty_years: number | null
          remote_bookable: boolean
          is_active: boolean
          requires_quote: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string | null
          duration_hours?: number | null
          duration_minutes: number
          duration_text: string
          availability?: string
          includes?: string[]
          notes?: string | null
          default_coating_years?: number | null
          warranty_years?: number | null
          remote_bookable?: boolean
          is_active?: boolean
          requires_quote?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string | null
          duration_hours?: number | null
          duration_minutes?: number
          duration_text?: string
          availability?: string
          includes?: string[]
          notes?: string | null
          default_coating_years?: number | null
          warranty_years?: number | null
          remote_bookable?: boolean
          is_active?: boolean
          requires_quote?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          customer_id: string
          car_id: string
          service_id: string
          pipeline_stage_id: string
          booking_datetime: string
          duration_minutes: number | null
          status: JobStatus | null
          base_price: number
          add_ons_total: number
          total_price: number
          deposit_paid: boolean
          deposit_amount: number | null
          selected_add_ons: Json
          source: JobSource
          notes: string | null
          tags: string[]
          google_calendar_event_id: string | null
          last_synced_from_google: string | null
          created_at: string
          updated_at: string
          archived_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          car_id: string
          service_id: string
          pipeline_stage_id: string
          booking_datetime: string
          duration_minutes?: number | null
          status?: JobStatus | null
          base_price: number
          add_ons_total?: number
          total_price: number
          deposit_paid?: boolean
          deposit_amount?: number | null
          selected_add_ons?: Json
          source?: JobSource
          notes?: string | null
          tags?: string[]
          google_calendar_event_id?: string | null
          last_synced_from_google?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          car_id?: string
          service_id?: string
          pipeline_stage_id?: string
          booking_datetime?: string
          duration_minutes?: number | null
          status?: JobStatus | null
          base_price?: number
          add_ons_total?: number
          total_price?: number
          deposit_paid?: boolean
          deposit_amount?: number | null
          selected_add_ons?: Json
          source?: JobSource
          notes?: string | null
          tags?: string[]
          google_calendar_event_id?: string | null
          last_synced_from_google?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          completed_at?: string | null
        }
      }
      job_history: {
        Row: {
          id: string
          job_id: string
          changed_by: string
          change_type: string
          old_status: string | null
          new_status: string | null
          changes: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          changed_by?: string
          change_type: string
          old_status?: string | null
          new_status?: string | null
          changes?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          changed_by?: string
          change_type?: string
          old_status?: string | null
          new_status?: string | null
          changes?: Json | null
          created_at?: string
        }
      }
      vehicle_size_lookup: {
        Row: {
          id: string
          make: string
          model: string
          size_category: CarSize
          created_at: string
        }
        Insert: {
          id?: string
          make: string
          model: string
          size_category: CarSize
          created_at?: string
        }
        Update: {
          id?: string
          make?: string
          model?: string
          size_category?: CarSize
          created_at?: string
        }
      }
      webhook_logs: {
        Row: {
          id: string
          source: 'sophie' | 'widget'
          payload: Json
          success: boolean
          job_id: string | null
          error_message: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source: 'sophie' | 'widget'
          payload: Json
          success: boolean
          job_id?: string | null
          error_message?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          source?: 'sophie' | 'widget'
          payload?: Json
          success?: boolean
          job_id?: string | null
          error_message?: string | null
          ip_address?: string | null
          created_at?: string
        }
      }
      email_integrations: {
        Row: {
          id: string
          user_id: string
          provider: 'outlook' | 'gmail' | 'office365'
          email_address: string
          display_name: string | null
          access_token: string
          refresh_token: string
          token_expires_at: string
          provider_user_id: string | null
          is_active: boolean
          last_sync_at: string | null
          sync_enabled: boolean
          sync_from_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: 'outlook' | 'gmail' | 'office365'
          email_address: string
          display_name?: string | null
          access_token: string
          refresh_token: string
          token_expires_at: string
          provider_user_id?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          sync_enabled?: boolean
          sync_from_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: 'outlook' | 'gmail' | 'office365'
          email_address?: string
          display_name?: string | null
          access_token?: string
          refresh_token?: string
          token_expires_at?: string
          provider_user_id?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          sync_enabled?: boolean
          sync_from_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      email_threads: {
        Row: {
          id: string
          integration_id: string
          user_id: string
          customer_id: string | null
          job_id: string | null
          provider: 'outlook' | 'gmail' | 'office365'
          provider_message_id: string
          provider_thread_id: string | null
          from_email: string
          from_name: string | null
          to_emails: string[]
          cc_emails: string[]
          bcc_emails: string[]
          subject: string
          body_text: string | null
          body_html: string | null
          attachments: Json
          is_read: boolean
          is_sent: boolean
          received_at: string | null
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          integration_id: string
          user_id: string
          customer_id?: string | null
          job_id?: string | null
          provider: 'outlook' | 'gmail' | 'office365'
          provider_message_id: string
          provider_thread_id?: string | null
          from_email: string
          from_name?: string | null
          to_emails: string[]
          cc_emails?: string[]
          bcc_emails?: string[]
          subject: string
          body_text?: string | null
          body_html?: string | null
          attachments?: Json
          is_read?: boolean
          is_sent?: boolean
          received_at?: string | null
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          integration_id?: string
          user_id?: string
          customer_id?: string | null
          job_id?: string | null
          provider?: 'outlook' | 'gmail' | 'office365'
          provider_message_id?: string
          provider_thread_id?: string | null
          from_email?: string
          from_name?: string | null
          to_emails?: string[]
          cc_emails?: string[]
          bcc_emails?: string[]
          subject?: string
          body_text?: string | null
          body_html?: string | null
          attachments?: Json
          is_read?: boolean
          is_sent?: boolean
          received_at?: string | null
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sms_messages: {
        Row: {
          id: string
          user_id: string
          customer_id: string | null
          job_id: string | null
          from_number: string
          to_number: string
          body: string
          twilio_message_sid: string | null
          twilio_status: string | null
          twilio_error_code: string | null
          twilio_error_message: string | null
          direction: 'inbound' | 'outbound'
          is_read: boolean
          sent_at: string | null
          delivered_at: string | null
          received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id?: string | null
          job_id?: string | null
          from_number: string
          to_number: string
          body: string
          twilio_message_sid?: string | null
          twilio_status?: string | null
          twilio_error_code?: string | null
          twilio_error_message?: string | null
          direction: 'inbound' | 'outbound'
          is_read?: boolean
          sent_at?: string | null
          delivered_at?: string | null
          received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string | null
          job_id?: string | null
          from_number?: string
          to_number?: string
          body?: string
          twilio_message_sid?: string | null
          twilio_status?: string | null
          twilio_error_code?: string | null
          twilio_error_message?: string | null
          direction?: 'inbound' | 'outbound'
          is_read?: boolean
          sent_at?: string | null
          delivered_at?: string | null
          received_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      whatsapp_messages: {
        Row: {
          id: string
          user_id: string
          customer_id: string | null
          job_id: string | null
          from_number: string
          to_number: string
          body: string
          media: Json
          twilio_message_sid: string | null
          twilio_status: string | null
          twilio_error_code: string | null
          twilio_error_message: string | null
          direction: 'inbound' | 'outbound'
          is_read: boolean
          sent_at: string | null
          delivered_at: string | null
          received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id?: string | null
          job_id?: string | null
          from_number: string
          to_number: string
          body: string
          media?: Json
          twilio_message_sid?: string | null
          twilio_status?: string | null
          twilio_error_code?: string | null
          twilio_error_message?: string | null
          direction: 'inbound' | 'outbound'
          is_read?: boolean
          sent_at?: string | null
          delivered_at?: string | null
          received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string | null
          job_id?: string | null
          from_number?: string
          to_number?: string
          body?: string
          media?: Json
          twilio_message_sid?: string | null
          twilio_status?: string | null
          twilio_error_code?: string | null
          twilio_error_message?: string | null
          direction?: 'inbound' | 'outbound'
          is_read?: boolean
          sent_at?: string | null
          delivered_at?: string | null
          received_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      communication_preferences: {
        Row: {
          id: string
          customer_id: string
          preferred_methods: string[]
          email_opt_in: boolean
          sms_opt_in: boolean
          whatsapp_opt_in: boolean
          marketing_opt_in: boolean
          booking_confirmations: boolean
          reminders: boolean
          review_requests: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          preferred_methods?: string[]
          email_opt_in?: boolean
          sms_opt_in?: boolean
          whatsapp_opt_in?: boolean
          marketing_opt_in?: boolean
          booking_confirmations?: boolean
          reminders?: boolean
          review_requests?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          preferred_methods?: string[]
          email_opt_in?: boolean
          sms_opt_in?: boolean
          whatsapp_opt_in?: boolean
          marketing_opt_in?: boolean
          booking_confirmations?: boolean
          reminders?: boolean
          review_requests?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          event_category: string
          event_data: Json | null
          duration_ms: number | null
          page_path: string | null
          user_agent: string | null
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          event_category: string
          event_data?: Json | null
          duration_ms?: number | null
          page_path?: string | null
          user_agent?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          event_category?: string
          event_data?: Json | null
          duration_ms?: number | null
          page_path?: string | null
          user_agent?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
      }
      gmb_integrations: {
        Row: {
          id: string
          user_id: string
          account_id: string
          location_id: string
          business_name: string | null
          business_address: string | null
          business_phone: string | null
          business_website: string | null
          access_token: string
          refresh_token: string
          token_expires_at: string
          is_active: boolean
          auto_sync_enabled: boolean
          auto_review_request_enabled: boolean
          review_request_delay_hours: number
          last_sync_at: string | null
          sync_from_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          location_id: string
          business_name?: string | null
          business_address?: string | null
          business_phone?: string | null
          business_website?: string | null
          access_token: string
          refresh_token: string
          token_expires_at: string
          is_active?: boolean
          auto_sync_enabled?: boolean
          auto_review_request_enabled?: boolean
          review_request_delay_hours?: number
          last_sync_at?: string | null
          sync_from_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          location_id?: string
          business_name?: string | null
          business_address?: string | null
          business_phone?: string | null
          business_website?: string | null
          access_token?: string
          refresh_token?: string
          token_expires_at?: string
          is_active?: boolean
          auto_sync_enabled?: boolean
          auto_review_request_enabled?: boolean
          review_request_delay_hours?: number
          last_sync_at?: string | null
          sync_from_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      gmb_reviews: {
        Row: {
          id: string
          user_id: string
          integration_id: string
          review_id: string
          reviewer_name: string | null
          reviewer_profile_url: string | null
          star_rating: number
          comment: string | null
          review_reply: string | null
          review_reply_at: string | null
          review_date: string
          is_edited: boolean
          customer_id: string | null
          job_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          integration_id: string
          review_id: string
          reviewer_name?: string | null
          reviewer_profile_url?: string | null
          star_rating: number
          comment?: string | null
          review_reply?: string | null
          review_reply_at?: string | null
          review_date: string
          is_edited?: boolean
          customer_id?: string | null
          job_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          integration_id?: string
          review_id?: string
          reviewer_name?: string | null
          reviewer_profile_url?: string | null
          star_rating?: number
          comment?: string | null
          review_reply?: string | null
          review_reply_at?: string | null
          review_date?: string
          is_edited?: boolean
          customer_id?: string | null
          job_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      review_requests: {
        Row: {
          id: string
          user_id: string
          integration_id: string
          customer_id: string
          job_id: string
          email_sent_at: string
          review_url: string
          email_opened: boolean
          email_opened_at: string | null
          review_submitted: boolean
          review_submitted_at: string | null
          gmb_review_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          integration_id: string
          customer_id: string
          job_id: string
          email_sent_at?: string
          review_url: string
          email_opened?: boolean
          email_opened_at?: string | null
          review_submitted?: boolean
          review_submitted_at?: string | null
          gmb_review_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          integration_id?: string
          customer_id?: string
          job_id?: string
          email_sent_at?: string
          review_url?: string
          email_opened?: boolean
          email_opened_at?: string | null
          review_submitted?: boolean
          review_submitted_at?: string | null
          gmb_review_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_signatures: {
        Row: {
          id: string
          user_id: string
          name: string
          html_content: string
          text_content: string | null
          is_default: boolean
          source: string
          integration_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          html_content: string
          text_content?: string | null
          is_default?: boolean
          source?: string
          integration_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          html_content?: string
          text_content?: string | null
          is_default?: boolean
          source?: string
          integration_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          template_type: string
          subject_template: string
          body_html: string
          body_text: string | null
          signature_id: string | null
          variables: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          description?: string | null
          template_type: string
          subject_template: string
          body_html: string
          body_text?: string | null
          signature_id?: string | null
          variables?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          template_type?: string
          subject_template?: string
          body_html?: string
          body_text?: string | null
          signature_id?: string | null
          variables?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      email_automation_rules: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          trigger_type: string
          trigger_config: Json
          template_id: string
          conditions: Json
          is_active: boolean
          send_to_customer: boolean
          send_to_additional: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          description?: string | null
          trigger_type: string
          trigger_config?: Json
          template_id: string
          conditions?: Json
          is_active?: boolean
          send_to_customer?: boolean
          send_to_additional?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          trigger_type?: string
          trigger_config?: Json
          template_id?: string
          conditions?: Json
          is_active?: boolean
          send_to_customer?: boolean
          send_to_additional?: Json
          created_at?: string
          updated_at?: string
        }
      }
      email_automation_logs: {
        Row: {
          id: string
          rule_id: string | null
          job_id: string | null
          customer_id: string | null
          email_thread_id: string | null
          template_id: string | null
          status: string
          error_message: string | null
          sent_to: string[] | null
          variables_used: Json | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rule_id?: string | null
          job_id?: string | null
          customer_id?: string | null
          email_thread_id?: string | null
          template_id?: string | null
          status?: string
          error_message?: string | null
          sent_to?: string[] | null
          variables_used?: Json | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          rule_id?: string | null
          job_id?: string | null
          customer_id?: string | null
          email_thread_id?: string | null
          template_id?: string | null
          status?: string
          error_message?: string | null
          sent_to?: string[] | null
          variables_used?: Json | null
          sent_at?: string | null
          created_at?: string
        }
      }
      custom_variables: {
        Row: {
          id: string
          user_id: string
          key: string
          label: string
          description: string | null
          default_value: string | null
          data_type: string
          format: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          key: string
          label: string
          description?: string | null
          default_value?: string | null
          data_type?: string
          format?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          key?: string
          label?: string
          description?: string | null
          default_value?: string | null
          data_type?: string
          format?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      company_settings: {
        Row: {
          id: string
          user_id: string
          company_name: string | null
          company_email: string | null
          company_phone: string | null
          company_address: string | null
          company_website: string | null
          company_logo_url: string | null
          company_registration_number: string | null
          company_vat_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name?: string | null
          company_email?: string | null
          company_phone?: string | null
          company_address?: string | null
          company_website?: string | null
          company_logo_url?: string | null
          company_registration_number?: string | null
          company_vat_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string | null
          company_email?: string | null
          company_phone?: string | null
          company_address?: string | null
          company_website?: string | null
          company_logo_url?: string | null
          company_registration_number?: string | null
          company_vat_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Helper types for joins
export type JobWithRelations = Database['public']['Tables']['jobs']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row']
  car: Database['public']['Tables']['cars']['Row']
  service: Database['public']['Tables']['services']['Row']
  pipeline_stage: Database['public']['Tables']['pipeline_stages']['Row']
}

export type CustomerWithCars = Database['public']['Tables']['customers']['Row'] & {
  cars: Database['public']['Tables']['cars']['Row'][]
}
