import { useCallback, useEffect, useRef, useState } from 'react';
import { Smile, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { MentionUser } from '@/hooks/useVideoComments';

interface CommentInputBarProps {
  onSubmit: (content: string) => Promise<unknown>;
  searchUsers: (query: string) => Promise<MentionUser[]>;
  submitting?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  focusTrigger?: number; // increments to request focus
}

const MAX_LEN = 150;
const MENTION_TRIGGER = /@(\w{1,20})$/;
const QUICK_EMOJIS = ['🔥', '✂️', '💈', '😂', '👏', '💯', '😮', '❤️', '👀', '🙌', '🚀', '😎'];

export function CommentInputBar({
  onSubmit,
  searchUsers,
  submitting,
  disabled,
  placeholder = 'Add a comment…',
  className,
}: CommentInputBarProps) {
  const [value, setValue] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Detect @mention trigger at cursor tail
  useEffect(() => {
    const tail = value.slice(0, inputRef.current?.selectionEnd ?? value.length);
    const m = tail.match(MENTION_TRIGGER);
    setMentionQuery(m ? m[1] : null);
  }, [value]);

  // Debounced user search
  useEffect(() => {
    if (mentionQuery === null) {
      setMentionResults([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await searchUsers(mentionQuery);
        setMentionResults(r);
      } catch {
        setMentionResults([]);
      }
    }, 180);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [mentionQuery, searchUsers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.slice(0, MAX_LEN);
    setValue(next);
  };

  const insertAtCursor = useCallback((text: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const next = (value.slice(0, start) + text + value.slice(end)).slice(0, MAX_LEN);
    setValue(next);
    requestAnimationFrame(() => {
      input?.focus();
      const pos = Math.min(start + text.length, MAX_LEN);
      input?.setSelectionRange(pos, pos);
    });
  }, [value]);

  const completeMention = (user: MentionUser) => {
    if (!user.display_name) return;
    const input = inputRef.current;
    const caret = input?.selectionEnd ?? value.length;
    const head = value.slice(0, caret).replace(MENTION_TRIGGER, `@${user.display_name} `);
    const tail = value.slice(caret);
    const next = (head + tail).slice(0, MAX_LEN);
    setValue(next);
    setMentionQuery(null);
    setMentionResults([]);
    requestAnimationFrame(() => {
      input?.focus();
      const pos = head.length;
      input?.setSelectionRange(pos, pos);
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || submitting || disabled) return;
    try {
      await onSubmit(trimmed);
      setValue('');
      setMentionQuery(null);
      setMentionResults([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post');
    }
  };

  const remaining = MAX_LEN - value.length;
  const showMentions = mentionQuery !== null && mentionResults.length > 0;

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 z-20 pointer-events-auto',
        className,
      )}
    >
      {/* Mention popover */}
      {showMentions && (
        <div className="absolute bottom-12 left-2 right-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-black/90 backdrop-blur-md shadow-2xl">
          {mentionResults.map((u) => (
            <button
              key={u.user_id}
              type="button"
              onClick={() => completeMention(u)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/10"
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="h-6 w-6 rounded-full bg-white/15" />
              )}
              <span className="text-sm text-white">@{u.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emoji popover */}
      {emojiOpen && (
        <div className="absolute bottom-12 right-12 grid grid-cols-6 gap-1 rounded-xl border border-white/10 bg-black/90 p-2 backdrop-blur-md shadow-2xl">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                insertAtCursor(e);
                setEmojiOpen(false);
              }}
              className="rounded-md p-1 text-xl hover:bg-white/10"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex h-12 items-center gap-2 border-t border-white/10 bg-black/70 px-3 backdrop-blur-md"
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={MAX_LEN}
          disabled={disabled}
          aria-label="Comment"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
        />
        <span
          className={cn(
            'text-[10px] tabular-nums',
            remaining <= 20 ? 'text-orange-400' : 'text-white/40',
          )}
          aria-live="polite"
        >
          {remaining}
        </span>
        <button
          type="button"
          onClick={() => setEmojiOpen((v) => !v)}
          className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Insert emoji"
        >
          <Smile className="h-5 w-5" />
        </button>
        <button
          type="submit"
          disabled={!value.trim() || submitting || disabled}
          className="rounded-full bg-orange-500 p-1.5 text-black transition-opacity disabled:opacity-40"
          aria-label="Send comment"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}
