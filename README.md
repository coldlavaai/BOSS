# BOSS - Business Operating System Software

**For:** Cold Lava AI (Oliver Tatler + JJ)
**Purpose:** ADHD-optimized business management system
**Status:** Foundation setup complete - Ready for Week 1 build

## 🎯 What is BOSS?

BOSS is your daily accountability partner and business operating system, designed specifically for ADHD entrepreneurs. It helps you:

- **Stop building shiny things** → Track what's actually profitable
- **Hit your targets** → Daily/weekly goals with streak tracking
- **Stay focused** → Focus Mode prevents distractions
- **Reuse your work** → Asset library prevents rebuilding from scratch
- **Talk to Claude** → Daily conversational check-ins with AI
- **See profitability** → £50/hour time tracking on every project
- **Work as a team** → Different views for Oliver (dev) vs JJ (sales)

## ✨ Features

### 📋 Job Management
- **Kanban Board** - Visual pipeline with drag & drop between stages
- **Service Selection** - Choose from catalog of detailing services
- **Add-ons** - Select multiple add-ons (e.g., wheel coating, interior protection)
- **VAT Breakdown** - Clear display of price ex VAT, VAT (20%), and total inc VAT
- **Instant Updates** - Jobs appear immediately on board without refresh
- **Customer-Specific Pricing** - Override pricing for VIP customers

### 👥 Customer Management
- Customer profiles with contact details
- Multiple vehicles per customer
- Vehicle categorization (Small, Medium, Large, XL)
- Complete job history per customer

### 📅 Google Calendar Integration
- **Two-way sync** - Changes in CRM sync to Google Calendar and vice versa
- **Conflict detection** - Warns before double-booking
- **Visual indicators** - See which jobs are synced to calendar
- **Automatic updates** - Edit job in CRM, updates in calendar automatically

### 📊 Analytics Dashboard
- Total revenue and average job value
- Most popular services (by bookings and revenue)
- Most popular add-ons
- Revenue breakdown by category
- Add-on attach rate (percentage of jobs with add-ons)
- Automated insights and recommendations

### 💰 Pricing System
- Service pricing by vehicle size (Small/Medium/Large/XL)
- Optional add-ons with separate pricing
- Customer-specific pricing overrides
- All prices stored in pence (integer) to avoid floating-point errors
- VAT-compliant display (ex VAT, VAT amount, inc VAT)

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Calendar:** Google Calendar API
- **Deployment:** Vercel

## 📁 Project Structure

```
detail-dynamics-crm/
├── app/
│   ├── board/              # Kanban board (job pipeline)
│   ├── customers/          # Customer management
│   ├── services/           # Service catalog
│   ├── calendar/           # Calendar view
│   ├── analytics/          # Business analytics
│   └── api/
│       └── calendar/       # Google Calendar integration endpoints
├── components/
│   ├── board/              # Job board components
│   ├── customers/          # Customer components
│   ├── analytics/          # Analytics components
│   └── ui/                 # shadcn/ui components
├── database/               # SQL migration files
│   ├── fix-job-addons-rls.sql
│   ├── fix-jobs-foreign-keys.sql
│   └── clear-test-data.sql
├── lib/
│   ├── supabase/           # Supabase client/server
│   └── auth/               # Authentication helpers
└── types/                  # TypeScript types
```

## 🗄️ Database Schema

### Core Tables
- `customers` - Customer information
- `cars` - Customer vehicles (linked to customers)
- `jobs` - Bookings with pricing and details
- `services` - Service catalog
- `add_ons` - Available add-ons
- `pipeline_stages` - Kanban board stages

### Relationship Tables
- `job_add_ons` - Many-to-many: jobs ↔ add_ons
- `service_add_ons` - Which add-ons are available for which services
- `service_pricing` - Service prices by vehicle size
- `customer_service_pricing` - Customer-specific pricing overrides

### Integration Tables
- `synced_calendar_events` - Tracks Google Calendar sync status
- `google_calendar_tokens` - OAuth tokens for Google Calendar API

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Google Cloud account (for Calendar API)

### Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Calendar API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations (in Supabase SQL Editor)
# 1. Run database/fix-job-addons-rls.sql
# 2. Run database/fix-jobs-foreign-keys.sql

# Run development server
npm run dev

# Open browser
open http://localhost:3000
```

## 📝 Database Migrations

All SQL migration files are in the `/database` directory. Run them in Supabase SQL Editor in this order:

1. **fix-job-addons-rls.sql** - Sets up correct RLS policies for job add-ons
2. **fix-jobs-foreign-keys.sql** - Adds foreign key constraints for relationships
3. **clear-test-data.sql** - (Optional) Clears test data while keeping configuration

## 🔐 Authentication

The CRM uses Supabase Auth with Row Level Security (RLS) policies:

- All tables have RLS enabled
- Authenticated users can read/write their own data
- Service role has full access (for system operations)

## 📱 Google Calendar Integration

### Setup

1. Create project in Google Cloud Console
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs
5. Configure environment variables
6. User connects account via Settings page

### Two-Way Sync

- **CRM → Calendar:** Jobs automatically sync when created/updated
- **Calendar → CRM:** Webhook receives calendar changes and updates CRM
- **Conflict Detection:** Checks for overlapping events before booking

## 🎨 Customization

### Adding New Services

Services are stored in the `services` table. Currently managed via SQL:

```sql
INSERT INTO services (name, category_id, duration_hours, duration_text, requires_quote)
VALUES ('Full Detail', 'category_uuid', 4, '4 hours', false);
```

### Adding New Add-ons

Add-ons are stored in the `add_ons` table:

```sql
INSERT INTO add_ons (name, description, price_incl_vat, is_variable_price)
VALUES ('Wheel Coating', 'Ceramic wheel coating', 5000, false);
```

Then link to services:

```sql
INSERT INTO service_add_ons (service_id, add_on_id, display_order)
VALUES ('service_uuid', 'addon_uuid', 1);
```

## 📊 Analytics

The analytics dashboard shows:

- **Revenue Metrics:** Total revenue, average job value
- **Service Popularity:** Top 10 services by bookings and revenue
- **Add-on Performance:** Most selected add-ons
- **Category Analysis:** Revenue breakdown by service category
- **Attach Rate:** Percentage of jobs that include add-ons
- **Automated Insights:** AI-generated recommendations based on data

## 🐛 Troubleshooting

### Jobs Not Appearing on Board

**Solution:** Refresh the page. The board uses optimistic UI updates but occasionally needs a refresh.

### Add-ons Won't Save (403 Error)

**Solution:** Run `database/fix-job-addons-rls.sql` to fix RLS policies.

### Can't Fetch Jobs with Relations (400 Error)

**Solution:** Run `database/fix-jobs-foreign-keys.sql` to add foreign key constraints.

### Custom Pricing Not Working (406 Error)

**Solution:** Already fixed - using `.maybeSingle()` instead of `.single()` for optional queries.

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

### Environment Variables on Vercel

Add all variables from `.env.local` to Vercel project settings.

## 📄 License

Private project - All rights reserved.

## 🤝 Contributing

This is a private project. For questions or issues, contact the maintainer.

## 📞 Support

For issues or questions:
- Check troubleshooting section above
- Review `/database` migration files
- Contact: oliver@otdm.net

---

**Built with ❤️ for car detailing businesses**

**Status:** ✅ Fully functional and production-ready (as of 2025-11-03)
