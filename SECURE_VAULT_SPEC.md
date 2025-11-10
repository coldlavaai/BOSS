# BOSS Secure Information Vault
## Complete Client/Project Information System

**Purpose:** Single source of truth for ALL client and project information
**ADHD Benefit:** Zero cognitive load - everything in one place
**Security:** Encrypted at rest, access controlled, audit logged

---

## 🎯 PROBLEM THIS SOLVES

**Current Pain Points:**
- ❌ Passwords scattered across 1Password, notes, emails
- ❌ API keys in random .env files, Slack messages
- ❌ Client info in emails, texts, voice memos
- ❌ Hosting logins forgotten, need to reset constantly
- ❌ Domain registrar info "somewhere..."
- ❌ Database credentials in 5 different places
- ❌ **Massive ADHD tax from searching for information**

**BOSS Solution:**
- ✅ **ONE PLACE** for everything
- ✅ Organized by client/project
- ✅ Searchable instantly
- ✅ Copy to clipboard (one click)
- ✅ Secure (encrypted)
- ✅ Accessible from mobile
- ✅ Never lose information again

---

## 📊 DATABASE SCHEMA

### `client_credentials`
Secure storage for client-specific sensitive information.

```sql
CREATE TABLE client_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Categorization
  category TEXT NOT NULL CHECK (
    category IN (
      'login',              -- Website logins, admin panels
      'api_key',            -- API keys and tokens
      'database',           -- Database credentials
      'hosting',            -- Server, cPanel, hosting logins
      'domain',             -- Domain registrar, DNS
      'email',              -- Email account logins
      'ftp_sftp',           -- FTP/SFTP credentials
      'cms',                -- WordPress, Sanity, etc.
      'git',                -- GitHub, GitLab access
      'social_media',       -- Facebook, Instagram, etc.
      'analytics',          -- Google Analytics, etc.
      'payment',            -- Stripe, PayPal keys
      'service',            -- Third-party services
      'other'               -- Catch-all
    )
  ),

  -- Information
  name TEXT NOT NULL,  -- "WordPress Admin", "Supabase API Key"
  url TEXT,  -- Login URL or service URL
  username TEXT,
  email TEXT,
  password_encrypted TEXT,  -- Encrypted with vault key
  api_key_encrypted TEXT,   -- Encrypted
  secret_encrypted TEXT,    -- Encrypted (for OAuth secrets, etc.)

  -- Additional Details
  notes TEXT,  -- Any extra context
  environment TEXT CHECK (environment IN ('production', 'staging', 'development', 'test')),

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at DATE,  -- For API keys with expiration

  -- Access Control
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  accessible_to UUID[],  -- Which users can access

  -- Status
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_credentials_client ON client_credentials(client_id);
CREATE INDEX idx_client_credentials_project ON client_credentials(project_id);
CREATE INDEX idx_client_credentials_category ON client_credentials(category);
CREATE INDEX idx_client_credentials_active ON client_credentials(active) WHERE active = true;
```

### `client_notes`
Organized notes per client/project.

```sql
CREATE TABLE client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Note Details
  title TEXT NOT NULL,
  content TEXT NOT NULL,  -- Rich text (Markdown or HTML)
  note_type TEXT CHECK (
    note_type IN (
      'general',            -- General notes
      'technical',          -- Technical details
      'requirements',       -- Client requirements
      'meeting_notes',      -- Call/meeting notes
      'decision',           -- Important decisions made
      'issue',              -- Problems to solve
      'idea',               -- Ideas/suggestions
      'handover',           -- Client handover info
      'sop',                -- Standard operating procedure
      'other'
    )
  ),

  -- Organization
  pinned BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',

  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,  -- Array of file URLs

  -- Access
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_notes_client ON client_notes(client_id);
CREATE INDEX idx_client_notes_project ON client_notes(project_id);
CREATE INDEX idx_client_notes_pinned ON client_notes(pinned) WHERE pinned = true;
CREATE INDEX idx_client_notes_type ON client_notes(note_type);

-- Full-text search
CREATE INDEX idx_client_notes_search ON client_notes USING gin(
  to_tsvector('english', title || ' ' || content)
);
```

