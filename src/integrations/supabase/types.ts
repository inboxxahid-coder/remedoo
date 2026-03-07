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
      account_deletion_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          admin_team_id: string
          created_at: string
          id: string
          page_path: string
        }
        Insert: {
          admin_team_id: string
          created_at?: string
          id?: string
          page_path: string
        }
        Update: {
          admin_team_id?: string
          created_at?: string
          id?: string
          page_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_admin_team_id_fkey"
            columns: ["admin_team_id"]
            isOneToOne: false
            referencedRelation: "admin_team"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_team: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          designation: string
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          designation?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          designation?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          active: boolean | null
          advertiser_name: string | null
          advertiser_type: string | null
          budget: number | null
          clicks: number | null
          content_url: string
          created_at: string
          end_date: string | null
          id: string
          impressions: number | null
          placement: string | null
          start_date: string | null
          target_link: string | null
          title: string | null
          type: string
        }
        Insert: {
          active?: boolean | null
          advertiser_name?: string | null
          advertiser_type?: string | null
          budget?: number | null
          clicks?: number | null
          content_url: string
          created_at?: string
          end_date?: string | null
          id?: string
          impressions?: number | null
          placement?: string | null
          start_date?: string | null
          target_link?: string | null
          title?: string | null
          type?: string
        }
        Update: {
          active?: boolean | null
          advertiser_name?: string | null
          advertiser_type?: string | null
          budget?: number | null
          clicks?: number | null
          content_url?: string
          created_at?: string
          end_date?: string | null
          id?: string
          impressions?: number | null
          placement?: string | null
          start_date?: string | null
          target_link?: string | null
          title?: string | null
          type?: string
        }
        Relationships: []
      }
      ambulance_distance_ranges: {
        Row: {
          created_at: string
          hospital_id: string | null
          id: string
          lab_id: string | null
          max_km: number
          min_km: number
          price: number
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          hospital_id?: string | null
          id?: string
          lab_id?: string | null
          max_km?: number
          min_km?: number
          price?: number
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          hospital_id?: string | null
          id?: string
          lab_id?: string | null
          max_km?: number
          min_km?: number
          price?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_distance_ranges_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_distance_ranges_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_distance_ranges_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_distance_ranges_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulance_trips: {
        Row: {
          ambulance_id: string | null
          base_fare: number | null
          completed_at: string | null
          created_at: string
          distance_fare: number | null
          distance_km: number | null
          driver_name: string | null
          driver_phone: string | null
          driver_user_id: string | null
          emergency_request_id: string | null
          hospital_id: string | null
          id: string
          is_free: boolean | null
          lab_id: string | null
          patient_id: string
          payment_method: string | null
          payment_status: string | null
          reached_at: string | null
          response_time_minutes: number | null
          started_at: string | null
          status: string
          surcharge: number | null
          total_fare: number | null
          updated_at: string
        }
        Insert: {
          ambulance_id?: string | null
          base_fare?: number | null
          completed_at?: string | null
          created_at?: string
          distance_fare?: number | null
          distance_km?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_user_id?: string | null
          emergency_request_id?: string | null
          hospital_id?: string | null
          id?: string
          is_free?: boolean | null
          lab_id?: string | null
          patient_id: string
          payment_method?: string | null
          payment_status?: string | null
          reached_at?: string | null
          response_time_minutes?: number | null
          started_at?: string | null
          status?: string
          surcharge?: number | null
          total_fare?: number | null
          updated_at?: string
        }
        Update: {
          ambulance_id?: string | null
          base_fare?: number | null
          completed_at?: string | null
          created_at?: string
          distance_fare?: number | null
          distance_km?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_user_id?: string | null
          emergency_request_id?: string | null
          hospital_id?: string | null
          id?: string
          is_free?: boolean | null
          lab_id?: string | null
          patient_id?: string
          payment_method?: string | null
          payment_status?: string | null
          reached_at?: string | null
          response_time_minutes?: number | null
          started_at?: string | null
          status?: string
          surcharge?: number | null
          total_fare?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_trips_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_trips_emergency_request_id_fkey"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_trips_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_trips_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_trips_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_trips_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulances: {
        Row: {
          assigned_patient_id: string | null
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          driver_name: string | null
          driver_phone: string | null
          equipment_details: string | null
          hospital_id: string | null
          id: string
          lab_id: string | null
          status: string
          updated_at: string
          vehicle_number: string
          vehicle_type: string | null
        }
        Insert: {
          assigned_patient_id?: string | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          equipment_details?: string | null
          hospital_id?: string | null
          id?: string
          lab_id?: string | null
          status?: string
          updated_at?: string
          vehicle_number: string
          vehicle_type?: string | null
        }
        Update: {
          assigned_patient_id?: string | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          equipment_details?: string | null
          hospital_id?: string | null
          id?: string
          lab_id?: string | null
          status?: string
          updated_at?: string
          vehicle_number?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambulances_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulances_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulances_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulances_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          completed_at: string | null
          consultation_notes: string | null
          created_at: string
          department: string | null
          doctor_id: string | null
          family_member_id: string | null
          follow_up_date: string | null
          hospital_id: string | null
          id: string
          is_video_consultation: boolean | null
          lab_id: string | null
          notes: string | null
          patient_id: string
          payment_method: string
          payment_status: string
          pharmacy_id: string | null
          prescription_url: string | null
          rejection_reason: string | null
          service_type: string
          status: string
          token_number: number | null
          updated_at: string
          video_meeting_link: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          completed_at?: string | null
          consultation_notes?: string | null
          created_at?: string
          department?: string | null
          doctor_id?: string | null
          family_member_id?: string | null
          follow_up_date?: string | null
          hospital_id?: string | null
          id?: string
          is_video_consultation?: boolean | null
          lab_id?: string | null
          notes?: string | null
          patient_id: string
          payment_method?: string
          payment_status?: string
          pharmacy_id?: string | null
          prescription_url?: string | null
          rejection_reason?: string | null
          service_type: string
          status?: string
          token_number?: number | null
          updated_at?: string
          video_meeting_link?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          completed_at?: string | null
          consultation_notes?: string | null
          created_at?: string
          department?: string | null
          doctor_id?: string | null
          family_member_id?: string | null
          follow_up_date?: string | null
          hospital_id?: string | null
          id?: string
          is_video_consultation?: boolean | null
          lab_id?: string | null
          notes?: string | null
          patient_id?: string
          payment_method?: string
          payment_status?: string
          pharmacy_id?: string | null
          prescription_url?: string | null
          rejection_reason?: string | null
          service_type?: string
          status?: string
          token_number?: number | null
          updated_at?: string
          video_meeting_link?: string | null
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
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
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
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
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
            foreignKeyName: "appointments_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          doctor_id: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          doctor_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          doctor_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          sent_at: string
          sent_by: string
          target_audience: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sent_at?: string
          sent_by: string
          target_audience?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sent_at?: string
          sent_by?: string
          target_audience?: string
          title?: string
        }
        Relationships: []
      }
      cancellation_otp_settings: {
        Row: {
          email_enabled: boolean
          id: string
          otp_required_for_confirmed: boolean
          sms_enabled: boolean
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          email_enabled?: boolean
          id?: string
          otp_required_for_confirmed?: boolean
          sms_enabled?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          email_enabled?: boolean
          id?: string
          otp_required_for_confirmed?: boolean
          sms_enabled?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      cancellation_otps: {
        Row: {
          appointment_id: string
          channels_used: string[]
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          user_id: string
          verified: boolean
        }
        Insert: {
          appointment_id: string
          channels_used?: string[]
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          user_id: string
          verified?: boolean
        }
        Update: {
          appointment_id?: string
          channels_used?: string[]
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_otps_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_edit_requests: {
        Row: {
          admin_notes: string | null
          appointment_id: string
          created_at: string
          doctor_id: string
          field_name: string
          id: string
          new_value: string
          old_value: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          appointment_id: string
          created_at?: string
          doctor_id: string
          field_name?: string
          id?: string
          new_value: string
          old_value?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          appointment_id?: string
          created_at?: string
          doctor_id?: string
          field_name?: string
          id?: string
          new_value?: string
          old_value?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_edit_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_edit_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_edit_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_plans: {
        Row: {
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_employees: number | null
          monthly_price: number
          plan_type: string | null
          services_included: Json | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_employees?: number | null
          monthly_price?: number
          plan_type?: string | null
          services_included?: Json | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_employees?: number | null
          monthly_price?: number
          plan_type?: string | null
          services_included?: Json | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          appointment_id: string | null
          coupon_id: string
          created_at: string
          discount_applied: number
          id: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          coupon_id: string
          created_at?: string
          discount_applied?: number
          id?: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          coupon_id?: string
          created_at?: string
          discount_applied?: number
          id?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_for: string
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_amount: number | null
          updated_at: string
          usage_limit: number | null
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_for?: string
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_for?: string
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      dashboard_category_actions: {
        Row: {
          active: boolean | null
          bg_color: string | null
          created_at: string | null
          emoji: string | null
          icon_name: string
          id: string
          label: string
          path: string
          sort_order: number | null
          text_color: string | null
        }
        Insert: {
          active?: boolean | null
          bg_color?: string | null
          created_at?: string | null
          emoji?: string | null
          icon_name?: string
          id?: string
          label: string
          path?: string
          sort_order?: number | null
          text_color?: string | null
        }
        Update: {
          active?: boolean | null
          bg_color?: string | null
          created_at?: string | null
          emoji?: string | null
          icon_name?: string
          id?: string
          label?: string
          path?: string
          sort_order?: number | null
          text_color?: string | null
        }
        Relationships: []
      }
      dashboard_health_tips: {
        Row: {
          active: boolean | null
          bg_color: string | null
          color: string | null
          created_at: string | null
          description: string
          icon_name: string
          id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          active?: boolean | null
          bg_color?: string | null
          color?: string | null
          created_at?: string | null
          description: string
          icon_name?: string
          id?: string
          sort_order?: number | null
          title: string
        }
        Update: {
          active?: boolean | null
          bg_color?: string | null
          color?: string | null
          created_at?: string | null
          description?: string
          icon_name?: string
          id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      dashboard_info_cards: {
        Row: {
          active: boolean | null
          created_at: string | null
          icon_bg: string | null
          icon_color: string | null
          icon_name: string
          id: string
          label: string
          path: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          icon_bg?: string | null
          icon_color?: string | null
          icon_name?: string
          id?: string
          label: string
          path?: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          icon_bg?: string | null
          icon_color?: string | null
          icon_name?: string
          id?: string
          label?: string
          path?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      dashboard_promo_banners: {
        Row: {
          active: boolean | null
          created_at: string | null
          emoji: string | null
          gradient: string | null
          id: string
          sort_order: number | null
          subtitle: string | null
          target_link: string | null
          title: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          emoji?: string | null
          gradient?: string | null
          id?: string
          sort_order?: number | null
          subtitle?: string | null
          target_link?: string | null
          title: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          emoji?: string | null
          gradient?: string | null
          id?: string
          sort_order?: number | null
          subtitle?: string | null
          target_link?: string | null
          title?: string
        }
        Relationships: []
      }
      dashboard_quick_access: {
        Row: {
          active: boolean | null
          created_at: string | null
          extra_text: string | null
          gradient: string | null
          icon_name: string
          id: string
          path: string
          sort_order: number | null
          subtitle: string | null
          text_color: string | null
          title: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          extra_text?: string | null
          gradient?: string | null
          icon_name?: string
          id?: string
          path?: string
          sort_order?: number | null
          subtitle?: string | null
          text_color?: string | null
          title: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          extra_text?: string | null
          gradient?: string | null
          icon_name?: string
          id?: string
          path?: string
          sort_order?: number | null
          subtitle?: string | null
          text_color?: string | null
          title?: string
        }
        Relationships: []
      }
      dashboard_quick_actions: {
        Row: {
          active: boolean | null
          created_at: string | null
          emoji: string | null
          gradient: string | null
          icon_name: string
          id: string
          label: string
          path: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          emoji?: string | null
          gradient?: string | null
          icon_name?: string
          id?: string
          label: string
          path?: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          emoji?: string | null
          gradient?: string | null
          icon_name?: string
          id?: string
          label?: string
          path?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      dashboard_services: {
        Row: {
          active: boolean | null
          bg_color: string | null
          color: string | null
          created_at: string | null
          description: string | null
          icon_name: string
          id: string
          path: string
          sort_order: number | null
          title: string
        }
        Insert: {
          active?: boolean | null
          bg_color?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon_name?: string
          id?: string
          path?: string
          sort_order?: number | null
          title: string
        }
        Update: {
          active?: boolean | null
          bg_color?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon_name?: string
          id?: string
          path?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      delivery_drivers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          license_number: string | null
          license_url: string | null
          name: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
          vehicle_number: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          license_url?: string | null
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          license_url?: string | null
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      delivery_orders: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          driver_id: string | null
          driver_latitude: number | null
          driver_longitude: number | null
          estimated_delivery_minutes: number | null
          id: string
          order_id: string
          pickup_address: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          driver_id?: string | null
          driver_latitude?: number | null
          driver_longitude?: number | null
          estimated_delivery_minutes?: number | null
          id?: string
          order_id: string
          pickup_address?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          driver_id?: string | null
          driver_latitude?: number | null
          driver_longitude?: number | null
          estimated_delivery_minutes?: number | null
          id?: string
          order_id?: string
          pickup_address?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "remedoo_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          head_doctor_id: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          head_doctor_id?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          head_doctor_id?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_head_doctor_id_fkey"
            columns: ["head_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_head_doctor_id_fkey"
            columns: ["head_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_blocked_slots: {
        Row: {
          blocked_date: string
          created_at: string
          doctor_id: string
          end_time: string | null
          id: string
          is_full_day: boolean | null
          reason: string | null
          start_time: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          doctor_id: string
          end_time?: string | null
          id?: string
          is_full_day?: boolean | null
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          doctor_id?: string
          end_time?: string | null
          id?: string
          is_full_day?: boolean | null
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_blocked_slots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_blocked_slots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          account_status: string
          additional_docs_urls: string[] | null
          admin_note: string | null
          approval_status: string
          bio: string | null
          certificate_url: string | null
          consultation_duration: number | null
          consultation_fee: number | null
          created_at: string
          department_id: string | null
          emergency_available: boolean | null
          experience_years: number | null
          featured_sort_order: number | null
          gender: string | null
          gst_url: string | null
          hospital_id: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          license_url: string | null
          max_appointments_per_day: number | null
          name: string
          phone: string | null
          rating: number | null
          specialization: string | null
          user_id: string | null
          vacation_dates: string[] | null
          video_consultation_duration: number | null
          video_consultation_enabled: boolean | null
          video_consultation_fee: number | null
          working_hours: Json | null
        }
        Insert: {
          account_status?: string
          additional_docs_urls?: string[] | null
          admin_note?: string | null
          approval_status?: string
          bio?: string | null
          certificate_url?: string | null
          consultation_duration?: number | null
          consultation_fee?: number | null
          created_at?: string
          department_id?: string | null
          emergency_available?: boolean | null
          experience_years?: number | null
          featured_sort_order?: number | null
          gender?: string | null
          gst_url?: string | null
          hospital_id?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          license_url?: string | null
          max_appointments_per_day?: number | null
          name: string
          phone?: string | null
          rating?: number | null
          specialization?: string | null
          user_id?: string | null
          vacation_dates?: string[] | null
          video_consultation_duration?: number | null
          video_consultation_enabled?: boolean | null
          video_consultation_fee?: number | null
          working_hours?: Json | null
        }
        Update: {
          account_status?: string
          additional_docs_urls?: string[] | null
          admin_note?: string | null
          approval_status?: string
          bio?: string | null
          certificate_url?: string | null
          consultation_duration?: number | null
          consultation_fee?: number | null
          created_at?: string
          department_id?: string | null
          emergency_available?: boolean | null
          experience_years?: number | null
          featured_sort_order?: number | null
          gender?: string | null
          gst_url?: string | null
          hospital_id?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          license_url?: string | null
          max_appointments_per_day?: number | null
          name?: string
          phone?: string | null
          rating?: number | null
          specialization?: string | null
          user_id?: string | null
          vacation_dates?: string[] | null
          video_consultation_duration?: number | null
          video_consultation_enabled?: boolean | null
          video_consultation_fee?: number | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          created_at: string
          driver_user_id: string
          id: string
          latitude: number
          longitude: number
          trip_id: string
        }
        Insert: {
          created_at?: string
          driver_user_id: string
          id?: string
          latitude: number
          longitude: number
          trip_id: string
        }
        Update: {
          created_at?: string
          driver_user_id?: string
          id?: string
          latitude?: number
          longitude?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "ambulance_trips"
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
      emergency_triggers: {
        Row: {
          created_at: string | null
          id: string
          symptom_keyword: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          symptom_keyword: string
        }
        Update: {
          created_at?: string | null
          id?: string
          symptom_keyword?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          allergies: string | null
          avatar_url: string | null
          blood_group: string | null
          chronic_conditions: string | null
          created_at: string
          date_of_birth: string | null
          gender: string | null
          id: string
          name: string
          relationship: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          avatar_url?: string | null
          blood_group?: string | null
          chronic_conditions?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          name: string
          relationship: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          avatar_url?: string | null
          blood_group?: string | null
          chronic_conditions?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          name?: string
          relationship?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number | null
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
      health_reminders: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          family_member_id: string | null
          id: string
          is_completed: boolean | null
          recurrence: string | null
          reminder_date: string
          reminder_time: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          family_member_id?: string | null
          id?: string
          is_completed?: boolean | null
          recurrence?: string | null
          reminder_date: string
          reminder_time?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          family_member_id?: string | null
          id?: string
          is_completed?: boolean | null
          recurrence?: string | null
          reminder_date?: string
          reminder_time?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_reminders_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      healthcare_packages: {
        Row: {
          bookings_count: number | null
          created_at: string | null
          description: string | null
          discounted_price: number | null
          duration_days: number | null
          id: string
          is_active: boolean | null
          name: string
          original_price: number
          provider_id: string
          provider_type: string
          sort_order: number | null
          tests_included: Json | null
          updated_at: string | null
        }
        Insert: {
          bookings_count?: number | null
          created_at?: string | null
          description?: string | null
          discounted_price?: number | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          original_price?: number
          provider_id: string
          provider_type?: string
          sort_order?: number | null
          tests_included?: Json | null
          updated_at?: string | null
        }
        Update: {
          bookings_count?: number | null
          created_at?: string | null
          description?: string | null
          discounted_price?: number | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          original_price?: number
          provider_id?: string
          provider_type?: string
          sort_order?: number | null
          tests_included?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hospital_ambulance_config: {
        Row: {
          base_fare: number | null
          created_at: string
          emergency_surcharge: number | null
          flat_price: number | null
          hospital_id: string
          id: string
          minimum_charge: number | null
          night_charge_amount: number | null
          night_charge_enabled: boolean | null
          night_charge_end: string | null
          night_charge_start: string | null
          night_surcharge: number | null
          per_km_charge: number | null
          pricing_model: string
          service_enabled: boolean | null
          service_type: string
          updated_at: string
        }
        Insert: {
          base_fare?: number | null
          created_at?: string
          emergency_surcharge?: number | null
          flat_price?: number | null
          hospital_id: string
          id?: string
          minimum_charge?: number | null
          night_charge_amount?: number | null
          night_charge_enabled?: boolean | null
          night_charge_end?: string | null
          night_charge_start?: string | null
          night_surcharge?: number | null
          per_km_charge?: number | null
          pricing_model?: string
          service_enabled?: boolean | null
          service_type?: string
          updated_at?: string
        }
        Update: {
          base_fare?: number | null
          created_at?: string
          emergency_surcharge?: number | null
          flat_price?: number | null
          hospital_id?: string
          id?: string
          minimum_charge?: number | null
          night_charge_amount?: number | null
          night_charge_enabled?: boolean | null
          night_charge_end?: string | null
          night_charge_start?: string | null
          night_surcharge?: number | null
          per_km_charge?: number | null
          pricing_model?: string
          service_enabled?: boolean | null
          service_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_ambulance_config_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: true
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_ambulance_config_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: true
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_earnings: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          description: string | null
          hospital_id: string
          id: string
          net_earning: number
          platform_commission: number
          type: string
        }
        Insert: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          description?: string | null
          hospital_id: string
          id?: string
          net_earning?: number
          platform_commission?: number
          type?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          description?: string | null
          hospital_id?: string
          id?: string
          net_earning?: number
          platform_commission?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_earnings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_earnings_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_earnings_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_equipment: {
        Row: {
          created_at: string
          department_id: string | null
          hospital_id: string
          id: string
          last_maintenance_date: string | null
          maintenance_notes: string | null
          name: string
          next_maintenance_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          hospital_id: string
          id?: string
          last_maintenance_date?: string | null
          maintenance_notes?: string | null
          name: string
          next_maintenance_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          hospital_id?: string
          id?: string
          last_maintenance_date?: string | null
          maintenance_notes?: string | null
          name?: string
          next_maintenance_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_equipment_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_equipment_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_equipment_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          additional_docs_urls: string[] | null
          admin_note: string | null
          approval_status: string
          available_beds: number | null
          available_icu_beds: number | null
          beds: number | null
          created_at: string
          emergency_contact: string | null
          featured_sort_order: number | null
          gst_url: string | null
          holidays: string[] | null
          icu_available: boolean | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_government: boolean
          latitude: number | null
          license_url: string | null
          location: string | null
          longitude: number | null
          name: string
          phone: string | null
          platform_commission_percent: number | null
          rating: number | null
          total_beds: number | null
          total_icu_beds: number | null
          user_id: string | null
          working_hours: Json | null
        }
        Insert: {
          additional_docs_urls?: string[] | null
          admin_note?: string | null
          approval_status?: string
          available_beds?: number | null
          available_icu_beds?: number | null
          beds?: number | null
          created_at?: string
          emergency_contact?: string | null
          featured_sort_order?: number | null
          gst_url?: string | null
          holidays?: string[] | null
          icu_available?: boolean | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_government?: boolean
          latitude?: number | null
          license_url?: string | null
          location?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          platform_commission_percent?: number | null
          rating?: number | null
          total_beds?: number | null
          total_icu_beds?: number | null
          user_id?: string | null
          working_hours?: Json | null
        }
        Update: {
          additional_docs_urls?: string[] | null
          admin_note?: string | null
          approval_status?: string
          available_beds?: number | null
          available_icu_beds?: number | null
          beds?: number | null
          created_at?: string
          emergency_contact?: string | null
          featured_sort_order?: number | null
          gst_url?: string | null
          holidays?: string[] | null
          icu_available?: boolean | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_government?: boolean
          latitude?: number | null
          license_url?: string | null
          location?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          platform_commission_percent?: number | null
          rating?: number | null
          total_beds?: number | null
          total_icu_beds?: number | null
          user_id?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      internal_config: {
        Row: {
          created_at: string | null
          key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          value?: string
        }
        Relationships: []
      }
      lab_ambulance_config: {
        Row: {
          base_fare: number | null
          created_at: string
          emergency_surcharge: number | null
          flat_price: number | null
          id: string
          lab_id: string
          minimum_charge: number | null
          night_charge_amount: number | null
          night_charge_enabled: boolean | null
          night_charge_end: string | null
          night_charge_start: string | null
          night_surcharge: number | null
          per_km_charge: number | null
          pricing_model: string
          service_enabled: boolean | null
          service_type: string
          updated_at: string
        }
        Insert: {
          base_fare?: number | null
          created_at?: string
          emergency_surcharge?: number | null
          flat_price?: number | null
          id?: string
          lab_id: string
          minimum_charge?: number | null
          night_charge_amount?: number | null
          night_charge_enabled?: boolean | null
          night_charge_end?: string | null
          night_charge_start?: string | null
          night_surcharge?: number | null
          per_km_charge?: number | null
          pricing_model?: string
          service_enabled?: boolean | null
          service_type?: string
          updated_at?: string
        }
        Update: {
          base_fare?: number | null
          created_at?: string
          emergency_surcharge?: number | null
          flat_price?: number | null
          id?: string
          lab_id?: string
          minimum_charge?: number | null
          night_charge_amount?: number | null
          night_charge_enabled?: boolean | null
          night_charge_end?: string | null
          night_charge_start?: string | null
          night_surcharge?: number | null
          per_km_charge?: number | null
          pricing_model?: string
          service_enabled?: boolean | null
          service_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_ambulance_config_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: true
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ambulance_config_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: true
            referencedRelation: "labs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_sample_collections: {
        Row: {
          appointment_id: string
          collected_at: string | null
          collection_address: string | null
          collection_type: string
          collector_name: string | null
          collector_phone: string | null
          created_at: string
          id: string
          lab_id: string
          notes: string | null
          patient_id: string
          report_url: string | null
          report_version: number
          sample_type: string
          scheduled_date: string
          scheduled_time: string | null
          status: string
          test_name: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          collected_at?: string | null
          collection_address?: string | null
          collection_type?: string
          collector_name?: string | null
          collector_phone?: string | null
          created_at?: string
          id?: string
          lab_id: string
          notes?: string | null
          patient_id: string
          report_url?: string | null
          report_version?: number
          sample_type?: string
          scheduled_date: string
          scheduled_time?: string | null
          status?: string
          test_name: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          collected_at?: string | null
          collection_address?: string | null
          collection_type?: string
          collector_name?: string | null
          collector_phone?: string | null
          created_at?: string
          id?: string
          lab_id?: string
          notes?: string | null
          patient_id?: string
          report_url?: string | null
          report_version?: number
          sample_type?: string
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          test_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_sample_collections_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sample_collections_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sample_collections_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_test_packages: {
        Row: {
          created_at: string
          description: string | null
          discount_percent: number | null
          id: string
          is_active: boolean
          lab_id: string
          name: string
          package_price: number
          tests: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean
          lab_id: string
          name: string
          package_price?: number
          tests?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean
          lab_id?: string
          name?: string
          package_price?: number
          tests?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lab_test_packages_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_test_packages_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_tests: {
        Row: {
          category: string
          created_at: string
          description: string | null
          discount_percent: number | null
          home_collection: boolean | null
          home_collection_fee: number | null
          id: string
          is_popular: boolean | null
          lab_id: string
          name: string
          price: number
          requires_fasting: boolean | null
          sample_type: string | null
          turnaround_time: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          home_collection?: boolean | null
          home_collection_fee?: number | null
          id?: string
          is_popular?: boolean | null
          lab_id: string
          name: string
          price?: number
          requires_fasting?: boolean | null
          sample_type?: string | null
          turnaround_time?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          home_collection?: boolean | null
          home_collection_fee?: number | null
          id?: string
          is_popular?: boolean | null
          lab_id?: string
          name?: string
          price?: number
          requires_fasting?: boolean | null
          sample_type?: string | null
          turnaround_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_tests_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_tests_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          additional_docs_urls: string[] | null
          admin_note: string | null
          approval_status: string
          created_at: string
          featured_sort_order: number | null
          gst_url: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          latitude: number | null
          license_url: string | null
          location: string | null
          longitude: number | null
          name: string
          phone: string | null
          rating: number | null
          services: string[] | null
          user_id: string | null
          working_hours: Json | null
        }
        Insert: {
          additional_docs_urls?: string[] | null
          admin_note?: string | null
          approval_status?: string
          created_at?: string
          featured_sort_order?: number | null
          gst_url?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          latitude?: number | null
          license_url?: string | null
          location?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          rating?: number | null
          services?: string[] | null
          user_id?: string | null
          working_hours?: Json | null
        }
        Update: {
          additional_docs_urls?: string[] | null
          admin_note?: string | null
          approval_status?: string
          created_at?: string
          featured_sort_order?: number | null
          gst_url?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          latitude?: number | null
          license_url?: string | null
          location?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          rating?: number | null
          services?: string[] | null
          user_id?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      legal_pages: {
        Row: {
          content: string
          id: string
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      medicines: {
        Row: {
          batch_number: string | null
          brand_name: string | null
          category: string
          created_at: string
          description: string | null
          discount_percent: number | null
          expiry_date: string | null
          featured_sort_order: number | null
          generic_name: string | null
          id: string
          image_url: string | null
          in_stock: boolean | null
          is_featured: boolean | null
          low_stock_threshold: number | null
          manufacturer: string | null
          name: string
          pharmacy_id: string
          price: number
          requires_prescription: boolean | null
          stock_quantity: number | null
          unit: string | null
        }
        Insert: {
          batch_number?: string | null
          brand_name?: string | null
          category?: string
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          expiry_date?: string | null
          featured_sort_order?: number | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          manufacturer?: string | null
          name: string
          pharmacy_id: string
          price?: number
          requires_prescription?: boolean | null
          stock_quantity?: number | null
          unit?: string | null
        }
        Update: {
          batch_number?: string | null
          brand_name?: string | null
          category?: string
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          expiry_date?: string | null
          featured_sort_order?: number | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          manufacturer?: string | null
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
          {
            foreignKeyName: "medicines_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies_public"
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
      operation_theaters: {
        Row: {
          created_at: string
          department_id: string | null
          hospital_id: string
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          hospital_id: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          hospital_id?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_theaters_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_theaters_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_theaters_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "orders_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      package_bookings: {
        Row: {
          amount_paid: number | null
          booking_date: string | null
          created_at: string | null
          family_member_id: string | null
          id: string
          package_id: string
          payment_method: string | null
          payment_status: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          booking_date?: string | null
          created_at?: string | null
          family_member_id?: string | null
          id?: string
          package_id: string
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          booking_date?: string | null
          created_at?: string | null
          family_member_id?: string | null
          id?: string
          package_id?: string
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_bookings_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "healthcare_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_change_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          new_details: Json
          old_details: Json | null
          payment_account_id: string
          provider_id: string
          provider_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          new_details: Json
          old_details?: Json | null
          payment_account_id: string
          provider_id: string
          provider_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          new_details?: Json
          old_details?: Json | null
          payment_account_id?: string
          provider_id?: string
          provider_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_change_requests_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "provider_payment_accounts"
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
      payout_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          bank_details: Json | null
          id: string
          paid_at: string | null
          provider_id: string
          provider_type: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          transaction_reference: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          bank_details?: Json | null
          id?: string
          paid_at?: string | null
          provider_id: string
          provider_type: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transaction_reference?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          bank_details?: Json | null
          id?: string
          paid_at?: string | null
          provider_id?: string
          provider_type?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transaction_reference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pharmacies: {
        Row: {
          additional_docs_urls: string[] | null
          admin_note: string | null
          approval_status: string
          created_at: string
          featured_sort_order: number | null
          gst_url: string | null
          id: string
          image_url: string | null
          inventory: Json | null
          is_featured: boolean | null
          latitude: number | null
          license_url: string | null
          location: string | null
          longitude: number | null
          name: string
          phone: string | null
          rating: number | null
          user_id: string | null
          working_hours: Json | null
        }
        Insert: {
          additional_docs_urls?: string[] | null
          admin_note?: string | null
          approval_status?: string
          created_at?: string
          featured_sort_order?: number | null
          gst_url?: string | null
          id?: string
          image_url?: string | null
          inventory?: Json | null
          is_featured?: boolean | null
          latitude?: number | null
          license_url?: string | null
          location?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          rating?: number | null
          user_id?: string | null
          working_hours?: Json | null
        }
        Update: {
          additional_docs_urls?: string[] | null
          admin_note?: string | null
          approval_status?: string
          created_at?: string
          featured_sort_order?: number | null
          gst_url?: string | null
          id?: string
          image_url?: string | null
          inventory?: Json | null
          is_featured?: boolean | null
          latitude?: number | null
          license_url?: string | null
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
      platform_api_keys: {
        Row: {
          category: string
          changed_by: string | null
          cooldown_minutes: number
          created_at: string
          display_label: string
          id: string
          is_masked: boolean
          key_name: string
          key_value: string
          last_changed_at: string | null
        }
        Insert: {
          category?: string
          changed_by?: string | null
          cooldown_minutes?: number
          created_at?: string
          display_label: string
          id?: string
          is_masked?: boolean
          key_name: string
          key_value?: string
          last_changed_at?: string | null
        }
        Update: {
          category?: string
          changed_by?: string | null
          cooldown_minutes?: number
          created_at?: string
          display_label?: string
          id?: string
          is_masked?: boolean
          key_name?: string
          key_value?: string
          last_changed_at?: string | null
        }
        Relationships: []
      }
      platform_branding: {
        Row: {
          category: string
          created_at: string
          id: string
          key: string
          label: string
          type: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          key: string
          label: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      platform_commission_config: {
        Row: {
          commission_percent: number
          created_at: string
          description: string | null
          flat_fee: number
          id: string
          is_active: boolean
          provider_type: string
          service_type: string
          updated_at: string
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          description?: string | null
          flat_fee?: number
          id?: string
          is_active?: boolean
          provider_type: string
          service_type?: string
          updated_at?: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          description?: string | null
          flat_fee?: number
          id?: string
          is_active?: boolean
          provider_type?: string
          service_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          category: string
          id: string
          key: string
          label: string
          type: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          category?: string
          id?: string
          key: string
          label: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          category?: string
          id?: string
          key?: string
          label?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      prescription_items: {
        Row: {
          created_at: string
          dosage: string
          duration: string
          frequency: string
          generic_name: string | null
          id: string
          instructions: string | null
          medicine_name: string
          prescription_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          dosage: string
          duration: string
          frequency: string
          generic_name?: string | null
          id?: string
          instructions?: string | null
          medicine_name: string
          prescription_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          dosage?: string
          duration?: string
          frequency?: string
          generic_name?: string | null
          id?: string
          instructions?: string | null
          medicine_name?: string
          prescription_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          appointment_id: string
          created_at: string
          diagnosis: string | null
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          signature_data: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          signature_data?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          signature_data?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          dark_mode: boolean | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          language: string | null
          latitude: number | null
          longitude: number | null
          notification_preferences: Json | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          dark_mode?: boolean | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          language?: string | null
          latitude?: number | null
          longitude?: number | null
          notification_preferences?: Json | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          dark_mode?: boolean | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          language?: string | null
          latitude?: number | null
          longitude?: number | null
          notification_preferences?: Json | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_earnings: {
        Row: {
          commission_amount: number
          commission_percent: number
          created_at: string
          description: string | null
          gross_amount: number
          id: string
          net_amount: number
          provider_id: string
          provider_type: string
          reference_id: string
          reference_type: string
        }
        Insert: {
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          description?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          provider_id: string
          provider_type: string
          reference_id: string
          reference_type: string
        }
        Update: {
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          description?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          provider_id?: string
          provider_type?: string
          reference_id?: string
          reference_type?: string
        }
        Relationships: []
      }
      provider_payment_accounts: {
        Row: {
          account_holder_name: string | null
          admin_notes: string | null
          approval_status: string
          bank_account_number: string | null
          bank_name: string | null
          change_count: number
          created_at: string
          id: string
          ifsc_code: string | null
          is_active: boolean
          last_change_at: string | null
          payment_method: string
          provider_id: string
          provider_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          account_holder_name?: string | null
          admin_notes?: string | null
          approval_status?: string
          bank_account_number?: string | null
          bank_name?: string | null
          change_count?: number
          created_at?: string
          id?: string
          ifsc_code?: string | null
          is_active?: boolean
          last_change_at?: string | null
          payment_method?: string
          provider_id: string
          provider_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          account_holder_name?: string | null
          admin_notes?: string | null
          approval_status?: string
          bank_account_number?: string | null
          bank_name?: string | null
          change_count?: number
          created_at?: string
          id?: string
          ifsc_code?: string | null
          is_active?: boolean
          last_change_at?: string | null
          payment_method?: string
          provider_id?: string
          provider_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      provider_subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          plan_id: string
          provider_id: string
          provider_type: string
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          plan_id: string
          provider_id: string
          provider_type: string
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          plan_id?: string
          provider_id?: string
          provider_type?: string
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_wallets: {
        Row: {
          available_balance: number
          id: string
          pending_withdrawal: number
          provider_id: string
          provider_type: string
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          id?: string
          pending_withdrawal?: number
          provider_id: string
          provider_type: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          id?: string
          pending_withdrawal?: number
          provider_id?: string
          provider_type?: string
          total_earned?: number
          total_withdrawn?: number
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
      rate_limits: {
        Row: {
          endpoint: string
          id: string
          request_count: number
          user_key: string
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          request_count?: number
          user_key: string
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          request_count?: number
          user_key?: string
          window_start?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          admin_notes: string | null
          amount: number
          appointment_id: string | null
          created_at: string
          id: string
          order_id: string | null
          processed_at: string | null
          reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount?: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          processed_at?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          processed_at?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      remedoo_orders: {
        Row: {
          cancelled_at: string | null
          delivery_address: string | null
          delivery_fee: number
          id: string
          items: Json
          notes: string | null
          payment_method: string
          payment_status: string
          placed_at: string
          prescription_rejection_reason: string | null
          prescription_status: string | null
          prescription_url: string | null
          prescription_verified_at: string | null
          prescription_verified_by: string | null
          refund_amount: number | null
          refund_status: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          id?: string
          items?: Json
          notes?: string | null
          payment_method?: string
          payment_status?: string
          placed_at?: string
          prescription_rejection_reason?: string | null
          prescription_status?: string | null
          prescription_url?: string | null
          prescription_verified_at?: string | null
          prescription_verified_by?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          id?: string
          items?: Json
          notes?: string | null
          payment_method?: string
          payment_status?: string
          placed_at?: string
          prescription_rejection_reason?: string | null
          prescription_status?: string | null
          prescription_url?: string | null
          prescription_verified_at?: string | null
          prescription_verified_by?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      remedoo_pharmacy_inventory: {
        Row: {
          batch_number: string | null
          brand_name: string | null
          category: string
          created_at: string
          description: string | null
          discount_percent: number | null
          dosage_info: string | null
          drug_category: string | null
          expiry_date: string | null
          generic_name: string | null
          id: string
          image_url: string | null
          is_active: boolean
          low_stock_threshold: number | null
          manufacturer: string | null
          manufacturing_date: string | null
          mrp: number | null
          name: string
          price: number
          requires_prescription: boolean
          side_effects: string | null
          stock_quantity: number
          supplier_contact: string | null
          supplier_name: string | null
          updated_at: string
          usage_instructions: string | null
        }
        Insert: {
          batch_number?: string | null
          brand_name?: string | null
          category?: string
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          dosage_info?: string | null
          drug_category?: string | null
          expiry_date?: string | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number | null
          manufacturer?: string | null
          manufacturing_date?: string | null
          mrp?: number | null
          name: string
          price?: number
          requires_prescription?: boolean
          side_effects?: string | null
          stock_quantity?: number
          supplier_contact?: string | null
          supplier_name?: string | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Update: {
          batch_number?: string | null
          brand_name?: string | null
          category?: string
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          dosage_info?: string | null
          drug_category?: string | null
          expiry_date?: string | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number | null
          manufacturer?: string | null
          manufacturing_date?: string | null
          mrp?: number | null
          name?: string
          price?: number
          requires_prescription?: boolean
          side_effects?: string | null
          stock_quantity?: number
          supplier_contact?: string | null
          supplier_name?: string | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_notes: string | null
          appointment_id: string | null
          comment: string | null
          created_at: string
          id: string
          provider_id: string
          provider_type: string
          rating: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          appointment_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          provider_id: string
          provider_type: string
          rating: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          appointment_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          provider_type?: string
          rating?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      service_areas: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          parent_id: string | null
          radius_km: number | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          parent_id?: string | null
          radius_km?: number | null
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          parent_id?: string | null
          radius_km?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_areas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "service_areas"
            referencedColumns: ["id"]
          },
        ]
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
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          features: Json | null
          id: string
          is_active: boolean
          name: string
          price: number
          provider_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          provider_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          provider_type?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
          sender_role: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
          sender_role?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
          sender_role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          sender_type: string
          status: string
          subject: string
          ticket_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sender_type?: string
          status?: string
          subject: string
          ticket_number?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sender_type?: string
          status?: string
          subject?: string
          ticket_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suspicious_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      symptom_conversations: {
        Row: {
          conversation_data: Json
          created_at: string | null
          id: string
          result_specialization: string | null
          symptoms_identified: string[] | null
          user_id: string
        }
        Insert: {
          conversation_data?: Json
          created_at?: string | null
          id?: string
          result_specialization?: string | null
          symptoms_identified?: string[] | null
          user_id: string
        }
        Update: {
          conversation_data?: Json
          created_at?: string | null
          id?: string
          result_specialization?: string | null
          symptoms_identified?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      symptom_questions: {
        Row: {
          answer_options: Json | null
          created_at: string | null
          id: string
          question_text: string
          sort_order: number | null
          symptom_id: string
        }
        Insert: {
          answer_options?: Json | null
          created_at?: string | null
          id?: string
          question_text: string
          sort_order?: number | null
          symptom_id: string
        }
        Update: {
          answer_options?: Json | null
          created_at?: string | null
          id?: string
          question_text?: string
          sort_order?: number | null
          symptom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_questions_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_rules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          recommended_specialization: string
          rule_name: string
          symptom_combination: string[]
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          recommended_specialization: string
          rule_name: string
          symptom_combination: string[]
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          recommended_specialization?: string
          rule_name?: string
          symptom_combination?: string[]
        }
        Relationships: []
      }
      symptoms: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_emergency: boolean | null
          symptom_name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_emergency?: boolean | null
          symptom_name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_emergency?: boolean | null
          symptom_name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          payment_gateway_response: Json | null
          payment_method: string | null
          payment_status: string | null
          payment_verification_status: string | null
          platform_commission: number | null
          provider_id: string | null
          provider_payout: number | null
          provider_type: string | null
          reference_id: string | null
          service_type: string
          transaction_timestamp: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_gateway_response?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          payment_verification_status?: string | null
          platform_commission?: number | null
          provider_id?: string | null
          provider_payout?: number | null
          provider_type?: string | null
          reference_id?: string | null
          service_type: string
          transaction_timestamp?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_gateway_response?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          payment_verification_status?: string | null
          platform_commission?: number | null
          provider_id?: string | null
          provider_payout?: number | null
          provider_type?: string | null
          reference_id?: string | null
          service_type?: string
          transaction_timestamp?: string | null
          user_id?: string
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
      doctors_public: {
        Row: {
          account_status: string | null
          approval_status: string | null
          bio: string | null
          consultation_duration: number | null
          consultation_fee: number | null
          created_at: string | null
          department_id: string | null
          emergency_available: boolean | null
          experience_years: number | null
          featured_sort_order: number | null
          hospital_id: string | null
          id: string | null
          image_url: string | null
          is_featured: boolean | null
          max_appointments_per_day: number | null
          name: string | null
          rating: number | null
          specialization: string | null
          vacation_dates: string[] | null
          working_hours: Json | null
        }
        Insert: {
          account_status?: string | null
          approval_status?: string | null
          bio?: string | null
          consultation_duration?: number | null
          consultation_fee?: number | null
          created_at?: string | null
          department_id?: string | null
          emergency_available?: boolean | null
          experience_years?: number | null
          featured_sort_order?: number | null
          hospital_id?: string | null
          id?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          max_appointments_per_day?: number | null
          name?: string | null
          rating?: number | null
          specialization?: string | null
          vacation_dates?: string[] | null
          working_hours?: Json | null
        }
        Update: {
          account_status?: string | null
          approval_status?: string | null
          bio?: string | null
          consultation_duration?: number | null
          consultation_fee?: number | null
          created_at?: string | null
          department_id?: string | null
          emergency_available?: boolean | null
          experience_years?: number | null
          featured_sort_order?: number | null
          hospital_id?: string | null
          id?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          max_appointments_per_day?: number | null
          name?: string | null
          rating?: number | null
          specialization?: string | null
          vacation_dates?: string[] | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals_public: {
        Row: {
          approval_status: string | null
          available_beds: number | null
          available_icu_beds: number | null
          beds: number | null
          created_at: string | null
          holidays: string[] | null
          icu_available: boolean | null
          id: string | null
          image_url: string | null
          is_government: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string | null
          rating: number | null
          total_beds: number | null
          total_icu_beds: number | null
          working_hours: Json | null
        }
        Insert: {
          approval_status?: string | null
          available_beds?: number | null
          available_icu_beds?: number | null
          beds?: number | null
          created_at?: string | null
          holidays?: string[] | null
          icu_available?: boolean | null
          id?: string | null
          image_url?: string | null
          is_government?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string | null
          rating?: number | null
          total_beds?: number | null
          total_icu_beds?: number | null
          working_hours?: Json | null
        }
        Update: {
          approval_status?: string | null
          available_beds?: number | null
          available_icu_beds?: number | null
          beds?: number | null
          created_at?: string | null
          holidays?: string[] | null
          icu_available?: boolean | null
          id?: string | null
          image_url?: string | null
          is_government?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string | null
          rating?: number | null
          total_beds?: number | null
          total_icu_beds?: number | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      labs_public: {
        Row: {
          approval_status: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string | null
          rating: number | null
          services: string[] | null
          working_hours: Json | null
        }
        Insert: {
          approval_status?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string | null
          rating?: number | null
          services?: string[] | null
          working_hours?: Json | null
        }
        Update: {
          approval_status?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string | null
          rating?: number | null
          services?: string[] | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      pharmacies_public: {
        Row: {
          approval_status: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string | null
          rating: number | null
          working_hours: Json | null
        }
        Insert: {
          approval_status?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string | null
          rating?: number | null
          working_hours?: Json | null
        }
        Update: {
          approval_status?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string | null
          rating?: number | null
          working_hours?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _endpoint: string
          _max_requests: number
          _user_key: string
          _window_seconds: number
        }
        Returns: boolean
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      get_ambulances_public: {
        Args: never
        Returns: {
          current_latitude: number
          current_longitude: number
          equipment_details: string
          hospital_id: string
          id: string
          status: string
          vehicle_number: string
          vehicle_type: string
        }[]
      }
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
