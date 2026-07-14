-- Add ga4_property_id column to reports_config to store GA4 IDs dynamically
ALTER TABLE public.reports_config ADD COLUMN IF NOT EXISTS ga4_property_id TEXT;
