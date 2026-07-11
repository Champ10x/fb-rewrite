export function Logo({ size = "default" }: { size?: "default" | "small" }) {
  const iconSize = size === "small" ? 40 : 56;
  const textClass = size === "small" ? "text-xl" : "text-3xl";

  return (
    <div className="flex items-center gap-3">
      <svg width={iconSize} height={iconSize} viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <circle cx="28" cy="28" r="28" fill="#E8B94A" />
        <path
          d="M16 20a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H24l-6 5v-5.6A4 4 0 0 1 16 30V20z"
          fill="#FFF7E6"
        />
        <path
          d="M21 27l4-5 3 3 5-6"
          stroke="#C97B4A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M29 18h4v4" stroke="#C97B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className={`font-extrabold tracking-tight ${textClass}`}>
        <span className="text-[#C97B4A]">fb</span>
        <span className="text-neutral-900">rewrite</span>
      </span>
    </div>
  );
}
