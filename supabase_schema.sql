-- Helix Support - Supabase Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create the tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create index for fast status filtering and date ordering
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_session_id ON public.tickets (session_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 4. Create policies (allowing backend service / anon access with service role or anon key)
CREATE POLICY "Allow all operations for service and authenticated roles" 
ON public.tickets 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Done! Your tickets table is ready for Helix Support.
