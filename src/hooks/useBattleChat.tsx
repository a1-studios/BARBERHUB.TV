import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: {
    username: string;
    avatar_url: string;
    user_type: string;
  };
}

const RATE_LIMIT_MESSAGES = 3;
const RATE_LIMIT_WINDOW = 10000; // 10 seconds

export const useBattleChat = (battleId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rateLimitCount, setRateLimitCount] = useState(0);
  const rateLimitTimerRef = useRef<NodeJS.Timeout>();

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('battle_chat_messages')
        .select(`
          id,
          user_id,
          message,
          created_at,
          profiles!inner(username, avatar_url, user_type)
        `)
        .eq('battle_id', battleId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching chat messages:', error);
      } else {
        // Transform data to match ChatMessage interface
        const transformedMessages = (data || []).map(msg => ({
          id: msg.id,
          user_id: msg.user_id,
          message: msg.message,
          created_at: msg.created_at,
          user: {
            username: (msg.profiles as any).username || 'Anonymous',
            avatar_url: (msg.profiles as any).avatar_url || '',
            user_type: (msg.profiles as any).user_type || 'fan'
          }
        })).reverse();
        
        setMessages(transformedMessages);
      }
      setIsLoading(false);
    };

    fetchMessages();
  }, [battleId]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`battle-chat-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_chat_messages',
          filter: `battle_id=eq.${battleId}`
        },
        async (payload: any) => {
          // Fetch user details for the new message
          const { data: userData } = await supabase
            .from('profiles')
            .select('username, avatar_url, user_type')
            .eq('user_id', payload.new.user_id)
            .single();

          const newMessage: ChatMessage = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            message: payload.new.message,
            created_at: payload.new.created_at,
            user: userData || {
              username: 'Anonymous',
              avatar_url: '',
              user_type: 'fan'
            }
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId]);

  // Send message with rate limiting
  const sendMessage = useCallback(async (message: string, userId: string) => {
    // Check rate limit
    if (rateLimitCount >= RATE_LIMIT_MESSAGES) {
      toast.error('Slow down! Wait a few seconds before sending more messages.');
      return false;
    }

    // Validate message
    if (!message.trim() || message.length > 300) {
      toast.error('Message must be between 1 and 300 characters.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('battle_chat_messages')
        .insert({
          battle_id: battleId,
          user_id: userId,
          message: message.trim()
        });

      if (error) throw error;

      // Update rate limit
      setRateLimitCount(prev => prev + 1);

      // Reset rate limit after window
      if (rateLimitTimerRef.current) {
        clearTimeout(rateLimitTimerRef.current);
      }
      rateLimitTimerRef.current = setTimeout(() => {
        setRateLimitCount(0);
      }, RATE_LIMIT_WINDOW);

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      return false;
    }
  }, [battleId, rateLimitCount]);

  return {
    messages,
    isLoading,
    sendMessage,
    canSendMessage: rateLimitCount < RATE_LIMIT_MESSAGES
  };
};
