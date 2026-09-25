"use client"
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Trigger fade out
    setIsTransitioning(true);
    
    const timer = setTimeout(() => {
      // Update content after fade out
      setDisplayChildren(children);
      // Trigger fade in
      setIsTransitioning(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Keep displayChildren in sync with children when not transitioning
  useEffect(() => {
    if (!isTransitioning) {
      setDisplayChildren(children);
    }
  }, [children, isTransitioning]);

  return (
    <div 
      className={`transition-opacity duration-300 ease-in-out ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {displayChildren}
    </div>
  );
}