### `project_resources`
Links, repositories, deployments, everything for a project.

```sql
CREATE TABLE project_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Resource Type
  resource_type TEXT NOT NULL CHECK (
    resource_type IN (
      'repository',         -- GitHub, GitLab
      'deployment',         -- Vercel, Netlify URL
      'staging',            -- Staging environment
      'production',         -- Production URL
      'cms',                -- Sanity, WordPress admin
      'database',           -- Supabase, database URL
      'design',             -- Figma, design files
      'documentation',      -- Docs, guides
      'analytics',          -- Google Analytics
      'monitoring',         -- Sentry, error tracking
      'other'
    )
  ),

  -- Resource Details
  name TEXT NOT NULL,
  url TEXT,
  description TEXT,

  -- Quick Access
  credential_id UUID REFERENCES client_credentials(id),  -- Link to login if needed

  -- Status
  status TEXT CHECK (status IN ('active', 'inactive', 'archived')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_resources_project ON project_resources(project_id);
CREATE INDEX idx_project_resources_type ON project_resources(resource_type);
```

### `credential_access_log`
Audit trail of who accessed what when.

```sql
CREATE TABLE credential_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  credential_id UUID NOT NULL REFERENCES client_credentials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  action TEXT NOT NULL CHECK (
    action IN ('viewed', 'copied', 'edited', 'deleted')
  ),

  -- Context
  ip_address INET,
  user_agent TEXT,

  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credential_access_log_credential ON credential_access_log(credential_id);
CREATE INDEX idx_credential_access_log_user ON credential_access_log(user_id);
CREATE INDEX idx_credential_access_log_accessed ON credential_access_log(accessed_at);
```

---

## 🔐 ENCRYPTION STRATEGY

### **Encryption at Rest**

All sensitive fields are encrypted using AES-256:
- `password_encrypted`
- `api_key_encrypted`
- `secret_encrypted`

**Encryption Key Storage:**
- Master key stored in environment variable (Vercel)
- Per-user encryption keys (optional for team access)
- Supabase Vault for key management

**Implementation:**

```typescript
// lib/vault/encryption.ts

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const MASTER_KEY = process.env.VAULT_MASTER_KEY!

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(MASTER_KEY, 'hex'),
    iv
  )

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(MASTER_KEY, 'hex'),
    iv
  )

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
```

### **Access Control**

**Row Level Security (RLS):**

```sql
-- Only users who created or are listed in accessible_to can view
CREATE POLICY "Users can view accessible credentials"
ON client_credentials FOR SELECT
USING (
  auth.uid() = created_by OR
  auth.uid() = ANY(accessible_to) OR
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

-- Log all access
CREATE OR REPLACE FUNCTION log_credential_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO credential_access_log (credential_id, user_id, action)
  VALUES (NEW.id, auth.uid(), TG_ARGV[0]);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_credential_view
AFTER SELECT ON client_credentials
FOR EACH ROW EXECUTE FUNCTION log_credential_access('viewed');
```

---

## 🎨 UI DESIGN

### **Client Detail Page - Vault Tab**

