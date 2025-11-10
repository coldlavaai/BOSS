-- BOSS (Business Operating System Software) - Initial Schema
-- Session 1: Core Tables Setup
-- Created: 2025-11-10

-- ==============================================
-- TABLE: clients
-- Purpose: Track clients through sales pipeline
-- ==============================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Basic Info
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,

    -- Pipeline Stage
    pipeline_stage TEXT NOT NULL DEFAULT 'lead' CHECK (pipeline_stage IN (
        'lead',           -- Initial contact
        'qualified',      -- Qualified opportunity
        'proposal',       -- Proposal sent
        'negotiation',    -- In negotiation
        'won',            -- Client won
        'lost',           -- Opportunity lost
        'active',         -- Active client
        'inactive'        -- Inactive client
    )),

    -- Pipeline Value
    pipeline_value_gbp INTEGER, -- Value in pence (£1 = 100 pence)

    -- Dates
    first_contact_date DATE,
    won_date DATE,
    last_contact_date DATE,

    -- Notes
    notes TEXT,
    lost_reason TEXT,

    -- Tags & Categories
    tags TEXT[], -- Array of tags for categorization
    source TEXT, -- Where did they come from? (referral, website, cold outreach, etc.)

    -- Owner (for multi-user)
    owner_user_id UUID -- References auth.users(id)
);

-- ==============================================
-- TABLE: projects
-- Purpose: Track work/projects with profitability
-- ==============================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Basic Info
    name TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    description TEXT,

    -- Product Type (will link to products table in Session 6)
    product_type TEXT, -- e.g., "Website CMS", "DBR", "Chat Agent", "Consulting"

    -- Status
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN (
        'planning',       -- Planning phase
        'in_progress',    -- Actively working
        'blocked',        -- Blocked by client or external factor
        'review',         -- Ready for review
        'completed',      -- Completed
        'cancelled'       -- Cancelled
    )),

    -- Budget & Profitability (all in pence)
    quoted_price_gbp INTEGER, -- What we quoted (in pence)
    hours_budgeted DECIMAL(10, 2), -- How many hours we budgeted
    hours_logged DECIMAL(10, 2) DEFAULT 0, -- Actual hours logged
    hourly_rate_gbp INTEGER DEFAULT 5000, -- £50/hour = 5000 pence

    -- Calculated Fields (updated by triggers)
    budget_status TEXT, -- '🟢 Under Budget', '🟡 At Risk', '🔴 Over Budget'
    profitability_score INTEGER, -- 0-100 score

    -- Dates
    start_date DATE,
    deadline DATE,
    completed_date DATE,

    -- Priority (for daily check-ins)
    is_priority BOOLEAN DEFAULT false,
    priority_order INTEGER, -- 1, 2, 3 for today's priorities

    -- Notes
    notes TEXT,

    -- Owner (for multi-user)
    owner_user_id UUID -- References auth.users(id)
);

-- ==============================================
-- TABLE: time_entries
-- Purpose: Log time spent on projects & activities
-- ==============================================

CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Link to project (optional - can log general time)
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

    -- User who logged time
    user_id UUID NOT NULL, -- References auth.users(id)

    -- Time Details
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours DECIMAL(10, 2) NOT NULL,
    description TEXT,

    -- Activity Type (ADHD-specific tracking)
    activity_type TEXT NOT NULL DEFAULT 'productive' CHECK (activity_type IN (
        'productive',      -- Planned work
        'shiny_object',    -- Unplanned distraction/new idea
        'admin',           -- Administrative work
        'learning',        -- Learning/research
        'meeting',         -- Client meeting/call
        'planning',        -- Planning/strategy
        'blocked'          -- Time blocked/waiting
    )),

    -- Billable?
    is_billable BOOLEAN DEFAULT true,

    -- Tags
    tags TEXT[]
);

-- ==============================================
-- INDEXES for Performance
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_clients_pipeline_stage ON clients(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_clients_owner ON clients(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(is_priority, priority_order);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Clients: Users can see all clients (for team collaboration)
CREATE POLICY "Users can view all clients"
    ON clients FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert clients"
    ON clients FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update clients"
    ON clients FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete clients"
    ON clients FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Projects: Users can see all projects (for team collaboration)
CREATE POLICY "Users can view all projects"
    ON projects FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update projects"
    ON projects FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete projects"
    ON projects FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Time Entries: Users can see their own + all team time (for transparency)
CREATE POLICY "Users can view all time entries"
    ON time_entries FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own time entries"
    ON time_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries"
    ON time_entries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time entries"
    ON time_entries FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================
-- FUNCTIONS & TRIGGERS
-- ==============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for clients
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for projects
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update project hours_logged
CREATE OR REPLACE FUNCTION update_project_hours()
RETURNS TRIGGER AS $$
DECLARE
    target_project_id UUID;
BEGIN
    -- Determine which project to update
    IF TG_OP = 'DELETE' THEN
        target_project_id := OLD.project_id;
    ELSE
        target_project_id := NEW.project_id;
    END IF;

    -- Skip if no project_id
    IF target_project_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Recalculate hours_logged for the project
    UPDATE projects
    SET hours_logged = (
        SELECT COALESCE(SUM(hours), 0)
        FROM time_entries
        WHERE project_id = target_project_id
    )
    WHERE id = target_project_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger to update project hours when time entry changes
CREATE TRIGGER update_project_hours_on_time_entry
    AFTER INSERT OR UPDATE OR DELETE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_project_hours();

-- ==============================================
-- INITIAL DATA
-- ==============================================

-- Add Cold Lava team members (will be added via Auth later)
-- This is just for reference

-- Migration Complete!
-- Next: Run this in Supabase SQL Editor
-- Then: Test connection from Next.js
