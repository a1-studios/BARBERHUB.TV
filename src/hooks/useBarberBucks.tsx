import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useBarberBucks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);

  // Get current user's barber bucks balance
  const { data: barberBucks, isLoading } = useQuery({
    queryKey: ['barber_bucks', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('barber_bucks')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data.barber_bucks || 0;
    },
    enabled: !!user
  });

  // Check if user has enough funds for donation
  const checkFunds = (amount: number) => {
    if (!user) {
      toast.error("Please sign in to donate");
      return false;
    }
    
    if (!barberBucks || barberBucks < amount) {
      toast.error("Insufficient Barber Bucks. Please add funds to your account.");
      setShowAddFundsModal(true);
      return false;
    }
    
    return true;
  };

  // Deduct barber bucks for donation
  const deductBucks = useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from('profiles')
        .update({ barber_bucks: (barberBucks || 0) - amount })
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber_bucks', user?.id] });
    },
    onError: (error) => {
      toast.error("Failed to process payment");
      console.error("Deduct bucks error:", error);
    }
  });

  // Add barber bucks (this would integrate with payment system)
  const addBucks = useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from('profiles')
        .update({ barber_bucks: (barberBucks || 0) + amount })
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: (_, amount) => {
      queryClient.invalidateQueries({ queryKey: ['barber_bucks', user?.id] });
      toast.success(`Added ${amount} Barber Bucks to your account!`);
      setShowAddFundsModal(false);
    },
    onError: (error) => {
      toast.error("Failed to add funds");
      console.error("Add bucks error:", error);
    }
  });

  return {
    barberBucks: barberBucks || 0,
    isLoading,
    checkFunds,
    deductBucks,
    addBucks,
    showAddFundsModal,
    setShowAddFundsModal
  };
};