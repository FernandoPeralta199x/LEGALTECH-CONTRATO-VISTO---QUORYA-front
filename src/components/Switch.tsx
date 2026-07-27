"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  id?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
  className,
  id
}: SwitchProps) {
  // Pulso "neon" one-shot só quando LIGA (false -> true), nunca na montagem.
  const prevChecked = useRef(checked);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (checked && !prevChecked.current) {
      setPulsing(true);
      const timer = window.setTimeout(() => setPulsing(false), 520);
      prevChecked.current = checked;
      return () => window.clearTimeout(timer);
    }
    prevChecked.current = checked;
  }, [checked]);

  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "relative inline-flex h-[34px] w-[62px] shrink-0 cursor-pointer items-center rounded-full p-1",
        "transition-[background,box-shadow] duration-[280ms] ease-smooth",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--teal)]",
        checked
          ? "bg-[linear-gradient(135deg,var(--teal),var(--teal-d))] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_0_1px_rgba(32,201,151,0.5),0_0_18px_2px_rgba(32,201,151,0.45)]"
          : "bg-[#33404a]",
        pulsing && "cv-switch-pulse",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      disabled={disabled}
      id={id}
      onClick={() => !disabled && onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-[26px] w-[26px] transform rounded-full bg-white",
          "transition-[transform,box-shadow] duration-[340ms] ease-[cubic-bezier(0.68,-0.55,0.27,1.55)]",
          checked
            ? "translate-x-[28px] shadow-[0_0_10px_1px_rgba(32,201,151,0.75)]"
            : "translate-x-0 shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
        )}
      />
    </button>
  );
}
