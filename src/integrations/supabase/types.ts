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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      academy_unlocks: {
        Row: {
          bb_paid: number
          content_id: string
          educator_id: string
          id: string
          student_id: string
          unlocked_at: string
        }
        Insert: {
          bb_paid?: number
          content_id: string
          educator_id: string
          id?: string
          student_id: string
          unlocked_at?: string
        }
        Update: {
          bb_paid?: number
          content_id?: string
          educator_id?: string
          id?: string
          student_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_unlocks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "creator_content"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_events: {
        Row: {
          content_id: string | null
          content_type: string | null
          country: string | null
          created_at: string
          currency: string | null
          email_hashed: string | null
          event_id: string
          event_name: string
          fbc: string | null
          fbp: string | null
          id: string
          meta_response: Json | null
          phone_hashed: string | null
          platform: string
          status: string
          tiktok_response: Json | null
          ttclid: string | null
          ttp: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          value_usd: number | null
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email_hashed?: string | null
          event_id: string
          event_name: string
          fbc?: string | null
          fbp?: string | null
          id?: string
          meta_response?: Json | null
          phone_hashed?: string | null
          platform?: string
          status?: string
          tiktok_response?: Json | null
          ttclid?: string | null
          ttp?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value_usd?: number | null
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email_hashed?: string | null
          event_id?: string
          event_name?: string
          fbc?: string | null
          fbp?: string | null
          id?: string
          meta_response?: Json | null
          phone_hashed?: string | null
          platform?: string
          status?: string
          tiktok_response?: Json | null
          ttclid?: string | null
          ttp?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value_usd?: number | null
        }
        Relationships: []
      }
      admin_action_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      affiliate_products: {
        Row: {
          created_at: string
          display_order: number
          external_link: string
          id: string
          image_url: string
          is_active: boolean
          price_cents: number
          product_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          external_link: string
          id?: string
          image_url: string
          is_active?: boolean
          price_cents: number
          product_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          external_link?: string
          id?: string
          image_url?: string
          is_active?: boolean
          price_cents?: number
          product_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointment_reviews: {
        Row: {
          appointment_id: string
          comment: string | null
          created_at: string | null
          id: string
          is_internal_only: boolean
          reviewee_id: string
          reviewer_id: string
          star_rating: number
        }
        Insert: {
          appointment_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          is_internal_only?: boolean
          reviewee_id: string
          reviewer_id: string
          star_rating: number
        }
        Update: {
          appointment_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          is_internal_only?: boolean
          reviewee_id?: string
          reviewer_id?: string
          star_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          barber_id: string
          barber_user_id: string
          client_id: string
          client_lat: number | null
          client_lng: number | null
          client_location_text: string | null
          created_at: string
          denial_reason: string | null
          duration_minutes: number
          escrow_amount_bb: number
          id: string
          is_deposit_only: boolean
          notes: string | null
          platform_fee_bb: number
          remainder_bb: number
          scheduled_at: string
          service_id: string | null
          sos_multiplier: number
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          barber_id: string
          barber_user_id: string
          client_id: string
          client_lat?: number | null
          client_lng?: number | null
          client_location_text?: string | null
          created_at?: string
          denial_reason?: string | null
          duration_minutes?: number
          escrow_amount_bb?: number
          id?: string
          is_deposit_only?: boolean
          notes?: string | null
          platform_fee_bb?: number
          remainder_bb?: number
          scheduled_at: string
          service_id?: string | null
          sos_multiplier?: number
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          barber_id?: string
          barber_user_id?: string
          client_id?: string
          client_lat?: number | null
          client_lng?: number | null
          client_location_text?: string | null
          created_at?: string
          denial_reason?: string | null
          duration_minutes?: number
          escrow_amount_bb?: number
          id?: string
          is_deposit_only?: boolean
          notes?: string | null
          platform_fee_bb?: number
          remainder_bb?: number
          scheduled_at?: string
          service_id?: string | null
          sos_multiplier?: number
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_stats"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barber_profiles"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "appointments_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "barber_services"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_availability: {
        Row: {
          barber_id: string
          barber_user_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          slot_duration_minutes: number
          start_time: string
        }
        Insert: {
          barber_id: string
          barber_user_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          slot_duration_minutes?: number
          start_time: string
        }
        Update: {
          barber_id?: string
          barber_user_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          slot_duration_minutes?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_availability_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_availability_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_stats"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "barber_availability_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barber_profiles"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "barber_availability_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "barber_availability_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      barber_blocked_slots: {
        Row: {
          barber_id: string
          barber_user_id: string
          blocked_end: string
          blocked_start: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          barber_id: string
          barber_user_id: string
          blocked_end: string
          blocked_start: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          barber_id?: string
          barber_user_id?: string
          blocked_end?: string
          blocked_start?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_blocked_slots_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_blocked_slots_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_stats"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "barber_blocked_slots_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barber_profiles"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "barber_blocked_slots_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "barber_blocked_slots_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      barber_bucks_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          stripe_payment_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          stripe_payment_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          stripe_payment_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      barber_profiles: {
        Row: {
          active_subscription_tier: string | null
          battles_created_this_month: number
          bio: string | null
          booking_message: string | null
          can_stream: boolean | null
          competition_categories: string[] | null
          country_code: string | null
          created_at: string
          default_no_show_fee_bb: number
          facebook_handle: string | null
          featured_video_id: string | null
          id: string
          instagram_handle: string | null
          is_live: boolean | null
          last_battle_reset: string
          last_live_check: string | null
          latitude: number | null
          live_video_id: string | null
          location: string | null
          location_sharing_enabled: boolean
          longitude: number | null
          m4m_certified: boolean
          m4m_lives_touched: number
          m4m_paid: boolean
          name: string
          nickname: string | null
          phone_number: string | null
          portfolio_url: string | null
          rating: number | null
          require_deposit: boolean
          specialty: string | null
          subscription_expires_at: string | null
          tier_level: number
          total_stream_minutes: number | null
          total_streams: number | null
          twitter_handle: string | null
          updated_at: string
          user_id: string
          years_experience: number | null
          youtube_channel_id: string | null
          youtube_handle: string | null
        }
        Insert: {
          active_subscription_tier?: string | null
          battles_created_this_month?: number
          bio?: string | null
          booking_message?: string | null
          can_stream?: boolean | null
          competition_categories?: string[] | null
          country_code?: string | null
          created_at?: string
          default_no_show_fee_bb?: number
          facebook_handle?: string | null
          featured_video_id?: string | null
          id?: string
          instagram_handle?: string | null
          is_live?: boolean | null
          last_battle_reset?: string
          last_live_check?: string | null
          latitude?: number | null
          live_video_id?: string | null
          location?: string | null
          location_sharing_enabled?: boolean
          longitude?: number | null
          m4m_certified?: boolean
          m4m_lives_touched?: number
          m4m_paid?: boolean
          name: string
          nickname?: string | null
          phone_number?: string | null
          portfolio_url?: string | null
          rating?: number | null
          require_deposit?: boolean
          specialty?: string | null
          subscription_expires_at?: string | null
          tier_level?: number
          total_stream_minutes?: number | null
          total_streams?: number | null
          twitter_handle?: string | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
          youtube_channel_id?: string | null
          youtube_handle?: string | null
        }
        Update: {
          active_subscription_tier?: string | null
          battles_created_this_month?: number
          bio?: string | null
          booking_message?: string | null
          can_stream?: boolean | null
          competition_categories?: string[] | null
          country_code?: string | null
          created_at?: string
          default_no_show_fee_bb?: number
          facebook_handle?: string | null
          featured_video_id?: string | null
          id?: string
          instagram_handle?: string | null
          is_live?: boolean | null
          last_battle_reset?: string
          last_live_check?: string | null
          latitude?: number | null
          live_video_id?: string | null
          location?: string | null
          location_sharing_enabled?: boolean
          longitude?: number | null
          m4m_certified?: boolean
          m4m_lives_touched?: number
          m4m_paid?: boolean
          name?: string
          nickname?: string | null
          phone_number?: string | null
          portfolio_url?: string | null
          rating?: number | null
          require_deposit?: boolean
          specialty?: string | null
          subscription_expires_at?: string | null
          tier_level?: number
          total_stream_minutes?: number | null
          total_streams?: number | null
          twitter_handle?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
          youtube_channel_id?: string | null
          youtube_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "barber_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      barber_services: {
        Row: {
          allows_house_call: boolean
          allows_sos: boolean
          barber_id: string
          barber_user_id: string
          created_at: string
          deposit_bb: number
          duration_minutes: number
          id: string
          is_active: boolean
          is_free_intro: boolean
          price_bb: number
          service_name: string
          updated_at: string
        }
        Insert: {
          allows_house_call?: boolean
          allows_sos?: boolean
          barber_id: string
          barber_user_id: string
          created_at?: string
          deposit_bb?: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_free_intro?: boolean
          price_bb?: number
          service_name: string
          updated_at?: string
        }
        Update: {
          allows_house_call?: boolean
          allows_sos?: boolean
          barber_id?: string
          barber_user_id?: string
          created_at?: string
          deposit_bb?: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_free_intro?: boolean
          price_bb?: number
          service_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_stats"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "barber_services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barber_profiles"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "barber_services_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "barber_services_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      barber_stats_secure: {
        Row: {
          barber_id: string
          metric_date: string
          tenant_id: string
          total_haircuts: number
        }
        Insert: {
          barber_id: string
          metric_date: string
          tenant_id: string
          total_haircuts?: number
        }
        Update: {
          barber_id?: string
          metric_date?: string
          tenant_id?: string
          total_haircuts?: number
        }
        Relationships: []
      }
      barber_subscription_tiers: {
        Row: {
          created_at: string
          display_name: string
          features: Json
          id: string
          price_monthly_cents: number
          tier_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          features?: Json
          id?: string
          price_monthly_cents: number
          tier_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          features?: Json
          id?: string
          price_monthly_cents?: number
          tier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      barber_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "barber_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_chat_messages: {
        Row: {
          battle_id: string | null
          created_at: string | null
          id: string
          is_deleted: boolean | null
          message: string
          user_id: string | null
        }
        Insert: {
          battle_id?: string | null
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          message: string
          user_id?: string | null
        }
        Update: {
          battle_id?: string | null
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          message?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_chat_messages_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_donations: {
        Row: {
          amount_bb: number
          battle_id: string | null
          challenge_id: string | null
          created_at: string
          donor_id: string
          id: string
          message: string | null
          recipient_barber_id: string | null
        }
        Insert: {
          amount_bb: number
          battle_id?: string | null
          challenge_id?: string | null
          created_at?: string
          donor_id: string
          id?: string
          message?: string | null
          recipient_barber_id?: string | null
        }
        Update: {
          amount_bb?: number
          battle_id?: string | null
          challenge_id?: string | null
          created_at?: string
          donor_id?: string
          id?: string
          message?: string | null
          recipient_barber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_donations_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_donations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "open_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "battle_donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "battle_donations_recipient_barber_id_fkey"
            columns: ["recipient_barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "battle_donations_recipient_barber_id_fkey"
            columns: ["recipient_barber_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      battle_participants: {
        Row: {
          battle_id: string
          id: string
          joined_at: string
          registration_date: string | null
          seed: number | null
          status: string
          tournament_id: string | null
          user_id: string
        }
        Insert: {
          battle_id: string
          id?: string
          joined_at?: string
          registration_date?: string | null
          seed?: number | null
          status?: string
          tournament_id?: string | null
          user_id: string
        }
        Update: {
          battle_id?: string
          id?: string
          joined_at?: string
          registration_date?: string | null
          seed?: number | null
          status?: string
          tournament_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_participants_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_battle_participants_battle_id"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_battle_participants_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_battle_participants_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      battle_predictions: {
        Row: {
          battle_id: string
          created_at: string
          id: string
          picked_barber_id: string
          user_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string
          id?: string
          picked_barber_id: string
          user_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string
          id?: string
          picked_barber_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_predictions_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_reactions: {
        Row: {
          barber_id: string | null
          battle_id: string | null
          created_at: string | null
          emoji: string
          id: string
          user_id: string | null
        }
        Insert: {
          barber_id?: string | null
          battle_id?: string | null
          created_at?: string | null
          emoji: string
          id?: string
          user_id?: string | null
        }
        Update: {
          barber_id?: string | null
          battle_id?: string | null
          created_at?: string | null
          emoji?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_reactions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_reactions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_stats"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "battle_reactions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barber_profiles"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "battle_reactions_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_submissions: {
        Row: {
          battle_id: string
          captions_vtt: string | null
          cloudflare_stream_uid: string | null
          created_at: string
          description: string | null
          id: string
          is_live_stream: boolean | null
          media_url: string
          status: string
          stream_ended_at: string | null
          stream_started_at: string | null
          thumbnail_url: string | null
          title: string | null
          user_id: string
          youtube_vod_url: string | null
        }
        Insert: {
          battle_id: string
          captions_vtt?: string | null
          cloudflare_stream_uid?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_live_stream?: boolean | null
          media_url: string
          status?: string
          stream_ended_at?: string | null
          stream_started_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          user_id: string
          youtube_vod_url?: string | null
        }
        Update: {
          battle_id?: string
          captions_vtt?: string | null
          cloudflare_stream_uid?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_live_stream?: boolean | null
          media_url?: string
          status?: string
          stream_ended_at?: string | null
          stream_started_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          user_id?: string
          youtube_vod_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_submissions_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_battle_submissions_battle_id"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_battle_submissions_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_battle_submissions_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      battle_votes: {
        Row: {
          battle_id: string
          created_at: string
          id: string
          submission_id: string
          voter_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string
          id?: string
          submission_id: string
          voter_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string
          id?: string
          submission_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_votes_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "battle_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_battle_votes_battle_id"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_battle_votes_submission_id"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "battle_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_battle_votes_voter_id"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_battle_votes_voter_id"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      battles: {
        Row: {
          barber_1_video_url: string | null
          barber_2_video_url: string | null
          barber1_id: string | null
          barber1_is_streaming: boolean | null
          barber1_live_viewers: number | null
          barber1_peak_viewers: number | null
          barber1_stream_sid: string | null
          barber1_stream_started_at: string | null
          barber1_youtube_video_id: string | null
          barber2_id: string | null
          barber2_is_streaming: boolean | null
          barber2_live_viewers: number | null
          barber2_peak_viewers: number | null
          barber2_stream_sid: string | null
          barber2_stream_started_at: string | null
          barber2_youtube_video_id: string | null
          battle_type: string
          category: string | null
          cloudflare_stream_uid: string | null
          cover_image_url: string | null
          created_at: string
          creation1_id: string | null
          creation2_id: string | null
          currency: string
          description: string | null
          egress_id: string | null
          ends_at: string | null
          forfeit_reason: string | null
          forfeit_winner_id: string | null
          id: string
          is_tournament_match: boolean | null
          ivs_channel_arn: string | null
          ivs_playback_url: string | null
          ivs_stream_key: string | null
          last_viewer_check: string | null
          live_viewers: number | null
          match_mode: string
          match_number: number | null
          max_participants: number | null
          organizer_id: string
          phase_id: string | null
          prize_amount: number
          round_number: number | null
          rules: string | null
          starts_at: string | null
          status: string
          stream_url: string | null
          streaming_type: string | null
          submission_deadline: string | null
          title: string
          tournament_id: string | null
          twilio_room_sid: string | null
          updated_at: string
          vote_count1: number | null
          vote_count2: number | null
          voting_ends_at: string | null
          winner_id: string | null
          youtube_stream_url: string | null
          youtube_vod_url: string | null
        }
        Insert: {
          barber_1_video_url?: string | null
          barber_2_video_url?: string | null
          barber1_id?: string | null
          barber1_is_streaming?: boolean | null
          barber1_live_viewers?: number | null
          barber1_peak_viewers?: number | null
          barber1_stream_sid?: string | null
          barber1_stream_started_at?: string | null
          barber1_youtube_video_id?: string | null
          barber2_id?: string | null
          barber2_is_streaming?: boolean | null
          barber2_live_viewers?: number | null
          barber2_peak_viewers?: number | null
          barber2_stream_sid?: string | null
          barber2_stream_started_at?: string | null
          barber2_youtube_video_id?: string | null
          battle_type?: string
          category?: string | null
          cloudflare_stream_uid?: string | null
          cover_image_url?: string | null
          created_at?: string
          creation1_id?: string | null
          creation2_id?: string | null
          currency?: string
          description?: string | null
          egress_id?: string | null
          ends_at?: string | null
          forfeit_reason?: string | null
          forfeit_winner_id?: string | null
          id?: string
          is_tournament_match?: boolean | null
          ivs_channel_arn?: string | null
          ivs_playback_url?: string | null
          ivs_stream_key?: string | null
          last_viewer_check?: string | null
          live_viewers?: number | null
          match_mode?: string
          match_number?: number | null
          max_participants?: number | null
          organizer_id: string
          phase_id?: string | null
          prize_amount?: number
          round_number?: number | null
          rules?: string | null
          starts_at?: string | null
          status?: string
          stream_url?: string | null
          streaming_type?: string | null
          submission_deadline?: string | null
          title: string
          tournament_id?: string | null
          twilio_room_sid?: string | null
          updated_at?: string
          vote_count1?: number | null
          vote_count2?: number | null
          voting_ends_at?: string | null
          winner_id?: string | null
          youtube_stream_url?: string | null
          youtube_vod_url?: string | null
        }
        Update: {
          barber_1_video_url?: string | null
          barber_2_video_url?: string | null
          barber1_id?: string | null
          barber1_is_streaming?: boolean | null
          barber1_live_viewers?: number | null
          barber1_peak_viewers?: number | null
          barber1_stream_sid?: string | null
          barber1_stream_started_at?: string | null
          barber1_youtube_video_id?: string | null
          barber2_id?: string | null
          barber2_is_streaming?: boolean | null
          barber2_live_viewers?: number | null
          barber2_peak_viewers?: number | null
          barber2_stream_sid?: string | null
          barber2_stream_started_at?: string | null
          barber2_youtube_video_id?: string | null
          battle_type?: string
          category?: string | null
          cloudflare_stream_uid?: string | null
          cover_image_url?: string | null
          created_at?: string
          creation1_id?: string | null
          creation2_id?: string | null
          currency?: string
          description?: string | null
          egress_id?: string | null
          ends_at?: string | null
          forfeit_reason?: string | null
          forfeit_winner_id?: string | null
          id?: string
          is_tournament_match?: boolean | null
          ivs_channel_arn?: string | null
          ivs_playback_url?: string | null
          ivs_stream_key?: string | null
          last_viewer_check?: string | null
          live_viewers?: number | null
          match_mode?: string
          match_number?: number | null
          max_participants?: number | null
          organizer_id?: string
          phase_id?: string | null
          prize_amount?: number
          round_number?: number | null
          rules?: string | null
          starts_at?: string | null
          status?: string
          stream_url?: string | null
          streaming_type?: string | null
          submission_deadline?: string | null
          title?: string
          tournament_id?: string | null
          twilio_room_sid?: string | null
          updated_at?: string
          vote_count1?: number | null
          vote_count2?: number | null
          voting_ends_at?: string | null
          winner_id?: string | null
          youtube_stream_url?: string | null
          youtube_vod_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battles_barber1_id_fkey"
            columns: ["barber1_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_barber1_id_fkey"
            columns: ["barber1_id"]
            isOneToOne: false
            referencedRelation: "barber_stats"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "battles_barber1_id_fkey"
            columns: ["barber1_id"]
            isOneToOne: false
            referencedRelation: "public_barber_profiles"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "battles_barber2_id_fkey"
            columns: ["barber2_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_barber2_id_fkey"
            columns: ["barber2_id"]
            isOneToOne: false
            referencedRelation: "barber_stats"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "battles_barber2_id_fkey"
            columns: ["barber2_id"]
            isOneToOne: false
            referencedRelation: "public_barber_profiles"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "battles_creation1_id_fkey"
            columns: ["creation1_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_creation2_id_fkey"
            columns: ["creation2_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_forfeit_winner_id_fkey"
            columns: ["forfeit_winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "battles_forfeit_winner_id_fkey"
            columns: ["forfeit_winner_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "battles_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "tournament_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bracket_matches: {
        Row: {
          barber1_id: string | null
          barber2_id: string | null
          battle_id: string | null
          bracket_position: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          match_number: number
          phase_id: string
          round_name: string
          round_number: number
          scheduled_at: string | null
          seed1: number | null
          seed2: number | null
          status: string | null
          tournament_id: string
          winner_id: string | null
          youtube_stream_url: string | null
        }
        Insert: {
          barber1_id?: string | null
          barber2_id?: string | null
          battle_id?: string | null
          bracket_position?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          match_number: number
          phase_id: string
          round_name: string
          round_number: number
          scheduled_at?: string | null
          seed1?: number | null
          seed2?: number | null
          status?: string | null
          tournament_id: string
          winner_id?: string | null
          youtube_stream_url?: string | null
        }
        Update: {
          barber1_id?: string | null
          barber2_id?: string | null
          battle_id?: string | null
          bracket_position?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          match_number?: number
          phase_id?: string
          round_name?: string
          round_number?: number
          scheduled_at?: string | null
          seed1?: number | null
          seed2?: number | null
          status?: string | null
          tournament_id?: string
          winner_id?: string | null
          youtube_stream_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bracket_matches_barber1_id_fkey"
            columns: ["barber1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bracket_matches_barber1_id_fkey"
            columns: ["barber1_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bracket_matches_barber2_id_fkey"
            columns: ["barber2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bracket_matches_barber2_id_fkey"
            columns: ["barber2_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bracket_matches_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "tournament_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bracket_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      category_prize_pools: {
        Row: {
          category: string
          created_at: string | null
          donation_contributions_cents: number
          entry_contributions_cents: number
          id: string
          last_updated: string | null
          participant_count: number
          platform_fees_collected_cents: number
          total_pool_cents: number
          tournament_year: number
        }
        Insert: {
          category: string
          created_at?: string | null
          donation_contributions_cents?: number
          entry_contributions_cents?: number
          id?: string
          last_updated?: string | null
          participant_count?: number
          platform_fees_collected_cents?: number
          total_pool_cents?: number
          tournament_year?: number
        }
        Update: {
          category?: string
          created_at?: string | null
          donation_contributions_cents?: number
          entry_contributions_cents?: number
          id?: string
          last_updated?: string | null
          participant_count?: number
          platform_fees_collected_cents?: number
          total_pool_cents?: number
          tournament_year?: number
        }
        Relationships: []
      }
      challenge_prize_pool: {
        Row: {
          created_at: string | null
          id: string
          last_updated: string | null
          platform_fees_collected_bb: number
          pool_year: number
          total_challenges_completed: number
          total_pool_bb: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          platform_fees_collected_bb?: number
          pool_year?: number
          total_challenges_completed?: number
          total_pool_bb?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          platform_fees_collected_bb?: number
          pool_year?: number
          total_challenges_completed?: number
          total_pool_bb?: number
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          no_show_count: number
          total_appointments: number
          total_votes_cast: number | null
          updated_at: string
          user_id: string
          username: string
          voting_power: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          no_show_count?: number
          total_appointments?: number
          total_votes_cast?: number | null
          updated_at?: string
          user_id: string
          username: string
          voting_power?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          no_show_count?: number
          total_appointments?: number
          total_votes_cast?: number | null
          updated_at?: string
          user_id?: string
          username?: string
          voting_power?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          tagged_creator_ids: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          tagged_creator_ids?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          tagged_creator_ids?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolution_action: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolution_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolution_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      creations: {
        Row: {
          barber_id: string
          captions_vtt: string | null
          category: string | null
          cloudflare_stream_uid: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          media_url: string
          overlay_payload: Json | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          barber_id: string
          captions_vtt?: string | null
          category?: string | null
          cloudflare_stream_uid?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          media_url: string
          overlay_payload?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          barber_id?: string
          captions_vtt?: string | null
          category?: string | null
          cloudflare_stream_uid?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          media_url?: string
          overlay_payload?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creations_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creations_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_stats"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "creations_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barber_profiles"
            referencedColumns: ["barber_id"]
          },
        ]
      }
      creator_content: {
        Row: {
          boost_amount_bb: number | null
          captions_vtt: string | null
          cloudflare_stream_uid: string | null
          content_category: string | null
          content_type: string
          created_at: string
          creator_id: string
          description: string | null
          earnings: number | null
          id: string
          is_published: boolean | null
          likes: number | null
          media_url: string | null
          overlay_payload: Json | null
          price_bb: number
          promote_to_feed: boolean | null
          shares: number | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          boost_amount_bb?: number | null
          captions_vtt?: string | null
          cloudflare_stream_uid?: string | null
          content_category?: string | null
          content_type: string
          created_at?: string
          creator_id: string
          description?: string | null
          earnings?: number | null
          id?: string
          is_published?: boolean | null
          likes?: number | null
          media_url?: string | null
          overlay_payload?: Json | null
          price_bb?: number
          promote_to_feed?: boolean | null
          shares?: number | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          boost_amount_bb?: number | null
          captions_vtt?: string | null
          cloudflare_stream_uid?: string | null
          content_category?: string | null
          content_type?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          earnings?: number | null
          id?: string
          is_published?: boolean | null
          likes?: number | null
          media_url?: string | null
          overlay_payload?: Json | null
          price_bb?: number
          promote_to_feed?: boolean | null
          shares?: number | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_content_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "creator_content_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      creator_follows: {
        Row: {
          created_at: string
          creator_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      creator_likes: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_milestones: {
        Row: {
          achieved_at: string
          creator_id: string
          id: string
          milestone_type: string
          milestone_value: number | null
          reward_amount: number
        }
        Insert: {
          achieved_at?: string
          creator_id: string
          id?: string
          milestone_type: string
          milestone_value?: number | null
          reward_amount: number
        }
        Update: {
          achieved_at?: string
          creator_id?: string
          id?: string
          milestone_type?: string
          milestone_value?: number | null
          reward_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_milestones_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "creator_milestones_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      creator_subscriptions: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      dmca_certifications: {
        Row: {
          certified_at: string
          content_id: string | null
          content_type: string
          content_url: string | null
          id: string
          ip_hash: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          certified_at?: string
          content_id?: string | null
          content_type: string
          content_url?: string | null
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          certified_at?: string
          content_id?: string | null
          content_type?: string
          content_url?: string | null
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      donated_services_inventory: {
        Row: {
          barber_id: string
          barter_group_id: string
          bb_value: number
          created_at: string
          granted_perk_category: string
          granted_perk_details: Json | null
          id: string
          service_id: string
          service_type: string
          slot_datetime: string
          status: string
          time_tier: string
        }
        Insert: {
          barber_id: string
          barter_group_id: string
          bb_value?: number
          created_at?: string
          granted_perk_category: string
          granted_perk_details?: Json | null
          id?: string
          service_id: string
          service_type: string
          slot_datetime: string
          status?: string
          time_tier: string
        }
        Update: {
          barber_id?: string
          barter_group_id?: string
          bb_value?: number
          created_at?: string
          granted_perk_category?: string
          granted_perk_details?: Json | null
          id?: string
          service_id?: string
          service_type?: string
          slot_datetime?: string
          status?: string
          time_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "donated_services_inventory_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "donated_services_inventory_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "donated_services_inventory_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "barber_services"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount_cents: number
          created_at: string
          creator_id: string
          currency: string
          fan_id: string
          id: string
          message: string | null
          status: string
          stripe_session_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          creator_id: string
          currency?: string
          fan_id: string
          id?: string
          message?: string | null
          status?: string
          stripe_session_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          creator_id?: string
          currency?: string
          fan_id?: string
          id?: string
          message?: string | null
          status?: string
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      earning_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earning_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "earning_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          attempts: number
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          msg_id: number | null
          queue_name: string
          recipient_email: string
          recipient_id: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          msg_id?: number | null
          queue_name: string
          recipient_email: string
          recipient_id?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          msg_id?: number | null
          queue_name?: string
          recipient_email?: string
          recipient_id?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_rate_per_min: number
          batch_size: number
          delay_ms: number
          id: number
          max_retries: number
          otp_ttl_seconds: number
          paused: boolean
          trans_rate_per_min: number
          updated_at: string
        }
        Insert: {
          auth_rate_per_min?: number
          batch_size?: number
          delay_ms?: number
          id?: number
          max_retries?: number
          otp_ttl_seconds?: number
          paused?: boolean
          trans_rate_per_min?: number
          updated_at?: string
        }
        Update: {
          auth_rate_per_min?: number
          batch_size?: number
          delay_ms?: number
          id?: number
          max_retries?: number
          otp_ttl_seconds?: number
          paused?: boolean
          trans_rate_per_min?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feed_items: {
        Row: {
          content_id: string
          content_type: Database["public"]["Enums"]["feed_content_type"]
          created_at: string | null
          creator_id: string | null
          id: string
          is_locked: boolean | null
          promote_boost: number | null
          rank_score: number | null
          source_table: string | null
        }
        Insert: {
          content_id: string
          content_type?: Database["public"]["Enums"]["feed_content_type"]
          created_at?: string | null
          creator_id?: string | null
          id?: string
          is_locked?: boolean | null
          promote_boost?: number | null
          rank_score?: number | null
          source_table?: string | null
        }
        Update: {
          content_id?: string
          content_type?: Database["public"]["Enums"]["feed_content_type"]
          created_at?: string | null
          creator_id?: string | null
          id?: string
          is_locked?: boolean | null
          promote_boost?: number | null
          rank_score?: number | null
          source_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_items_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feed_items_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      gig_applications: {
        Row: {
          barber_id: string
          created_at: string
          gig_id: string
          id: string
          message: string | null
          status: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          gig_id: string
          id?: string
          message?: string | null
          status?: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          gig_id?: string
          id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_applications_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gig_applications_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gig_applications_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "sponsor_gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      house_call_bounties: {
        Row: {
          appointment_id: string | null
          bounty_amount_bb: number
          claimed_at: string | null
          claimed_by_barber_id: string | null
          claimed_by_user_id: string | null
          client_id: string
          created_at: string
          expires_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_text: string
          notes: string | null
          preferred_date: string | null
          service_description: string | null
          status: string
        }
        Insert: {
          appointment_id?: string | null
          bounty_amount_bb: number
          claimed_at?: string | null
          claimed_by_barber_id?: string | null
          claimed_by_user_id?: string | null
          client_id: string
          created_at?: string
          expires_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_text: string
          notes?: string | null
          preferred_date?: string | null
          service_description?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string | null
          bounty_amount_bb?: number
          claimed_at?: string | null
          claimed_by_barber_id?: string | null
          claimed_by_user_id?: string | null
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string
          notes?: string | null
          preferred_date?: string | null
          service_description?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_call_bounties_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_call_bounties_claimed_by_barber_id_fkey"
            columns: ["claimed_by_barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_call_bounties_claimed_by_barber_id_fkey"
            columns: ["claimed_by_barber_id"]
            isOneToOne: false
            referencedRelation: "barber_stats"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "house_call_bounties_claimed_by_barber_id_fkey"
            columns: ["claimed_by_barber_id"]
            isOneToOne: false
            referencedRelation: "public_barber_profiles"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "house_call_bounties_claimed_by_user_id_fkey"
            columns: ["claimed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "house_call_bounties_claimed_by_user_id_fkey"
            columns: ["claimed_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "house_call_bounties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "house_call_bounties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_challenge_votes: {
        Row: {
          battle_id: string
          created_at: string
          id: string
          picked_barber_id: string
          voter_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string
          id?: string
          picked_barber_id: string
          voter_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string
          id?: string
          picked_barber_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_challenge_votes_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      m4m_fund_ledger: {
        Row: {
          amount_bb: number
          created_at: string
          id: string
          reference_id: string | null
          source_type: string
        }
        Insert: {
          amount_bb: number
          created_at?: string
          id?: string
          reference_id?: string | null
          source_type: string
        }
        Update: {
          amount_bb?: number
          created_at?: string
          id?: string
          reference_id?: string | null
          source_type?: string
        }
        Relationships: []
      }
      m4m_session_logs: {
        Row: {
          barber_user_id: string
          client_user_id: string | null
          created_at: string | null
          id: string
          verification_code: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          barber_user_id: string
          client_user_id?: string | null
          created_at?: string | null
          id?: string
          verification_code: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          barber_user_id?: string
          client_user_id?: string | null
          created_at?: string | null
          id?: string
          verification_code?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      marketing_leads: {
        Row: {
          barber_status: string | null
          claimed_at: string | null
          claimed_user_id: string | null
          converted: boolean | null
          country_code: string | null
          created_at: string | null
          device_fingerprint: string | null
          email: string
          fbc: string | null
          fbp: string | null
          gbraid: string | null
          gclid: string | null
          id: string
          linked_user_id: string | null
          max_spins: number | null
          phone_number: string | null
          prize_bb: number | null
          prize_duration_months: number | null
          prize_expires_at: string | null
          prize_id: string | null
          prize_label: string | null
          prize_locked_at: string | null
          prize_tier: string | null
          prize_tier_color: string | null
          raffle_ticket_code: string | null
          role: string | null
          shared: boolean | null
          source_url: string | null
          specialties: string[] | null
          spin_eligible: boolean | null
          spin_ip: string | null
          spins_used: number | null
          ttclid: string | null
          ttp: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          wbraid: string | null
          zip_code: string | null
        }
        Insert: {
          barber_status?: string | null
          claimed_at?: string | null
          claimed_user_id?: string | null
          converted?: boolean | null
          country_code?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          email: string
          fbc?: string | null
          fbp?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          linked_user_id?: string | null
          max_spins?: number | null
          phone_number?: string | null
          prize_bb?: number | null
          prize_duration_months?: number | null
          prize_expires_at?: string | null
          prize_id?: string | null
          prize_label?: string | null
          prize_locked_at?: string | null
          prize_tier?: string | null
          prize_tier_color?: string | null
          raffle_ticket_code?: string | null
          role?: string | null
          shared?: boolean | null
          source_url?: string | null
          specialties?: string[] | null
          spin_eligible?: boolean | null
          spin_ip?: string | null
          spins_used?: number | null
          ttclid?: string | null
          ttp?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          wbraid?: string | null
          zip_code?: string | null
        }
        Update: {
          barber_status?: string | null
          claimed_at?: string | null
          claimed_user_id?: string | null
          converted?: boolean | null
          country_code?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          email?: string
          fbc?: string | null
          fbp?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          linked_user_id?: string | null
          max_spins?: number | null
          phone_number?: string | null
          prize_bb?: number | null
          prize_duration_months?: number | null
          prize_expires_at?: string | null
          prize_id?: string | null
          prize_label?: string | null
          prize_locked_at?: string | null
          prize_tier?: string | null
          prize_tier_color?: string | null
          raffle_ticket_code?: string | null
          role?: string | null
          shared?: boolean | null
          source_url?: string | null
          specialties?: string[] | null
          spin_eligible?: boolean | null
          spin_ip?: string | null
          spins_used?: number | null
          ttclid?: string | null
          ttp?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          wbraid?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      match_results: {
        Row: {
          barber1_id: string | null
          barber1_points: number | null
          barber1_weighted_votes: number | null
          barber2_id: string | null
          barber2_points: number | null
          barber2_weighted_votes: number | null
          battle_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          is_draw: boolean | null
          match_type: string
          phase_id: string | null
          round_number: number | null
          tournament_id: string | null
          winner_id: string | null
          youtube_stream_url: string | null
        }
        Insert: {
          barber1_id?: string | null
          barber1_points?: number | null
          barber1_weighted_votes?: number | null
          barber2_id?: string | null
          barber2_points?: number | null
          barber2_weighted_votes?: number | null
          battle_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_draw?: boolean | null
          match_type: string
          phase_id?: string | null
          round_number?: number | null
          tournament_id?: string | null
          winner_id?: string | null
          youtube_stream_url?: string | null
        }
        Update: {
          barber1_id?: string | null
          barber1_points?: number | null
          barber1_weighted_votes?: number | null
          barber2_id?: string | null
          barber2_points?: number | null
          barber2_weighted_votes?: number | null
          battle_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_draw?: boolean | null
          match_type?: string
          phase_id?: string | null
          round_number?: number | null
          tournament_id?: string | null
          winner_id?: string | null
          youtube_stream_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_results_barber1_id_fkey"
            columns: ["barber1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_results_barber1_id_fkey"
            columns: ["barber1_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_results_barber2_id_fkey"
            columns: ["barber2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_results_barber2_id_fkey"
            columns: ["barber2_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_results_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: true
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "tournament_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_results_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          reason: string | null
          target_content_id: string | null
          target_content_type: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_content_id?: string | null
          target_content_type?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_content_id?: string | null
          target_content_type?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      moderation_strikes: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string
          id: string
          issued_by: string | null
          reason: string
          report_id: string | null
          user_id: string
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          reason: string
          report_id?: string | null
          user_id: string
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          reason?: string
          report_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      music_tracks: {
        Row: {
          artist: string | null
          audio_url: string
          bpm: number | null
          created_at: string
          duration_seconds: number | null
          genre: string | null
          id: string
          is_active: boolean
          license: string
          mood: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          artist?: string | null
          audio_url: string
          bpm?: number | null
          created_at?: string
          duration_seconds?: number | null
          genre?: string | null
          id?: string
          is_active?: boolean
          license?: string
          mood?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          artist?: string | null
          audio_url?: string
          bpm?: number | null
          created_at?: string
          duration_seconds?: number | null
          genre?: string | null
          id?: string
          is_active?: boolean
          license?: string
          mood?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          dismissed_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          dismissed_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          dismissed_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      open_challenges: {
        Row: {
          accepted_at: string | null
          accepted_by_id: string | null
          accepted_by_username: string | null
          battle_id: string | null
          bounty_amount: number | null
          bounty_currency: string | null
          bounty_description: string | null
          challenger_id: string
          challenger_stream_url: string
          challenger_username: string
          challenger_youtube_video_id: string | null
          created_at: string | null
          donations_total: number | null
          duration_minutes: number
          expires_at: string | null
          id: string
          match_mode: string
          opponent_stake_matched: boolean | null
          platform_fee_collected: number | null
          pot_total: number | null
          stake_amount: number | null
          status: string | null
          target_barber_id: string | null
          title: string
          winner_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_id?: string | null
          accepted_by_username?: string | null
          battle_id?: string | null
          bounty_amount?: number | null
          bounty_currency?: string | null
          bounty_description?: string | null
          challenger_id: string
          challenger_stream_url: string
          challenger_username: string
          challenger_youtube_video_id?: string | null
          created_at?: string | null
          donations_total?: number | null
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          match_mode?: string
          opponent_stake_matched?: boolean | null
          platform_fee_collected?: number | null
          pot_total?: number | null
          stake_amount?: number | null
          status?: string | null
          target_barber_id?: string | null
          title: string
          winner_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by_id?: string | null
          accepted_by_username?: string | null
          battle_id?: string | null
          bounty_amount?: number | null
          bounty_currency?: string | null
          bounty_description?: string | null
          challenger_id?: string
          challenger_stream_url?: string
          challenger_username?: string
          challenger_youtube_video_id?: string | null
          created_at?: string | null
          donations_total?: number | null
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          match_mode?: string
          opponent_stake_matched?: boolean | null
          platform_fee_collected?: number | null
          pot_total?: number | null
          stake_amount?: number | null
          status?: string | null
          target_barber_id?: string | null
          title?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_challenges_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_challenges_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "open_challenges_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          product_type: string | null
          status: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          product_type?: string | null
          status?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          product_type?: string | null
          status?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pending_payouts: {
        Row: {
          amount_bb: number
          battle_id: string | null
          challenge_id: string | null
          created_at: string | null
          id: string
          payout_type: string
          released_at: string | null
          scheduled_release_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount_bb: number
          battle_id?: string | null
          challenge_id?: string | null
          created_at?: string | null
          id?: string
          payout_type: string
          released_at?: string | null
          scheduled_release_at: string
          status?: string
          user_id: string
        }
        Update: {
          amount_bb?: number
          battle_id?: string | null
          challenge_id?: string | null
          created_at?: string | null
          id?: string
          payout_type?: string
          released_at?: string | null
          scheduled_release_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_payouts_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      platform_state: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      platform_transactions: {
        Row: {
          amount_cents: number
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          source_user_id: string | null
          transaction_type: string
        }
        Insert: {
          amount_cents: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          source_user_id?: string | null
          transaction_type: string
        }
        Update: {
          amount_cents?: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          source_user_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_transactions_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_transactions_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_orders: {
        Row: {
          created_at: string
          discount_applied: number
          id: string
          product_id: string
          quantity: number
          shipping_address: Json | null
          shopify_order_id: string | null
          status: string
          stripe_payment_id: string | null
          total_bb_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_applied?: number
          id?: string
          product_id: string
          quantity?: number
          shipping_address?: Json | null
          shopify_order_id?: string | null
          status?: string
          stripe_payment_id?: string | null
          total_bb_cost: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_applied?: number
          id?: string
          product_id?: string
          quantity?: number
          shipping_address?: Json | null
          shopify_order_id?: string | null
          status?: string
          stripe_payment_id?: string | null
          total_bb_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barber_discount_percent: number
          category: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          is_premium_gear: boolean
          name: string
          price_bb: number
          price_usd_cents: number | null
          requires_shipping: boolean
          shopify_product_id: string | null
          shopify_variant_id: string | null
          stock_quantity: number | null
          tier_required: string | null
          updated_at: string
        }
        Insert: {
          barber_discount_percent?: number
          category: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_premium_gear?: boolean
          name: string
          price_bb: number
          price_usd_cents?: number | null
          requires_shipping?: boolean
          shopify_product_id?: string | null
          shopify_variant_id?: string | null
          stock_quantity?: number | null
          tier_required?: string | null
          updated_at?: string
        }
        Update: {
          barber_discount_percent?: number
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_premium_gear?: boolean
          name?: string
          price_bb?: number
          price_usd_cents?: number | null
          requires_shipping?: boolean
          shopify_product_id?: string | null
          shopify_variant_id?: string | null
          stock_quantity?: number | null
          tier_required?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          barber_bucks: number | null
          bio: string | null
          country_code: string | null
          created_at: string
          creator_level: string | null
          display_name: string | null
          display_name_changed_at: string | null
          favorite_creator_id: string | null
          id: string
          is_banned: boolean
          is_creator: boolean | null
          is_verified_by_competition: boolean | null
          profile_id: string | null
          referral_code: string | null
          referred_by: string | null
          sub_category: string | null
          three_x_vote_expires_at: string | null
          total_earnings: number | null
          updated_at: string
          user_id: string
          user_type: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          barber_bucks?: number | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          creator_level?: string | null
          display_name?: string | null
          display_name_changed_at?: string | null
          favorite_creator_id?: string | null
          id?: string
          is_banned?: boolean
          is_creator?: boolean | null
          is_verified_by_competition?: boolean | null
          profile_id?: string | null
          referral_code?: string | null
          referred_by?: string | null
          sub_category?: string | null
          three_x_vote_expires_at?: string | null
          total_earnings?: number | null
          updated_at?: string
          user_id: string
          user_type?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          barber_bucks?: number | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          creator_level?: string | null
          display_name?: string | null
          display_name_changed_at?: string | null
          favorite_creator_id?: string | null
          id?: string
          is_banned?: boolean
          is_creator?: boolean | null
          is_verified_by_competition?: boolean | null
          profile_id?: string | null
          referral_code?: string | null
          referred_by?: string | null
          sub_category?: string | null
          three_x_vote_expires_at?: string | null
          total_earnings?: number | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promotion_gate_visitors: {
        Row: {
          completed: boolean
          created_at: string
          fingerprint: string
          first_seen_at: string
          id: string
          ip_hash: string | null
          last_seen_at: string
          shown_count: number
          skipped: boolean
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          fingerprint: string
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          shown_count?: number
          skipped?: boolean
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          fingerprint?: string
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          shown_count?: number
          skipped?: boolean
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          platform: string | null
          subscription: Json
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          platform?: string | null
          subscription: Json
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          platform?: string | null
          subscription?: Json
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      raffle_entries: {
        Row: {
          barber_status: string | null
          bb_awarded: number
          claimed_at: string | null
          claimed_user_id: string | null
          country_code: string
          created_at: string
          device_fingerprint: string | null
          draw_week: string
          email: string
          id: string
          ip_address: string | null
          role: string
          specialties: string[] | null
          ticket_code: string
          zip_code: string | null
        }
        Insert: {
          barber_status?: string | null
          bb_awarded: number
          claimed_at?: string | null
          claimed_user_id?: string | null
          country_code: string
          created_at?: string
          device_fingerprint?: string | null
          draw_week: string
          email: string
          id?: string
          ip_address?: string | null
          role: string
          specialties?: string[] | null
          ticket_code: string
          zip_code?: string | null
        }
        Update: {
          barber_status?: string | null
          bb_awarded?: number
          claimed_at?: string | null
          claimed_user_id?: string | null
          country_code?: string
          created_at?: string
          device_fingerprint?: string | null
          draw_week?: string
          email?: string
          id?: string
          ip_address?: string | null
          role?: string
          specialties?: string[] | null
          ticket_code?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      referral_tracking: {
        Row: {
          bonus_earned: number | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string | null
        }
        Insert: {
          bonus_earned?: number | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string | null
        }
        Update: {
          bonus_earned?: number | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_tracking_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_tracking_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_tracking_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_tracking_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reputation_scores: {
        Row: {
          avg_star_rating: number | null
          id: string
          internal_top_tags: Json | null
          last_computed_at: string | null
          risk_flags: Json | null
          top_tags: Json | null
          total_reviews: number | null
          user_id: string
        }
        Insert: {
          avg_star_rating?: number | null
          id?: string
          internal_top_tags?: Json | null
          last_computed_at?: string | null
          risk_flags?: Json | null
          top_tags?: Json | null
          total_reviews?: number | null
          user_id: string
        }
        Update: {
          avg_star_rating?: number | null
          id?: string
          internal_top_tags?: Json | null
          last_computed_at?: string | null
          risk_flags?: Json | null
          top_tags?: Json | null
          total_reviews?: number | null
          user_id?: string
        }
        Relationships: []
      }
      review_tags: {
        Row: {
          id: string
          is_internal_only: boolean
          is_negative: boolean
          review_id: string
          tag_slug: string
        }
        Insert: {
          id?: string
          is_internal_only?: boolean
          is_negative?: boolean
          review_id: string
          tag_slug: string
        }
        Update: {
          id?: string
          is_internal_only?: boolean
          is_negative?: boolean
          review_id?: string
          tag_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_tags_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "appointment_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_events: {
        Row: {
          city_slug: string | null
          created_at: string
          event_name: string
          id: string
          path: string | null
          props: Json
          referrer: string | null
          service_slug: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          city_slug?: string | null
          created_at?: string
          event_name: string
          id?: string
          path?: string | null
          props?: Json
          referrer?: string | null
          service_slug?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          city_slug?: string | null
          created_at?: string
          event_name?: string
          id?: string
          path?: string | null
          props?: Json
          referrer?: string | null
          service_slug?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      skill_memory: {
        Row: {
          confidence: number | null
          id: string
          memory_key: string
          memory_value: Json
          skill_id: string
          source_run_ids: string[] | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          id?: string
          memory_key: string
          memory_value?: Json
          skill_id: string
          source_run_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          id?: string
          memory_key?: string
          memory_value?: Json
          skill_id?: string
          source_run_ids?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      skill_runs: {
        Row: {
          confidence: number | null
          decision: Json | null
          id: string
          metrics_after: Json | null
          metrics_before: Json | null
          outcome_notes: string | null
          outcome_score: number | null
          ran_at: string
          reasoning: string | null
          skill_id: string
        }
        Insert: {
          confidence?: number | null
          decision?: Json | null
          id?: string
          metrics_after?: Json | null
          metrics_before?: Json | null
          outcome_notes?: string | null
          outcome_score?: number | null
          ran_at?: string
          reasoning?: string | null
          skill_id: string
        }
        Update: {
          confidence?: number | null
          decision?: Json | null
          id?: string
          metrics_after?: Json | null
          metrics_before?: Json | null
          outcome_notes?: string | null
          outcome_score?: number | null
          ran_at?: string
          reasoning?: string | null
          skill_id?: string
        }
        Relationships: []
      }
      sovereign_audit_log: {
        Row: {
          action_category: string
          action_type: string
          after_state: Json | null
          before_state: Json | null
          created_at: string | null
          id: string
          notes: string | null
          severity: string | null
          sovereign_id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action_category: string
          action_type: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          severity?: string | null
          sovereign_id: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action_category?: string
          action_type?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          severity?: string | null
          sovereign_id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      sponsor_ad_clicks: {
        Row: {
          click_type: string
          created_at: string | null
          id: string
          slide_type: string | null
          sponsor_ad_id: string
          user_id: string | null
        }
        Insert: {
          click_type?: string
          created_at?: string | null
          id?: string
          slide_type?: string | null
          sponsor_ad_id: string
          user_id?: string | null
        }
        Update: {
          click_type?: string
          created_at?: string | null
          id?: string
          slide_type?: string | null
          sponsor_ad_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_ad_clicks_sponsor_ad_id_fkey"
            columns: ["sponsor_ad_id"]
            isOneToOne: false
            referencedRelation: "sponsor_ads"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_ads: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          ends_at: string | null
          highlight_end: number
          id: string
          is_active: boolean
          link: string | null
          logo_url: string | null
          message: string
          name: string
          product_image_url: string | null
          product_image_url_2: string | null
          product_link: string | null
          promo_text: string | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          ends_at?: string | null
          highlight_end?: number
          id?: string
          is_active?: boolean
          link?: string | null
          logo_url?: string | null
          message: string
          name: string
          product_image_url?: string | null
          product_image_url_2?: string | null
          product_link?: string | null
          promo_text?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          ends_at?: string | null
          highlight_end?: number
          id?: string
          is_active?: boolean
          link?: string | null
          logo_url?: string | null
          message?: string
          name?: string
          product_image_url?: string | null
          product_image_url_2?: string | null
          product_link?: string | null
          promo_text?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sponsor_gigs: {
        Row: {
          applications_count: number
          budget_bb: number
          charity_percent: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          location: string | null
          slots: number
          sponsor_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          applications_count?: number
          budget_bb?: number
          charity_percent?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          slots?: number
          sponsor_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          applications_count?: number
          budget_bb?: number
          charity_percent?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          slots?: number
          sponsor_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_gigs_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sponsor_gigs_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stream_sessions: {
        Row: {
          barber_id: string | null
          barber_position: number | null
          battle_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          error_message: string | null
          id: string
          participant_sid: string | null
          peak_viewers: number | null
          recording_sid: string | null
          recording_status: string | null
          recording_url: string | null
          room_name: string | null
          room_sid: string | null
          started_at: string | null
          status: string | null
          stream_type: string
          total_views: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          barber_id?: string | null
          barber_position?: number | null
          battle_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          participant_sid?: string | null
          peak_viewers?: number | null
          recording_sid?: string | null
          recording_status?: string | null
          recording_url?: string | null
          room_name?: string | null
          room_sid?: string | null
          started_at?: string | null
          status?: string | null
          stream_type?: string
          total_views?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          barber_id?: string | null
          barber_position?: number | null
          battle_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          participant_sid?: string | null
          peak_viewers?: number | null
          recording_sid?: string | null
          recording_status?: string | null
          recording_url?: string | null
          room_name?: string | null
          room_sid?: string | null
          started_at?: string | null
          status?: string | null
          stream_type?: string
          total_views?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_sessions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_sessions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_stats"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "stream_sessions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barber_profiles"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "stream_sessions_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reason?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reason?: string
        }
        Relationships: []
      }
      system_announcements: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          message: string
          priority: number | null
          title: string
          type: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          message: string
          priority?: number | null
          title: string
          type?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          message?: string
          priority?: number | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      tournament_phases: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          matches_required: number | null
          phase_name: string
          phase_order: number
          phase_type: string
          start_date: string | null
          status: string | null
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          matches_required?: number | null
          phase_name: string
          phase_order: number
          phase_type: string
          start_date?: string | null
          status?: string | null
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          matches_required?: number | null
          phase_name?: string
          phase_order?: number
          phase_type?: string
          start_date?: string | null
          status?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_phases_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_queue: {
        Row: {
          barber_profile_id: string
          category: string
          country_code: string
          created_at: string
          id: string
          matched_battle_id: string | null
          payment_id: string | null
          preferred_time_slot: string | null
          queue_timestamp: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          barber_profile_id: string
          category: string
          country_code: string
          created_at?: string
          id?: string
          matched_battle_id?: string | null
          payment_id?: string | null
          preferred_time_slot?: string | null
          queue_timestamp?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          barber_profile_id?: string
          category?: string
          country_code?: string
          created_at?: string
          id?: string
          matched_battle_id?: string | null
          payment_id?: string | null
          preferred_time_slot?: string | null
          queue_timestamp?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_queue_barber_profile_id_fkey"
            columns: ["barber_profile_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_queue_barber_profile_id_fkey"
            columns: ["barber_profile_id"]
            isOneToOne: false
            referencedRelation: "barber_stats"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "tournament_queue_barber_profile_id_fkey"
            columns: ["barber_profile_id"]
            isOneToOne: false
            referencedRelation: "public_barber_profiles"
            referencedColumns: ["barber_id"]
          },
          {
            foreignKeyName: "tournament_queue_matched_battle_id_fkey"
            columns: ["matched_battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_queue_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_standings: {
        Row: {
          barber_id: string
          created_at: string | null
          draws: number | null
          id: string
          losses: number | null
          matches_played: number | null
          phase_id: string | null
          points: number | null
          qualified: boolean | null
          rank: number | null
          show_up_points: number | null
          tournament_id: string
          updated_at: string | null
          vote_difference: number | null
          votes_against: number | null
          votes_for: number | null
          wins: number | null
        }
        Insert: {
          barber_id: string
          created_at?: string | null
          draws?: number | null
          id?: string
          losses?: number | null
          matches_played?: number | null
          phase_id?: string | null
          points?: number | null
          qualified?: boolean | null
          rank?: number | null
          show_up_points?: number | null
          tournament_id: string
          updated_at?: string | null
          vote_difference?: number | null
          votes_against?: number | null
          votes_for?: number | null
          wins?: number | null
        }
        Update: {
          barber_id?: string
          created_at?: string | null
          draws?: number | null
          id?: string
          losses?: number | null
          matches_played?: number | null
          phase_id?: string | null
          points?: number | null
          qualified?: boolean | null
          rank?: number | null
          show_up_points?: number | null
          tournament_id?: string
          updated_at?: string | null
          vote_difference?: number | null
          votes_against?: number | null
          votes_for?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_standings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tournament_standings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tournament_standings_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "tournament_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_standings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string | null
          elimination_start_date: string | null
          end_date: string | null
          id: string
          min_participants: number | null
          name: string
          qualification_end_date: string
          qualification_rounds: number | null
          season: string
          start_date: string
          status: string
          total_registered: number | null
          updated_at: string | null
          youtube_stream_url: string | null
        }
        Insert: {
          created_at?: string | null
          elimination_start_date?: string | null
          end_date?: string | null
          id?: string
          min_participants?: number | null
          name: string
          qualification_end_date: string
          qualification_rounds?: number | null
          season: string
          start_date: string
          status?: string
          total_registered?: number | null
          updated_at?: string | null
          youtube_stream_url?: string | null
        }
        Update: {
          created_at?: string | null
          elimination_start_date?: string | null
          end_date?: string | null
          id?: string
          min_participants?: number | null
          name?: string
          qualification_end_date?: string
          qualification_rounds?: number | null
          season?: string
          start_date?: string
          status?: string
          total_registered?: number | null
          updated_at?: string | null
          youtube_stream_url?: string | null
        }
        Relationships: []
      }
      user_prizes: {
        Row: {
          bb_value: number | null
          claimed_at: string | null
          created_at: string | null
          duration_months: number | null
          expires_at: string | null
          id: string
          prize_label: string
          prize_type: string
          status: string | null
          user_id: string
        }
        Insert: {
          bb_value?: number | null
          claimed_at?: string | null
          created_at?: string | null
          duration_months?: number | null
          expires_at?: string | null
          id?: string
          prize_label: string
          prize_type: string
          status?: string | null
          user_id: string
        }
        Update: {
          bb_value?: number | null
          claimed_at?: string | null
          created_at?: string | null
          duration_months?: number | null
          expires_at?: string | null
          id?: string
          prize_label?: string
          prize_type?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_vote_combos: {
        Row: {
          battle_id: string | null
          bonus_bb_earned: number
          combo_count: number
          created_at: string | null
          id: string
          last_vote_at: string | null
          user_id: string | null
        }
        Insert: {
          battle_id?: string | null
          bonus_bb_earned?: number
          combo_count?: number
          created_at?: string | null
          id?: string
          last_vote_at?: string | null
          user_id?: string | null
        }
        Update: {
          battle_id?: string | null
          bonus_bb_earned?: number
          combo_count?: number
          created_at?: string | null
          id?: string
          last_vote_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_vote_combos_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          message_variant: string | null
          metadata: Json | null
          outcome: string | null
          outcome_at: string | null
          reference_id: string | null
          step_name: string
          trigger_event: string
          user_id: string | null
          workflow_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          message_variant?: string | null
          metadata?: Json | null
          outcome?: string | null
          outcome_at?: string | null
          reference_id?: string | null
          step_name: string
          trigger_event: string
          user_id?: string | null
          workflow_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          message_variant?: string | null
          metadata?: Json | null
          outcome?: string | null
          outcome_at?: string | null
          reference_id?: string | null
          step_name?: string
          trigger_event?: string
          user_id?: string | null
          workflow_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      barber_stats: {
        Row: {
          barber_id: string | null
          donation_count: number | null
          follower_count: number | null
          like_count: number | null
          name: string | null
          subscription_count: number | null
          total_donations_cents: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "barber_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      public_barber_profiles: {
        Row: {
          avatar_url: string | null
          barber_bio: string | null
          barber_created_at: string | null
          barber_id: string | null
          barber_name: string | null
          barber_updated_at: string | null
          country_code: string | null
          display_name: string | null
          facebook_handle: string | null
          featured_video_id: string | null
          follower_count: number | null
          instagram_handle: string | null
          is_live: boolean | null
          last_live_check: string | null
          like_count: number | null
          live_video_id: string | null
          location: string | null
          portfolio_url: string | null
          rating: number | null
          specialty: string | null
          subscription_count: number | null
          total_donations_cents: number | null
          twitter_handle: string | null
          user_bio: string | null
          user_id: string | null
          username: string | null
          years_experience: number | null
          youtube_channel_id: string | null
          youtube_handle: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "barber_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      public_user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country_code: string | null
          created_at: string | null
          creator_level: string | null
          display_name: string | null
          favorite_creator_id: string | null
          is_creator: boolean | null
          is_verified_by_competition: boolean | null
          sub_category: string | null
          user_id: string | null
          user_type: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string | null
          creator_level?: string | null
          display_name?: string | null
          favorite_creator_id?: string | null
          is_creator?: boolean | null
          is_verified_by_competition?: boolean | null
          sub_category?: string | null
          user_id?: string | null
          user_type?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string | null
          creator_level?: string | null
          display_name?: string | null
          favorite_creator_id?: string | null
          is_creator?: boolean | null
          is_verified_by_competition?: boolean | null
          sub_category?: string | null
          user_id?: string | null
          user_type?: string | null
          username?: string | null
        }
        Relationships: []
      }
      tournament_finalists: {
        Row: {
          barber_id: string | null
          barber_name: string | null
          category: string | null
          category_rank: number | null
          country_code: string | null
          created_at: string | null
          draws: number | null
          id: string | null
          losses: number | null
          matches_played: number | null
          phase_id: string | null
          points: number | null
          qualified: boolean | null
          rank: number | null
          show_up_points: number | null
          tournament_id: string | null
          updated_at: string | null
          vote_difference: number | null
          votes_against: number | null
          votes_for: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_standings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tournament_standings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tournament_standings_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "tournament_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_standings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_social_auth_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      award_show_up_point: {
        Args: { p_barber_profile_id: string; p_battle_id: string }
        Returns: boolean
      }
      award_tournament_points: {
        Args: {
          p_is_draw?: boolean
          p_loser_id: string
          p_phase_id: string
          p_tournament_id: string
          p_winner_id: string
        }
        Returns: undefined
      }
      build_universal_feed: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          content_id: string
          content_type: string
          created_at: string
          creator_avatar: string
          creator_id: string
          creator_name: string
          description: string
          is_locked: boolean
          item_id: string
          media_url: string
          rank_score: number
          thumbnail_url: string
          title: string
        }[]
      }
      calculate_battle_results: {
        Args: { battle_id_param: string }
        Returns: {
          creation1_votes: number
          creation2_votes: number
          winner_creation_id: string
        }[]
      }
      calculate_match_result: {
        Args: { battle_id_param: string }
        Returns: {
          barber1_points: number
          barber1_weighted_votes: number
          barber2_points: number
          barber2_weighted_votes: number
          is_draw: boolean
          winner_id: string
        }[]
      }
      check_vote_eligibility: {
        Args: { battle_id_param: string; creation_id_param: string }
        Returns: boolean
      }
      cleanup_completed_challenges: { Args: never; Returns: undefined }
      cleanup_old_community_notes: { Args: never; Returns: Json }
      complete_qualification_phase: {
        Args: {
          phase_id_param: string
          top_n?: number
          tournament_id_param: string
        }
        Returns: undefined
      }
      create_battle_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_forfeit_match_result: {
        Args: {
          battle_id_param: string
          forfeit_reason_param: string
          winner_id_param: string
        }
        Returns: undefined
      }
      deduct_queue_entry_fee: {
        Args: { p_amount_bb?: number; p_category: string; p_user_id: string }
        Returns: Json
      }
      delete_email: {
        Args: { p_msg_id: number; p_queue: string }
        Returns: undefined
      }
      enqueue_email: {
        Args: { p_delay_secs?: number; p_payload: Json; p_queue: string }
        Returns: number
      }
      expire_bounties_batch: { Args: never; Returns: number }
      finalize_vod_prize_split: {
        Args: {
          p_battle_id: string
          p_is_draw?: boolean
          p_loser_id: string
          p_winner_id: string
        }
        Returns: Json
      }
      find_barbers_nearby: {
        Args: {
          p_enforce_tiers?: boolean
          p_lat: number
          p_lng: number
          p_radius_miles?: number
        }
        Returns: {
          active_subscription_tier: string
          avatar_url: string
          barber_id: string
          distance_miles: number
          latitude: number
          location: string
          longitude: number
          name: string
          specialty: string
          user_id: string
        }[]
      }
      find_barbers_nearby_scored: {
        Args: {
          p_enforce_tiers?: boolean
          p_lat: number
          p_lng: number
          p_radius_miles?: number
        }
        Returns: {
          active_subscription_tier: string
          avatar_url: string
          barber_id: string
          battles_participated: number
          bb_purchased: number
          contribution_score: number
          distance_miles: number
          latitude: number
          location: string
          longitude: number
          name: string
          specialty: string
          user_id: string
        }[]
      }
      generate_elimination_bracket: {
        Args: { num_participants?: number; tournament_id_param: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      get_barber_bucks_balance: { Args: { user_uuid: string }; Returns: number }
      get_battle_vote_results: {
        Args: {
          _barber_weight?: number
          _battle_id: string
          _fan_weight?: number
        }
        Returns: {
          submission_id: string
          weighted_votes: number
        }[]
      }
      get_client_reputation: {
        Args: { target_user_id: string }
        Returns: {
          avg_star_rating: number
          internal_top_tags: Json
          risk_flags: Json
          top_tags: Json
          total_reviews: number
        }[]
      }
      get_creator_summary: {
        Args: { _creator_id: string }
        Returns: {
          follower_count: number
          like_count: number
          subscription_count: number
          total_donated_cents: number
        }[]
      }
      get_fee_structure: { Args: never; Returns: Json }
      get_m4m_fund_summary: {
        Args: never
        Returns: {
          deposit_count: number
          recent_deposits: Json
          total_balance_bb: number
          total_from_donations: number
          total_from_pot_distribution: number
          total_from_tip_fees: number
        }[]
      }
      get_marketing_lead_by_fingerprint: {
        Args: { p_fingerprint: string }
        Returns: {
          barber_status: string | null
          claimed_at: string | null
          claimed_user_id: string | null
          converted: boolean | null
          country_code: string | null
          created_at: string | null
          device_fingerprint: string | null
          email: string
          fbc: string | null
          fbp: string | null
          gbraid: string | null
          gclid: string | null
          id: string
          linked_user_id: string | null
          max_spins: number | null
          phone_number: string | null
          prize_bb: number | null
          prize_duration_months: number | null
          prize_expires_at: string | null
          prize_id: string | null
          prize_label: string | null
          prize_locked_at: string | null
          prize_tier: string | null
          prize_tier_color: string | null
          raffle_ticket_code: string | null
          role: string | null
          shared: boolean | null
          source_url: string | null
          specialties: string[] | null
          spin_eligible: boolean | null
          spin_ip: string | null
          spins_used: number | null
          ttclid: string | null
          ttp: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          wbraid: string | null
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "marketing_leads"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_marketing_lead_count: { Args: never; Returns: number }
      get_multiple_public_profiles: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          bio: string
          country_code: string
          creator_level: string
          display_name: string
          is_creator: boolean
          user_id: string
          user_type: string
          username: string
        }[]
      }
      get_nationality_match_priority: {
        Args: { p_country1: string; p_country2: string }
        Returns: number
      }
      get_public_barber_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          barber_id: string
          country_code: string
          display_name: string
          follower_count: number
          like_count: number
          location: string
          name: string
          rating: number
          user_id: string
        }[]
      }
      get_public_creator_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          country_code: string
          display_name: string
          follower_count: number
          like_count: number
          subscription_count: number
          user_id: string
          username: string
        }[]
      }
      get_public_profile: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          country_code: string
          creator_level: string
          display_name: string
          is_creator: boolean
          user_id: string
          user_type: string
          username: string
        }[]
      }
      get_public_profile_info: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
          user_type: string
        }[]
      }
      get_subscription_tier: { Args: { user_uuid: string }; Returns: string }
      has_active_subscription: { Args: { user_uuid: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_client_appointments: {
        Args: { p_client_id: string; p_is_no_show?: boolean }
        Returns: undefined
      }
      increment_content_shares: {
        Args: { p_content_id: string }
        Returns: undefined
      }
      increment_content_views: {
        Args: { p_content_id: string }
        Returns: undefined
      }
      increment_no_show_count: {
        Args: { barber_user_id: string }
        Returns: undefined
      }
      increment_vote_count: {
        Args: { increment_by?: number; submission_id: string }
        Returns: undefined
      }
      is_sovereign: { Args: never; Returns: boolean }
      mark_email_failed: {
        Args: {
          p_error: string
          p_move_to_dlq?: boolean
          p_msg_id: number
          p_queue: string
        }
        Returns: undefined
      }
      mark_marketing_lead_converted: {
        Args: { p_email: string }
        Returns: undefined
      }
      normalize_country_code: {
        Args: { code: string; location?: string; name?: string }
        Returns: string
      }
      notify_battle_participants:
        | {
            Args: {
              p_battle_id: string
              p_data?: Json
              p_message: string
              p_title: string
              p_type?: string
            }
            Returns: number
          }
        | {
            Args: {
              p_battle_id: string
              p_message: string
              p_title: string
              p_winner_id: string
            }
            Returns: undefined
          }
      notify_battle_voters: {
        Args: {
          p_battle_id: string
          p_data?: Json
          p_message: string
          p_title: string
          p_type?: string
        }
        Returns: number
      }
      process_battle_donation: {
        Args: {
          p_amount_bb: number
          p_barber_id: string
          p_battle_id: string
          p_donor_id: string
          p_message?: string
        }
        Returns: Json
      }
      process_universal_barter_checkout: {
        Args: {
          p_barber_id: string
          p_donated_slots: Json
          p_perk_category: string
          p_perk_details: Json
          p_required_bb_value: number
        }
        Returns: Json
      }
      refresh_barber_stats: { Args: never; Returns: undefined }
      reset_monthly_battle_counters: { Args: never; Returns: undefined }
      sync_user_binary_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      update_category_prize_pool: {
        Args: {
          p_category: string
          p_donation_amount_cents?: number
          p_entry_amount_cents?: number
          p_increment_participants?: boolean
          p_platform_fee_cents?: number
        }
        Returns: undefined
      }
      update_display_name: { Args: { new_name: string }; Returns: Json }
      update_marketing_lead_by_fingerprint: {
        Args: {
          p_converted?: boolean
          p_fingerprint: string
          p_prize_id?: string
          p_prize_label?: string
          p_shared?: boolean
          p_spins_used?: number
        }
        Returns: undefined
      }
      update_tournament_standings: {
        Args: { battle_id_param: string }
        Returns: undefined
      }
      validate_user_action: {
        Args: { action_type: string; target_user_type: string }
        Returns: boolean
      }
      verify_m4m_session: {
        Args: { p_client_id: string; p_code: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "barber" | "fan" | "admin" | "sovereign"
      appointment_status:
        | "pending"
        | "escrow_locked"
        | "confirmed"
        | "in_transit"
        | "completed"
        | "cancelled"
        | "no_show"
        | "denied"
      appointment_type: "standard" | "house_call" | "sos"
      feed_content_type: "battle" | "course_teaser" | "sponsor_ad" | "update"
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
      app_role: ["barber", "fan", "admin", "sovereign"],
      appointment_status: [
        "pending",
        "escrow_locked",
        "confirmed",
        "in_transit",
        "completed",
        "cancelled",
        "no_show",
        "denied",
      ],
      appointment_type: ["standard", "house_call", "sos"],
      feed_content_type: ["battle", "course_teaser", "sponsor_ad", "update"],
    },
  },
} as const