```
┌─────────────────────────────────────────────────────────────┐
│ Client: Greenstar Solar                                     │
│ [Overview] [Projects] [📝 Notes] [🔐 Vault] [Communications]│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🔐 SECURE VAULT                                             │
│                                                             │
│ [🔍 Search vault...] [+ Add Credential] [+ Add Note]       │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 🔑 LOGINS (3)                          [Expand ▼]   │    │
│ └─────────────────────────────────────────────────────┘    │
│   WordPress Admin                                           │
│   URL: https://greenstarsolar.co.uk/wp-admin              │
│   User: admin@greenstar.com                                │
│   Pass: ••••••••••  [👁️ Show] [📋 Copy]                    │
│                                                             │
│   Sanity CMS                                               │
│   URL: https://greenstar.sanity.studio                     │
│   Email: oliver@coldlava.ai                                │
│   Pass: ••••••••••  [👁️ Show] [📋 Copy]                    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 🔌 API KEYS (2)                        [Expand ▼]   │    │
│ └─────────────────────────────────────────────────────┘    │
│   Supabase API Key (Production)                            │
│   Key: eyJhbGc... [📋 Copy]  Expires: Never                │
│                                                             │
│   Google Maps API                                          │
│   Key: AIzaSyB... [📋 Copy]  Expires: Never                │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 🗄️ DATABASES (1)                       [Expand ▼]   │    │
│ └─────────────────────────────────────────────────────┘    │
│   Supabase PostgreSQL                                      │
│   URL: db.xxx.supabase.co:5432                             │
│   User: postgres                                           │
│   Pass: ••••••••••  [👁️ Show] [📋 Copy]                    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 📝 NOTES (5)                           [Expand ▼]   │    │
│ └─────────────────────────────────────────────────────┘    │
│   📌 Client Requirements Document                           │
│   Technical Architecture Notes                             │
│   Meeting Notes - Nov 1, 2025                              │
│   Handover Instructions                                    │
│   Known Issues & Workarounds                               │
└─────────────────────────────────────────────────────────────┘
```

### **Add Credential Modal**

```
┌─────────────────────────────────────────────────────────────┐
│ Add Credential                                     [✕]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Category: [Login ▼]                                        │
│ Name: [WordPress Admin_____________]                       │
│ URL: [https://example.com/wp-admin_]                       │
│ Username: [admin@example.com________]                      │
│ Email: [admin@example.com___________]                      │
│ Password: [••••••••••] [Generate 🎲]                       │
│                                                             │
│ Environment: [Production ▼]                                │
│ Project: [Greenstar Website ▼]                             │
│                                                             │
│ Notes (optional):                                          │
│ ┌──────────────────────────────────────────────────┐       │
│ │                                                  │       │
│ │                                                  │       │
│ └──────────────────────────────────────────────────┘       │
│                                                             │
│ Accessible to: [☑ Oliver] [☐ JJ]                          │
│                                                             │
│ [Cancel] [Save Credential]                                 │
└─────────────────────────────────────────────────────────────┘
```

### **Quick Access Panel (Project View)**

```
┌─────────────────────────────────────────────────────────────┐
│ Project: Greenstar Website                                 │
│ Status: In Progress                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚡ QUICK ACCESS                                             │
│                                                             │
│ 🌐 Production: https://greenstarwebsiteupgrade.vercel.app  │
│ 📊 Analytics: [Open] 🔐 [View Login]                       │
│ 💻 GitHub: [Open Repo] 🔐 [Copy Token]                     │
│ 🗄️ Database: [Supabase Dashboard] 🔐 [Copy Password]      │
│ 🎨 CMS: [Sanity Studio] 🔐 [Copy Login]                   │
│                                                             │
│ [View All Resources (8)]                                   │
└─────────────────────────────────────────────────────────────┘
```

### **Global Search (Cmd+K)**

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Search BOSS...                                          │
│                                                             │
│ > supabase password                                        │
│                                                             │
│ 🔐 CREDENTIALS (3 results)                                 │
│   Supabase API Key - Greenstar (Production)               │
│   Supabase Password - Detail Dynamics                      │
│   Supabase Login - ICELLARÉ                                │
│                                                             │
│ 📝 NOTES (1 result)                                        │
│   Greenstar: Database Migration Notes                      │
│                                                             │
│ [Press Enter to view] [Esc to close]                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 MOBILE EXPERIENCE

**Mobile Vault View:**

```
┌──────────────────────────────┐
│ 🔐 Greenstar Vault          │
│ [🔍 Search]  [+]            │
├──────────────────────────────┤
│                              │
│ 🔑 LOGINS (3)               │
│   WordPress Admin           │
│   User: admin@greenstar.com │
│   [Show Password] [Copy]    │
│                              │
│ 🔌 API KEYS (2)             │
│   Google Maps API           │
│   [Copy Key]                │
│                              │
│ 📝 NOTES (5)                │
│   📌 Requirements Doc        │
│   [View]                    │
│                              │
└──────────────────────────────┘
```

