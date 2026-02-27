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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ads: {
        Row: {
          active: boolean | null
          content_url: string
          created_at: string
          id: string
          placement: string | null
          target_link: string | null
          title: string | null
          type: string
        }
        Insert: {
          active?: boolean | null
          content_url: string
          created_at?: string
          id?: string
          placement?: string | null
          target_link?: string | null
          title?: string | null
          type?: string
        }
        Update: {
          active?: boolean | null
          content_url?: string
          created_at?: string
          id?: string
          placement?: string | null
          target_link?: string | null
          title?: string | null
          type?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string
          doctor_id: string | null
          hospital_id: string | null
          id: string
          lab_id: string | null
          notes: string | null
          patient_id: string
          pharmacy_id: string | null
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string
          doctor_id?: string | null
          hospital_id?: string | null
          id?: string
          lab_id?: string | null
          notes?: string | null
          patient_id: string
          pharmacy_id?: string | null
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          doctor_id?: string | null
          hospital_id?: string | null
          id?: string
          lab_id?: string | null
          notes?: string | null
          patient_id?: string
          pharmacy_id?: string | null
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          bio: string | null
          consultation_fee: number | null
          created_at: string
          hospital_id: string | null
          id: string
          image_url: string | null
          name: string
          phone: string | null
          rating: number | null
          specialization: string | null
          vacation_dates: string[] | null
          working_hours: Json | null
        }
        Insert: {
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          hospital_id?: string | null
          id?: string
          image_url?: string | null
          name: string
          phone?: string | null
          rating?: number | null
          specialization?: string | null
          vacation_dates?: string[] | null
          working_hours?: Json | null
        }
        Update: {
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          hospital_id?: string | null
          id?: string
          image_url?: string | null
          name?: string
          phone?: string | null
          rating?: number | null
          specialization?: string | null
          vacation_dates?: string[] | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          provider_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          provider_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          provider_type?: string
          user_id?: string
        }
        Relationships: []
      }
      hospitals: {
        Row: {
          beds: number | null
          created_at: string
          holidays: string[] | null
          icu_available: boolean | null
          id: string
          image_url: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          phone: string | null
          rating: number | null
          working_hours: Json | null
        }
        Insert: {
          beds?: number | null
          created_at?: string
          holidays?: string[] | null
          icu_available?: boolean | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          rating?: number | null
          working_hours?: Json | null
        }
        Update: {
          beds?: number | null
          created_at?: string
          holidays?: string[] | null
          icu_available?: boolean | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          rating?: number | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      labs: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          location: string | null
          name: string
          phone: string | null
          rating: number | null
          services: string[] | null
          working_hours: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          location?: string | null
          name: string
          phone?: string | null
          rating?: number | null
          services?: string[] | null
          working_hours?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          location?: string | null
          name?: string
          phone?: string | null
          rating?: number | null
          services?: string[] | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      pharmacies: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          inventory: Json | null
          location: string | null
          name: string
          phone: string | null
          rating: number | null
          working_hours: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          inventory?: Json | null
          location?: string | null
          name: string
          phone?: string | null
          rating?: number | null
          working_hours?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          inventory?: Json | null
          location?: string | null
          name?: string
          phone?: string | null
          rating?: number | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          dark_mode: boolean | null
          email: string | null
          full_name: string | null
          id: string
          language: string | null
          notification_preferences: Json | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          dark_mode?: boolean | null
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          dark_mode?: boolean | null
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      slider_media: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          sort_order: number | null
          target_link: string | null
          title: string | null
          type: string
          url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number | null
          target_link?: string | null
          title?: string | null
          type?: string
          url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number | null
          target_link?: string | null
          title?: string | null
          type?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
