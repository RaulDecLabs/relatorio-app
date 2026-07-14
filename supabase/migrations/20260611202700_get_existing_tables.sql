-- Function to return list of existing tables in the public schema
CREATE OR REPLACE FUNCTION public.get_existing_tables()
RETURNS TABLE (table_name TEXT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    -- Exclude reports_config and standard postgis or spatial tables if any
    AND t.table_name NOT IN ('reports_config', 'spatial_ref_sys')
  ORDER BY t.table_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_existing_tables() TO authenticated;
