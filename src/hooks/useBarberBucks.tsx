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
    enabled: !!user,
    refetchOnWindowFocus: true
  });

  // Get transaction history
  const { data: transactions } = useQuery({
    queryKey: ['barber_bucks_transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('barber_bucks_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
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

  // Purchase barber bucks via Stripe — returns { url, session_id, bb_amount }
  // Caller is responsible for navigation (window.location.href)
  const purchaseBucks = useMutation({
    mutationFn: async (packageAmount: number) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('purchase-barber-bucks', {
        body: { package_amount: packageAmount }
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");

      return data;
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to initiate purchase");
      console.error("Purchase bucks error:", error);
    }
  });

  return {
    barberBucks: barberBucks || 0,
    transactions: transactions || [],
    isLoading,
    checkFunds,
    deductBucks,
    purchaseBucks,
    showAddFundsModal,
    setShowAddFundsModal
  };
};