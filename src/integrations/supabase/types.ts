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
      barber_profiles: {
        Row: {
          bio: string | null
          country_code: string | null
          created_at: string
          featured_video_id: string | null
          id: string
          is_live: boolean | null
          last_live_check: string | null
          live_video_id: string | null
          location: string | null
          name: string
          nickname: string | null
          portfolio_url: string | null
          rating: number | null
          specialty: string | null
          updated_at: string
          user_id: string
          years_experience: number | null
          youtube_channel_id: string | null
        }
        Insert: {
          bio?: string | null
          country_code?: string | null
          created_at?: string
          featured_video_id?: string | null
          id?: string
          is_live?: boolean | null
          last_live_check?: string | null
          live_video_id?: string | null
          location?: string | null
          name: string
          nickname?: string | null
          portfolio_url?: string | null
          rating?: number | null
          specialty?: string | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
          youtube_channel_id?: string | null
        }
        Update: {
          bio?: string | null
          country_code?: string | null
          created_at?: string
          featured_video_id?: string | null
          id?: string
          is_live?: boolean | null
          last_live_check?: string | null
          live_video_id?: string | null
          location?: string | null
          name?: string
          nickname?: string | null
          portfolio_url?: string | null
          rating?: number | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
          youtube_channel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
        ]
      }
      battle_submissions: {
        Row: {
          battle_id: string
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
        ]
      }
      battles: {
        Row: {
          barber_1_video_url: string | null
          barber_2_video_url: string | null
          barber1_id: string | null
          barber2_id: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string
          creation1_id: string | null
          creation2_id: string | null
          currency: string
          description: string | null
          ends_at: string | null
          forfeit_reason: string | null
          forfeit_winner_id: string | null
          id: string
          is_tournament_match: boolean | null
          live_viewers: number | null
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
          submission_deadline: string | null
          title: string
          tournament_id: string | null
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
          barber2_id?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          creation1_id?: string | null
          creation2_id?: string | null
          currency?: string
          description?: string | null
          ends_at?: string | null
          forfeit_reason?: string | null
          forfeit_winner_id?: string | null
          id?: string
          is_tournament_match?: boolean | null
          live_viewers?: number | null
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
          submission_deadline?: string | null
          title: string
          tournament_id?: string | null
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
          barber2_id?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          creation1_id?: string | null
          creation2_id?: string | null
          currency?: string
          description?: string | null
          ends_at?: string | null
          forfeit_reason?: string | null
          forfeit_winner_id?: string | null
          id?: string
          is_tournament_match?: boolean | null
          live_viewers?: number | null
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
          submission_deadline?: string | null
          title?: string
          tournament_id?: string | null
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
            foreignKeyName: "bracket_matches_barber2_id_fkey"
            columns: ["barber2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
      }
      client_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
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
        ]
      }
      creations: {
        Row: {
          barber_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          media_url: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          barber_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          media_url: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          barber_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          media_url?: string
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
        ]
      }
      creator_content: {
        Row: {
          content_type: string
          created_at: string
          creator_id: string
          description: string | null
          earnings: number | null
          id: string
          likes: number | null
          media_url: string | null
          shares: number | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          content_type: string
          created_at?: string
          creator_id: string
          description?: string | null
          earnings?: number | null
          id?: string
          likes?: number | null
          media_url?: string | null
          shares?: number | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          content_type?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          earnings?: number | null
          id?: string
          likes?: number | null
          media_url?: string | null
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
        ]
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
            foreignKeyName: "match_results_barber2_id_fkey"
            columns: ["barber2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
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
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
      profiles: {
        Row: {
          avatar_url: string | null
          barber_bucks: number | null
          bio: string | null
          country_code: string | null
          created_at: string
          creator_level: string | null
          display_name: string | null
          favorite_creator_id: string | null
          id: string
          is_creator: boolean | null
          is_verified_by_competition: boolean | null
          profile_id: string | null
          referral_code: string | null
          referred_by: string | null
          three_x_vote_expires_at: string | null
          total_earnings: number | null
          updated_at: string
          user_id: string
          user_type: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          barber_bucks?: number | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          creator_level?: string | null
          display_name?: string | null
          favorite_creator_id?: string | null
          id?: string
          is_creator?: boolean | null
          is_verified_by_competition?: boolean | null
          profile_id?: string | null
          referral_code?: string | null
          referred_by?: string | null
          three_x_vote_expires_at?: string | null
          total_earnings?: number | null
          updated_at?: string
          user_id: string
          user_type?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          barber_bucks?: number | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          creator_level?: string | null
          display_name?: string | null
          favorite_creator_id?: string | null
          id?: string
          is_creator?: boolean | null
          is_verified_by_competition?: boolean | null
          profile_id?: string | null
          referral_code?: string | null
          referred_by?: string | null
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
        ]
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
            foreignKeyName: "referral_tracking_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
        ]
      }
    }
    Functions: {
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
      generate_elimination_bracket: {
        Args: { num_participants?: number; tournament_id_param: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
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
      get_creator_summary: {
        Args: { _creator_id: string }
        Returns: {
          follower_count: number
          like_count: number
          subscription_count: number
          total_donated_cents: number
        }[]
      }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_no_show_count: {
        Args: { barber_user_id: string }
        Returns: undefined
      }
      increment_vote_count: {
        Args: { increment_by?: number; submission_id: string }
        Returns: undefined
      }
      notify_battle_participants: {
        Args: {
          p_battle_id: string
          p_data?: Json
          p_message: string
          p_title: string
          p_type?: string
        }
        Returns: number
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
      refresh_barber_stats: { Args: never; Returns: undefined }
      update_tournament_standings: {
        Args: { battle_id_param: string }
        Returns: undefined
      }
      validate_user_action: {
        Args: { action_type: string; target_user_type: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "barber" | "fan" | "admin"
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
      app_role: ["barber", "fan", "admin"],
    },
  },
} as const
