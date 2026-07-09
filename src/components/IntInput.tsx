"use client";

import { useState } from "react";

/**
 * 정수 입력: 포커스 시 0을 비워 1 입력 시 10이 되는 문제 방지
 */
export default function IntInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={focused ? draft : String(value)}
      onFocus={(e) => {
        setFocused(true);
        setDraft(value === 0 ? "" : String(value));
        requestAnimationFrame(() => e.target.select());
      }}
      onBlur={() => {
        setFocused(false);
        const n = parseInt(draft, 10);
        onChange(Number.isFinite(n) && n >= 0 ? n : 0);
      }}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "");
        setDraft(v);
        if (v === "") return;
        onChange(parseInt(v, 10));
      }}
    />
  );
}
