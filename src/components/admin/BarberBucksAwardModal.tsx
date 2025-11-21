import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

interface BarberBucksAwardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedUserId?: string;
}

const REASON_OPTIONS = [
  "Competition Winner Bonus",
  "Community Contribution Reward",
  "Referral Bonus",
  "Bug Report Reward",
  "Promotional Credit",
  "Customer Support Compensation",
  "Manual Correction",
  "Other"
];

export const BarberBucksAwardModal = ({ open, onOpenChange, preselectedUserId }: BarberBucksAwardModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(preselectedUserId || "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search users
  const { data: users } = useQuery({
    queryKey: ['admin-users-search', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, barber_bucks')
        .order('display_name');

      if (searchTerm) {
        query = query.or(`display_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const handleSubmit = async () => {
    if (!selectedUserId || !amount || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    const numAmount = parseInt(amount);
    if (isNaN(numAmount)) {
      toast.error("Invalid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('admin-award-barber-bucks', {
        body: {
          user_id: selectedUserId,
          amount: numAmount,
          reason,
          notes
        }
      });

      if (error) throw error;

      toast.success(`Successfully ${numAmount > 0 ? 'awarded' : 'deducted'} ${Math.abs(numAmount)} Barber Bucks`);
      onOpenChange(false);
      
      // Reset form
      setSelectedUserId("");
      setAmount("");
      setReason("");
      setNotes("");
    } catch (error: any) {
      console.error('Error awarding Barber Bucks:', error);
      toast.error(error.message || "Failed to process transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUser = users?.find(u => u.user_id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Award Barber Bucks</DialogTitle>
          <DialogDescription>
            Award or deduct Barber Bucks from a user's account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Search */}
          <div className="space-y-2">
            <Label>Select User</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            {users && users.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.user_id}
                    onClick={() => setSelectedUserId(user.user_id)}
                    className={`p-3 cursor-pointer hover:bg-accent flex items-center justify-between ${
                      selectedUserId === user.user_id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {user.avatar_url && (
                        <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                      )}
                      <div>
                        <div className="font-medium">{user.display_name || user.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.barber_bucks || 0} BB
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedUser && (
            <div className="p-3 bg-accent rounded-md">
              <div className="font-medium">{selectedUser.display_name || selectedUser.username}</div>
              <div className="text-sm text-muted-foreground">
                Current Balance: {selectedUser.barber_bucks || 0} BB
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount (use negative to deduct)</Label>
            <Input
              type="number"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {selectedUser && amount && (
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm font-medium mb-1">Preview:</div>
              <div className="text-xs text-muted-foreground">
                New Balance: {(selectedUser.barber_bucks || 0) + parseInt(amount || "0")} BB
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};