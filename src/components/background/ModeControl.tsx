import { useEffect, useRef, useState } from "react";
import type { ModeMeta } from "./sim/modes";

interface Props {
  modes: ModeMeta[];
  currentId: string;
  onSelect: (id: string) => void;
  enabled: boolean;
  onToggleEnabled: () => void;
}

export default function ModeControl({
  modes,
  currentId,
  onSelect,
  enabled,
  onToggleEnabled,
}: Props) {
  const [open, setOpen] = useState(false);
  // Until the visitor opens the menu once, the pill periodically "crawls" a
  // dark segment around its border to draw attention to the switcher.
  const [interacted, setInteracted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = modes.find((m) => m.id === currentId) ?? modes[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="mode-control" ref={rootRef}>
      <div className="mode-control__row">
        <button
          type="button"
          className="mode-control__power"
          aria-pressed={enabled}
          aria-label={
            enabled ? "Turn background animation off" : "Turn background animation on"
          }
          title={enabled ? "Animation on" : "Animation off"}
          onClick={onToggleEnabled}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path
              d="M12 3.5v8"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              d="M7.6 6.6a7 7 0 1 0 8.8 0"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>

        <button
          type="button"
          className={
            "mode-control__pill" +
            (enabled ? "" : " is-off") +
            (interacted ? "" : " is-nudging")
          }
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => {
            setInteracted(true);
            setOpen((v) => !v);
          }}
        >
          <span className="mode-control__star" aria-hidden="true">✦</span>
          <span className="mode-control__name">{current.name}</span>
          <span className="mode-control__chev" aria-hidden="true">{open ? "▴" : "▾"}</span>
        </button>
      </div>

      {open && (
        <ul className="mode-control__menu" role="listbox" aria-label="Background animation">
          {modes.map((m) => (
            <li key={m.id} role="option" aria-selected={m.id === currentId}>
              <button
                type="button"
                className={
                  "mode-control__item" + (m.id === currentId ? " is-active" : "")
                }
                onClick={() => {
                  onSelect(m.id);
                  setOpen(false);
                }}
              >
                <span className="mode-control__item-name">
                  {m.id === currentId ? "✦ " : ""}
                  {m.name}
                </span>
                <span className="mode-control__item-desc">{m.description}</span>
              </button>
            </li>
          ))}
          <li className="mode-control__credit" role="presentation">
            These are a real-time fluid simulation I built from scratch.{" "}
            <a href="/fun/fluid">How it works →</a>
          </li>
        </ul>
      )}
    </div>
  );
}
