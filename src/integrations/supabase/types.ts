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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      allowed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
          summary: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
          summary: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
          summary?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          body: string | null
          created_at: string
          error: string | null
          hackathon_id: string | null
          id: string
          kind: string
          provider_id: string | null
          recipient: string
          recipient_name: string | null
          sent_by: string | null
          status: string
          subject: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          error?: string | null
          hackathon_id?: string | null
          id?: string
          kind?: string
          provider_id?: string | null
          recipient: string
          recipient_name?: string | null
          sent_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          body?: string | null
          created_at?: string
          error?: string | null
          hackathon_id?: string | null
          id?: string
          kind?: string
          provider_id?: string | null
          recipient?: string
          recipient_name?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      code_snippets: {
        Row: {
          category: string
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          language: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          language?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          language?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hackathon_results: {
        Row: {
          attended: boolean
          certificate_url: string | null
          created_at: string
          hackathon_id: string
          id: string
          placement: number | null
          points: number
          user_id: string
        }
        Insert: {
          attended?: boolean
          certificate_url?: string | null
          created_at?: string
          hackathon_id: string
          id?: string
          placement?: number | null
          points?: number
          user_id: string
        }
        Update: {
          attended?: boolean
          certificate_url?: string | null
          created_at?: string
          hackathon_id?: string
          id?: string
          placement?: number | null
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_results_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathons: {
        Row: {
          banner_url: string | null
          certificate_mode: string
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          mode: string
          registration_deadline: string | null
          registration_open: boolean
          start_time: string | null
          team_max: number
          team_min: number
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          banner_url?: string | null
          certificate_mode?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          mode?: string
          registration_deadline?: string | null
          registration_open?: boolean
          start_time?: string | null
          team_max?: number
          team_min?: number
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          banner_url?: string | null
          certificate_mode?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          mode?: string
          registration_deadline?: string | null
          registration_open?: boolean
          start_time?: string | null
          team_max?: number
          team_min?: number
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          from_admin: boolean
          id: string
          sender_id: string
          student_id: string
        }
        Insert: {
          body: string
          created_at?: string
          from_admin?: boolean
          id?: string
          sender_id: string
          student_id: string
        }
        Update: {
          body?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          sender_id?: string
          student_id?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          kind: string
          link: string | null
          options: Json
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          kind?: string
          link?: string | null
          options?: Json
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          kind?: string
          link?: string | null
          options?: Json
          title?: string
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          notice_id: string
          option_index: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notice_id: string
          option_index: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notice_id?: string
          option_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          batch: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          personal_email: string | null
          photo_url: string | null
          profile_completed: boolean
          registration_number: string | null
          resume_url: string | null
          updated_at: string
          year: string | null
        }
        Insert: {
          batch?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          personal_email?: string | null
          photo_url?: string | null
          profile_completed?: boolean
          registration_number?: string | null
          resume_url?: string | null
          updated_at?: string
          year?: string | null
        }
        Update: {
          batch?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          personal_email?: string | null
          photo_url?: string | null
          profile_completed?: boolean
          registration_number?: string | null
          resume_url?: string | null
          updated_at?: string
          year?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string
          hackathon_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hackathon_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hackathon_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          status: string
          title: string
          url: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      squad_members: {
        Row: {
          created_at: string
          id: string
          squad_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          squad_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          squad_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          created_at: string
          hackathon_id: string
          id: string
          leader_id: string
          looking: boolean
          name: string
          pitch: string | null
        }
        Insert: {
          created_at?: string
          hackathon_id: string
          id?: string
          leader_id: string
          looking?: boolean
          name: string
          pitch?: string | null
        }
        Update: {
          created_at?: string
          hackathon_id?: string
          id?: string
          leader_id?: string
          looking?: boolean
          name?: string
          pitch?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squads_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: { _hackathon_id?: string }
        Returns: {
          events: number
          full_name: string
          photo_url: string
          points: number
          user_id: string
          wins: number
        }[]
      }
      get_member_names: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      write_audit: {
        Args: {
          _action: string
          _actor?: string
          _details?: Json
          _entity: string
          _entity_id: string
          _summary: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "student"
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
    Enums: {
      app_role: ["admin", "student"],
    },
  },
} as const