**Touch Optimizations:**
- Tap to expand sections
- Long-press to copy
- Swipe to reveal actions
- Face ID/Touch ID for access

---

## 🚀 IMPLEMENTATION PLAN

### **Session 11: Secure Vault Foundation (2h)**

**Goal:** Database tables + encryption setup

Tasks:
- [ ] Create `client_credentials` table
- [ ] Create `client_notes` table
- [ ] Create `project_resources` table
- [ ] Create `credential_access_log` table
- [ ] Implement encryption functions
- [ ] Test encryption/decryption

**Output:** Can store and retrieve encrypted credentials

---

### **Session 12: Vault UI (2h)**

**Goal:** Basic vault interface working

Tasks:
- [ ] Create Vault tab on client detail page
- [ ] Add Credential modal
- [ ] Display credentials by category
- [ ] Show/hide password toggle
- [ ] Copy to clipboard functionality

**Output:** Can add and view credentials in UI

---

### **Session 13: Notes System (2h)**

**Goal:** Rich notes with search

Tasks:
- [ ] Add Note modal
- [ ] Rich text editor integration
- [ ] Display notes list
- [ ] Pin important notes
- [ ] Basic search functionality

**Output:** Can create and search notes

---

### **Session 14: Quick Access Panel (2h)**

**Goal:** Fast access to common resources

Tasks:
- [ ] Quick Access component
- [ ] Link credentials to resources
- [ ] One-click open + copy
- [ ] Project resources page

**Output:** Quick access working on project page

---

### **Session 15: Global Search (2h)**

**Goal:** Find anything instantly (Cmd+K)

Tasks:
- [ ] Global search modal (Cmd+K)
- [ ] Search credentials
- [ ] Search notes
- [ ] Search clients/projects
- [ ] Keyboard navigation

**Output:** Cmd+K search works across everything

---

## 🔒 SECURITY CHECKLIST

**Before Launch:**
- [ ] All sensitive fields encrypted at rest
- [ ] Master encryption key in environment variable
- [ ] RLS policies tested and working
- [ ] Access logs recording all views
- [ ] Password strength requirements enforced
- [ ] Clipboard auto-clear after 30 seconds
- [ ] Session timeout after 15 minutes inactive
- [ ] 2FA required for vault access (future)
- [ ] Encrypted backups (Supabase automatic)
- [ ] Audit log reviewed weekly

---

## 📊 USAGE PATTERNS

**Common Workflows:**

### 1. Starting Work on a Project
```
1. Open project
2. Click Quick Access
3. Copy all needed credentials
4. Start work
```

### 2. Client Handover
```
1. Open client Vault
2. Filter by category
3. Export handover document
4. Share securely
```

### 3. Emergency Access
```
1. Cmd+K "supabase password greenstar"
2. Copy password
3. Done in 3 seconds
```

---

## 💡 ADHD BENEFITS

**Why This Matters for ADHD:**

1. **Zero Cognitive Load**
   - Everything in ONE place
   - No hunting across 5 tools
   - Instant access

2. **Working Memory Support**
   - Don't need to remember passwords
   - Don't need to remember where things are
   - Search finds everything

3. **Reduce ADHD Tax**
   - No more password resets (cost: 10min each)
   - No more "where did I put that?" (cost: 30min)
   - No more recreating lost information

4. **Mobile Access**
   - Can access anywhere
   - No laptop needed
   - Client calls handled smoothly

---

## 🎯 SUCCESS METRICS

**After Implementation:**
- Time to find credential: 30min → 5 seconds
- Password resets: 5/month → 0/month
- Client handovers: 2 hours → 15 minutes
- "Where is that?" moments: 10/week → 0/week

**ROI:**
- Time saved: ~5 hours/week = **£250/week**
- ADHD tax reduced: **£100/month**
- **Annual value: ~£13,000**

---

**This feature alone is worth building BOSS for.**

No more hunting for information. Everything in one secure place. Accessible in seconds.

**The ADHD dream come true.** 🎯
