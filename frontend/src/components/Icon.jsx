import React from "react";

export const Icon = {
  Plus: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Paperclip: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path
        d="M13.5 6.5l-6 6a2.5 2.5 0 003.54 3.54l6-6a4 4 0 00-5.66-5.66l-6 6a5.5 5.5 0 007.78 7.78"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Close: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Chevron: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ChevronDown: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Back: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M12.5 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Box: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M10 2.5l7 3.6v7.8l-7 3.6-7-3.6V6.1l7-3.6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3 6.1L10 9.7m0 0l7-3.6M10 9.7V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  Tag: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M3 3h6.5L17 10.5 10.5 17 3 9.5V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="6.5" cy="6.5" r="1.1" fill="currentColor" />
    </svg>
  ),
  Building: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M4 17V4.5L10 2l6 2.5V17" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2 17h16M7.5 7h1.5M11 7h1.5M7.5 10.5h1.5M11 10.5h1.5M7.5 14h1.5M11 14h1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  User: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <circle cx="10" cy="6.8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 17c1-3.5 4-5 6.5-5s5.5 1.5 6.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Calendar: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <rect x="3" y="4.3" width="14" height="12.2" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8h14M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <circle cx="8.7" cy="8.7" r="5.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16.3 16.3l-3.4-3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Trash: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M4 5.5h12M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M6 5.5l.7 10.2A1.5 1.5 0 008.2 17h3.6a1.5 1.5 0 001.5-1.3L14 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Empty: (p) => (
    <svg viewBox="0 0 64 40" fill="none" {...p}>
      <rect x="10" y="14" width="44" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M22 24h20M22 29h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M27 14V9.5a1.5 1.5 0 011.5-1.5h7a1.5 1.5 0 011.5 1.5V14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Mail: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 5.5l7 5.5 7-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  LogOut: (p) => (
    <svg viewBox="0 0 20 20" fill="none" {...p}>
      <path d="M7.5 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 13.5l4-3.5-4-3.5M17 10H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};
