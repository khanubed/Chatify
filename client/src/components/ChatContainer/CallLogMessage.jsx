import React from "react";
import { Video, Phone, PhoneMissed } from "lucide-react";

const CallLogMessage = ({ msg }) => {
  const textLower = msg.text.toLowerCase();

  // 1. Detect call context properties dynamically
  const isVideo = textLower.includes("video") || msg.text.includes("🎥");
  const isMissed =
    textLower.includes("missed") ||
    textLower.includes("declined") ||
    textLower.includes("no answer");

  // Clean out platform emojis for a standardized presentation layer
  const cleanText = msg.text.replace(/[\u{1F300}-\u{1F6FF}]/gu, "").trim();

  // 2. Define premium theme variations based on call states
  let theme = {
    bg: "bg-emerald-50/80 dark:bg-emerald-500/10",
    border: "border-emerald-200/50 dark:border-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: <Phone size={14} className="stroke-[2.5]" />,
  };

  if (isMissed) {
    theme = {
      bg: "bg-rose-50/80 dark:bg-rose-500/10",
      border: "border-rose-200/50 dark:border-rose-500/20",
      text: "text-rose-700 dark:text-rose-400",
      icon: <PhoneMissed size={14} className="stroke-[2.5]" />,
    };
  } else if (isVideo) {
    theme = {
      bg: "bg-blue-50/80 dark:bg-blue-500/10",
      border: "border-blue-200/50 dark:border-blue-500/20",
      text: "text-blue-700 dark:text-blue-400",
      icon: <Video size={14} className="stroke-[2.5]" />,
    };
  }

  return (
    <div className="flex justify-center my-6 w-full animate-fade-in select-none">
      <div className="group flex items-center gap-3 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl px-4 py-2 rounded-2xl text-xs font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800/50 shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.02] active:scale-[0.99]">
        {/* Dynamic Premium Icon Badge */}
        <div
          className={`p-1.5 rounded-xl border transition-transform duration-300 group-hover:rotate-12 ${theme.bg} ${theme.border} ${theme.text}`}
        >
          {theme.icon}
        </div>

        {/* Call Meta Specifications */}
        <div className="flex items-center gap-2.5">
          <span className="tracking-wide font-medium">{cleanText}</span>

          {/* Minimalist Divider Dot */}
          <span className="inline-block w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />

          {/* Subtle Timestamp */}
          <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500 tabular-nums tracking-normal">
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CallLogMessage;
