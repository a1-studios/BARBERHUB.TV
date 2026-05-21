import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useLikes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get likes for a creator
  const getLikes = (creatorId: string) => {
    return useQuery({
      queryKey: ['creator_likes', creatorId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('creator_likes')
          .select('*')
          .eq('creator_id', creatorId);
        
        if (error) throw error;
        return data;
      },
      enabled: !!creatorId
    });
  };

  // Check if current user has liked a creator
  const hasUserLiked = (creatorId: string) => {
    return useQuery({
      queryKey: ['user_like', creatorId, user?.id],
      queryFn: async () => {
        if (!user) return false;
        
        const { data, error } = await supabase
          .from('creator_likes')
          .select('id')
          .eq('creator_id', creatorId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        return !!data;
      },
      enabled: !!user && !!creatorId
    });
  };

  // Toggle like mutation
  const toggleLike = useMutation({
    mutationFn: async ({ creatorId, isLiked }: { creatorId: string; isLiked: boolean }) => {
      if (!user) throw new Error("Must be logged in to like");

      if (isLiked) {
        // Remove like
        const { error } = await supabase
          .from('creator_likes')
          .delete()
          .eq('creator_id', creatorId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Add like
        const { error } = await supabase
          .from('creator_likes')
          .insert({
            creator_id: creatorId,
            user_id: user.id
          });
        
        if (error) throw error;
      }
    },
    onSuccess: (_, { creatorId }) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['creator_likes', creatorId] });
      queryClient.invalidateQueries({ queryKey: ['user_like', creatorId, user?.id] });
    },
    onError: (error) => {
      toast.error("Failed to update like");
      console.error("Like error:", error);
    }
  });

  return {
    getLikes,
    hasUserLiked,
    toggleLike
  };
};