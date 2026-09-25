"use client";

import { useState } from "react";

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="relative flex items-center justify-end w-full">
      <button
        type="button"
        className="md:hidden px-3 py-2 rounded"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Ouvrir le menu"
      >
        ☰
      </button>
      <div className={`${open ? "flex" : "hidden"} md:flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 absolute md:static top-full right-0 z-30 p-3 md:p-0 rounded bg-[var(--background)] md:bg-transparent shadow md:shadow-none`}>
        <a href="/" className="px-3 py-2 rounded text-gray-100">Home</a>
        <a href="/admin" className="px-3 py-2 rounded text-gray-100">Admin</a>
        <a href="/logout" className="px-3 py-2 rounded bg-blue-500 text-white">Logout</a>
      </div>
    </nav>
  );
}
