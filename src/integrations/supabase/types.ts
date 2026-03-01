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
      ambulances: {
        Row: {
          assigned_patient_id: string | null
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          status: string
          updated_at: string
          vehicle_number: string
        }
        Insert: {
          assigned_patient_id?: string | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          status?: string
          updated_at?: string
          vehicle_number: string
        }
        Update: {
          assigned_patient_id?: string | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          status?: string
          updated_at?: string
          vehicle_number?: string
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
          approval_status: string
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
          user_id: string | null
          vacation_dates: string[] | null
          working_hours: Json | null
        }
        Insert: {
          approval_status?: string
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
          user_id?: string | null
          vacation_dates?: string[] | null
          working_hours?: Json | null
        }
        Update: {
          approval_status?: string
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
          user_id?: string | null
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
      emergency_requests: {
        Row: {
          assigned_ambulance_id: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          patient_id: string
          response_time_minutes: number | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_ambulance_id?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          patient_id: string
          response_time_minutes?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_ambulance_id?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          patient_id?: string
          response_time_minutes?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          approval_status: string
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
          user_id: string | null
          working_hours: Json | null
        }
        Insert: {
          approval_status?: string
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
          user_id?: string | null
          working_hours?: Json | null
        }
        Update: {
          approval_status?: string
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
          user_id?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      labs: {
        Row: {
          approval_status: string
          created_at: string
          id: string
          image_url: string | null
          location: string | null
          name: string
          phone: string | null
          rating: number | null
          services: string[] | null
          user_id: string | null
          working_hours: Json | null
        }
        Insert: {
          approval_status?: string
          created_at?: string
          id?: string
          image_url?: string | null
          location?: string | null
          name: string
          phone?: string | null
          rating?: number | null
          services?: string[] | null
          user_id?: string | null
          working_hours?: Json | null
        }
        Update: {
          approval_status?: string
          created_at?: string
          id?: string
          image_url?: string | null
          location?: string | null
          name?: string
          phone?: string | null
          rating?: number | null
          services?: string[] | null
          user_id?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      medicines: {
        Row: {
          category: string
          created_at: string
          description: string | null
          discount_percent: number | null
          generic_name: string | null
          id: string
          image_url: string | null
          in_stock: boolean | null
          name: string
          pharmacy_id: string
          price: number
          requires_prescription: boolean | null
          stock_quantity: number | null
          unit: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          name: string
          pharmacy_id: string
          price?: number
          requires_prescription?: boolean | null
          stock_quantity?: number | null
          unit?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          name?: string
          pharmacy_id?: string
          price?: number
          requires_prescription?: boolean | null
          stock_quantity?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicines_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          path: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          path?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          path?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          medicine_id: string
          medicine_name: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_id: string
          medicine_name: string
          order_id: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          medicine_id?: string
          medicine_name?: string
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_fee: number
          estimated_delivery: string | null
          id: string
          notes: string | null
          out_for_delivery_at: string | null
          payment_method: string
          payment_status: string
          pharmacy_id: string
          placed_at: string
          prescription_url: string | null
          status: string
          stripe_payment_id: string | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          out_for_delivery_at?: string | null
          payment_method?: string
          payment_status?: string
          pharmacy_id: string
          placed_at?: string
          prescription_url?: string | null
          status?: string
          stripe_payment_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          out_for_delivery_at?: string | null
          payment_method?: string
          payment_status?: string
          pharmacy_id?: string
          placed_at?: string
          prescription_url?: string | null
          status?: string
          stripe_payment_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pharmacies: {
        Row: {
          approval_status: string
          created_at: string
          id: string
          image_url: string | null
          inventory: Json | null
          location: string | null
          name: string
          phone: string | null
          rating: number | null
          user_id: string | null
          working_hours: Json | null
        }
        Insert: {
          approval_status?: string
          created_at?: string
          id?: string
          image_url?: string | null
          inventory?: Json | null
          location?: string | null
          name: string
          phone?: string | null
          rating?: number | null
          user_id?: string | null
          working_hours?: Json | null
        }
        Update: {
          approval_status?: string
          created_at?: string
          id?: string
          image_url?: string | null
          inventory?: Json | null
          location?: string | null
          name?: string
          phone?: string | null
          rating?: number | null
          user_id?: string | null
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
          status: string
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
          status?: string
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
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "doctor"
        | "hospital_admin"
        | "lab_admin"
        | "pharmacy_admin"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "doctor",
        "hospital_admin",
        "lab_admin",
        "pharmacy_admin",
      ],
    },
  },
} as const
