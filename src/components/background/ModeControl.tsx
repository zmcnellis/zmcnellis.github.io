import { useEffect, useRef, useState } from "react";
import type { ModeMeta } from "./sim/modes";

interface Props {
  modes: ModeMeta[];
  currentId: string;
  onSelect: (id: string) => void;
}

export default function ModeControl({ modes, currentId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
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
      <button
        type="button"
        className="mode-control__pill"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mode-control__star" aria-hidden="true">✦</span>
        <span className="mode-control__name">{current.name}</span>
        <span className="mode-control__chev" aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <ul className="mode-control__menu" role="listbox" aria-label="Background animation">
          {modes.map((m) => (
            <li key={m.id} role="option" aria-selected={m.id === currentId}>
              <button
                type="button"
                className={
                  "mode-control__item" +
                  (m.id === currentId ? " is-active" : "")
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
        </ul>
      )}
    </div>
  );
}
