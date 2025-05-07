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
        "w-full px-8 py-4 flex items-center justify-center rounded-full shadow-lg border border-neutral-700",
        "transition-all duration-200 ease-in-out font-semibold text-lg md:text-xl lg:text-2xl tracking-tight",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        type === "yes"
          ? "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-emerald-50 hover:shadow-emerald-400/30"
          : "bg-rose-500 hover:bg-rose-400 active:bg-rose-600 text-rose-50 hover:shadow-rose-400/30",
        "hover:scale-105 active:scale-95",
        disabled && "opacity-60 cursor-not-allowed hover:bg-opacity-100",
        className
      )}
    >
      <span className="mr-2 text-xl md:text-2xl lg:text-3xl">
        {type === "yes" ? "✔️" : "✖️"}
      </span>
      {type === "yes" ? "YES" : "NO"}
    </button>
  );
}
