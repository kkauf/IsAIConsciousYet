import { cn } from "@/lib/utils";

interface VoteButtonProps {
  type: "yes" | "no";
  onVote: (vote: "yes" | "no") => void;
  disabled?: boolean;
  className?: string;
}

export default function VoteButton({
  type,
  onVote,
  disabled = false,
  className
}: VoteButtonProps) {
  const handleVote = () => {
    if (!disabled) {
      onVote(type);
    }
  };

  return (
    <button
      onClick={handleVote}
      disabled={disabled}
      className={cn(
        "flex-1 sm:flex-initial min-w-[140px] px-12 py-4",
        "rounded-lg font-semibold text-lg",
        "border border-neutral-700 bg-neutral-900",
        "text-white",
        "transition-all duration-200",
        "hover:bg-neutral-800 hover:border-neutral-600",
        "active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        disabled && "opacity-50 cursor-not-allowed hover:bg-neutral-900 hover:border-neutral-700 active:scale-100",
        className
      )}
    >
      {type === "yes" ? "Yes" : "No"}
    </button>
  );
}
