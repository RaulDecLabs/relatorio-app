export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alphaz_google_ads_metrics: {
        Row: {
          campaign_id: string | null
          campaign_name: string
          clicks: number
          client_id: string | null
          conversions: number
          conversions_value: number
          cost: number
          created_at: string
          id: string
          impressions: number
          metric_date: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          campaign_name: string
          clicks?: number
          client_id?: string | null
          conversions?: number
          conversions_value?: number
          cost?: number
          created_at?: string
          id?: string
          impressions?: number
          metric_date: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          campaign_name?: string
          clicks?: number
          client_id?: string | null
          conversions?: number
          conversions_value?: number
          cost?: number
          created_at?: string
          id?: string
          impressions?: number
          metric_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      alphaz_google_analytics_metrics: {
        Row: {
          active_users: number
          average_session_duration: number
          bounce_rate: number
          browser: string | null
          city: string | null
          client_id: string | null
          created_at: string
          device_category: string | null
          engaged_sessions: number
          engagement_rate: number
          events: number
          id: string
          metric_date: string
          page_path: string
          page_views: number
          session_duration: number
          session_manual_source_medium: string | null
          session_medium: string | null
          session_source: string | null
          sessions: number
          total_ad_revenue: number
          total_users: number
          transactions: number
          updated_at: string
        }
        Insert: {
          active_users?: number
          average_session_duration?: number
          bounce_rate?: number
          browser?: string | null
          city?: string | null
          client_id?: string | null
          created_at?: string
          device_category?: string | null
          engaged_sessions?: number
          engagement_rate?: number
          events?: number
          id?: string
          metric_date: string
          page_path: string
          page_views?: number
          session_duration?: number
          session_manual_source_medium?: string | null
          session_medium?: string | null
          session_source?: string | null
          sessions?: number
          total_ad_revenue?: number
          total_users?: number
          transactions?: number
          updated_at?: string
        }
        Update: {
          active_users?: number
          average_session_duration?: number
          bounce_rate?: number
          browser?: string | null
          city?: string | null
          client_id?: string | null
          created_at?: string
          device_category?: string | null
          engaged_sessions?: number
          engagement_rate?: number
          events?: number
          id?: string
          metric_date?: string
          page_path?: string
          page_views?: number
          session_duration?: number
          session_manual_source_medium?: string | null
          session_medium?: string | null
          session_source?: string | null
          sessions?: number
          total_ad_revenue?: number
          total_users?: number
          transactions?: number
          updated_at?: string
        }
        Relationships: []
      }
      alphaz_google_search_console_metrics: {
        Row: {
          clicks: number
          client_id: string | null
          country: string
          created_at: string
          device: string
          id: string
          impressions: number
          metric_date: string
          page: string
          position: number
          query: string
          updated_at: string
        }
        Insert: {
          clicks?: number
          client_id?: string | null
          country?: string
          created_at?: string
          device?: string
          id?: string
          impressions?: number
          metric_date: string
          page?: string
          position?: number
          query?: string
          updated_at?: string
        }
        Update: {
          clicks?: number
          client_id?: string | null
          country?: string
          created_at?: string
          device?: string
          id?: string
          impressions?: number
          metric_date?: string
          page?: string
          position?: number
          query?: string
          updated_at?: string
        }
        Relationships: []
      }
      Dec_google_ads_metrics: {
        Row: {
          campaign_id: string | null
          campaign_name: string
          clicks: number
          client_id: string | null
          conversions: number
          conversions_value: number
          cost: number
          created_at: string
          id: string
          impressions: number
          metric_date: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          campaign_name: string
          clicks?: number
          client_id?: string | null
          conversions?: number
          conversions_value?: number
          cost?: number
          created_at?: string
          id?: string
          impressions?: number
          metric_date: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          campaign_name?: string
          clicks?: number
          client_id?: string | null
          conversions?: number
          conversions_value?: number
          cost?: number
          created_at?: string
          id?: string
          impressions?: number
          metric_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      Dec_google_analytics_metrics: {
        Row: {
          active_users: number
          average_session_duration: number
          bounce_rate: number
          browser: string
          city: string
          client_id: string | null
          created_at: string
          device_category: string
          engaged_sessions: number
          engagement_rate: number
          events: number
          id: string
          metric_date: string
          page_path: string
          page_views: number
          session_duration: number
          session_manual_source_medium: string
          session_medium: string
          session_source: string
          sessions: number
          total_ad_revenue: number
          total_users: number
          transactions: number
          updated_at: string
        }
        Insert: {
          active_users?: number
          average_session_duration?: number
          bounce_rate?: number
          browser: string
          city: string
          client_id?: string | null
          created_at?: string
          device_category: string
          engaged_sessions?: number
          engagement_rate?: number
          events?: number
          id?: string
          metric_date: string
          page_path: string
          page_views?: number
          session_duration?: number
          session_manual_source_medium: string
          session_medium: string
          session_source: string
          sessions?: number
          total_ad_revenue?: number
          total_users?: number
          transactions?: number
          updated_at?: string
        }
        Update: {
          active_users?: number
          average_session_duration?: number
          bounce_rate?: number
          browser?: string
          city?: string
          client_id?: string | null
          created_at?: string
          device_category?: string
          engaged_sessions?: number
          engagement_rate?: number
          events?: number
          id?: string
          metric_date?: string
          page_path?: string
          page_views?: number
          session_duration?: number
          session_manual_source_medium?: string
          session_medium?: string
          session_source?: string
          sessions?: number
          total_ad_revenue?: number
          total_users?: number
          transactions?: number
          updated_at?: string
        }
        Relationships: []
      }
      Dec_google_search_console_metrics: {
        Row: {
          clicks: number
          client_id: string | null
          country: string
          created_at: string
          device: string
          id: string
          impressions: number
          metric_date: string
          page: string
          position: number
          query: string
          updated_at: string
        }
        Insert: {
          clicks?: number
          client_id?: string | null
          country?: string
          created_at?: string
          device?: string
          id?: string
          impressions?: number
          metric_date: string
          page?: string
          position?: number
          query?: string
          updated_at?: string
        }
        Update: {
          clicks?: number
          client_id?: string | null
          country?: string
          created_at?: string
          device?: string
          id?: string
          impressions?: number
          metric_date?: string
          page?: string
          position?: number
          query?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports_config: {
        Row: {
          ads_table_name: string | null
          created_at: string
          fb_ads_table_name: string | null
          ga4_property_id: string | null
          google_ads_id: string | null
          meta_ads_id: string | null
          gsc_url: string | null
          gsc_table_name: string | null
          rd_table_name: string | null
          rd_public_token: string | null
          rd_private_token: string | null
          rd_client_id: string | null
          rd_client_secret: string | null
          rd_access_token: string | null
          rd_refresh_token: string | null
          nectar_api_token: string | null
          id: string
          name: string
          table_name: string
        }
        Insert: {
          ads_table_name?: string | null
          created_at?: string
          fb_ads_table_name?: string | null
          ga4_property_id?: string | null
          google_ads_id?: string | null
          meta_ads_id?: string | null
          gsc_url?: string | null
          gsc_table_name?: string | null
          rd_table_name?: string | null
          rd_public_token?: string | null
          rd_private_token?: string | null
          rd_client_id?: string | null
          rd_client_secret?: string | null
          rd_access_token?: string | null
          rd_refresh_token?: string | null
          nectar_api_token?: string | null
          id?: string
          name: string
          table_name: string
        }
        Update: {
          ads_table_name?: string | null
          created_at?: string
          fb_ads_table_name?: string | null
          ga4_property_id?: string | null
          google_ads_id?: string | null
          meta_ads_id?: string | null
          gsc_url?: string | null
          gsc_table_name?: string | null
          rd_table_name?: string | null
          rd_public_token?: string | null
          rd_private_token?: string | null
          rd_client_id?: string | null
          rd_client_secret?: string | null
          rd_access_token?: string | null
          rd_refresh_token?: string | null
          nectar_api_token?: string | null
          id?: string
          name?: string
          table_name?: string
        }
        Relationships: []
      }
      executive_summaries: {
        Row: {
          id: string
          report_id: string | null
          created_at: string
          period_start: string | null
          period_end: string | null
          summary_data: Json | null
        }
        Insert: {
          id?: string
          report_id?: string | null
          created_at?: string
          period_start?: string | null
          period_end?: string | null
          summary_data?: Json | null
        }
        Update: {
          id?: string
          report_id?: string | null
          created_at?: string
          period_start?: string | null
          period_end?: string | null
          summary_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_summaries_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports_config"
            referencedColumns: ["id"]
          },
        ]
      }
      nectar_deals: {
        Row: {
          id: string
          report_id: string
          deal_id: string
          deal_name: string | null
          funnel_name: string | null
          stage_name: string | null
          value: number | null
          status: string | null
          created_at: string | null
          updated_at: string | null
          closed_at: string | null
          origin_name: string | null
          owner_name: string | null
          loss_reason: string | null
          product_names: string | null
          payload: Json | null
        }
        Insert: {
          id?: string
          report_id: string
          deal_id: string
          deal_name?: string | null
          funnel_name?: string | null
          stage_name?: string | null
          value?: number | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          closed_at?: string | null
          origin_name?: string | null
          owner_name?: string | null
          loss_reason?: string | null
          product_names?: string | null
          payload?: Json | null
        }
        Update: {
          id?: string
          report_id?: string
          deal_id?: string
          deal_name?: string | null
          funnel_name?: string | null
          stage_name?: string | null
          value?: number | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          closed_at?: string | null
          origin_name?: string | null
          owner_name?: string | null
          loss_reason?: string | null
          product_names?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nectar_deals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports_config"
            referencedColumns: ["id"]
          },
        ]
      }
      reports_sheets_config: {
        Row: {
          client_name: string | null
          created_at: string | null
          google_sheets_url: string
          id: string
          report_id: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          google_sheets_url: string
          id?: string
          report_id: string
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          google_sheets_url?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_sheets_config_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports_config"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          analysis_period: string | null
          created_at: string
          id: string
          insight_text: string
          report_id: string
        }
        Insert: {
          analysis_period?: string | null
          created_at?: string
          id?: string
          insight_text: string
          report_id: string
        }
        Update: {
          analysis_period?: string | null
          created_at?: string
          id?: string
          insight_text?: string
          report_id?: string
        }
        Relationships: []
      }
      ingest_logs: {
        Row: {
          client_id: string
          completed_at: string | null
          error: string | null
          id: string
          rows_received: number
          rows_upserted: number
          source: string
          started_at: string
          status: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          error?: string | null
          id?: string
          rows_received?: number
          rows_upserted?: number
          source: string
          started_at?: string
          status?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          error?: string | null
          id?: string
          rows_received?: number
          rows_upserted?: number
          source?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_sync_at: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          notes: string | null
          plan: string | null
          segment: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          plan?: string | null
          segment?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          plan?: string | null
          segment?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          item_order: number
          phase: string
          phase_order: number
          status: "todo" | "doing" | "done"
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_order?: number
          phase: string
          phase_order?: number
          status?: "todo" | "doing" | "done"
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_order?: number
          phase?: string
          phase_order?: number
          status?: "todo" | "doing" | "done"
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_dynamic_ads_table: {
        Args: { p_table_name: string }
        Returns: undefined
      }
      create_dynamic_fb_ads_table: {
        Args: { p_table_name: string }
        Returns: undefined
      }
      create_dynamic_gsc_table: {
        Args: { p_table_name: string }
        Returns: undefined
      }
      create_dynamic_table: {
        Args: { p_table_name: string }
        Returns: undefined
      }
      get_existing_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      get_shared_client_details: {
        Args: { p_share_token: string }
        Returns: {
          company_name: string
          logo_url: string
          primary_color: string
          secondary_color: string
          website: string
        }[]
      }
      get_shared_metrics: {
        Args: { p_share_token: string }
        Returns: {
          dimensions: Json
          entity_id: string
          entity_name: string
          metric_date: string
          metrics: Json
          scope: string
          source: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
