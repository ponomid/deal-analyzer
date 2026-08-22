"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { AddressSuggestion } from "@/lib/address";

type AddressAutocompleteProps = {
  value: string;
  verified: AddressSuggestion | null;
  onChange: (value: string, verified: AddressSuggestion | null) => void;
  placeholder?: string;
};

export function AddressAutocomplete({
  value,
  verified,
  onChange,
  placeholder,
}: AddressAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/address-search?q=${encodeURIComponent(query.trim())}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Lookup failed");

      const next = (payload.suggestions || []) as AddressSuggestion[];
      setSuggestions(next);
      setOpen(next.length > 0);
      setActiveIndex(next.length > 0 ? 0 : -1);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function selectSuggestion(suggestion: AddressSuggestion) {
    onChange(suggestion.label, suggestion);
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  }

  function onInputChange(next: string) {
    onChange(next, null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(next), 280);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === "ArrowDown" && value.trim().length >= 3) {
        fetchSuggestions(value);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="address-field" ref={rootRef}>
      <div className="address-input-wrap">
        <input
          className="wide"
          value={value}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {verified ? (
          <span className="address-verified" title="Verified address">
            ✓ Verified
          </span>
        ) : loading ? (
          <span className="address-status">Searching…</span>
        ) : null}
      </div>

      {open && suggestions.length > 0 ? (
        <ul className="address-dropdown" id={listId} role="listbox">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? "active" : undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectSuggestion(suggestion)}
              >
                <span className="address-option-main">{suggestion.label}</span>
                {suggestion.country ? (
                  <span className="address-option-meta">{suggestion.country}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
