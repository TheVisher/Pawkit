"use client";

import { useRef, useState, useEffect, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalScrollContainerProps {
  children: ReactNode;
  className?: string;
}

export function HorizontalScrollContainer({ children, className = "" }: HorizontalScrollContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);

  // Check if content overflows and update gradient visibility
  const checkOverflow = () => {
    const container = scrollRef.current;
    if (!container) return;

    const hasOverflow = container.scrollWidth > container.clientWidth;
    const isAtStart = container.scrollLeft <= 10;
    const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;

    setShowLeftGradient(hasOverflow && !isAtStart);
    setShowRightGradient(hasOverflow && !isAtEnd);
  };

  // Mouse wheel horizontal scrolling
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };

  // Start dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container) return;

    setIsDragging(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeft(container.scrollLeft);
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";
  };

  // Handle drag movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();

    const container = scrollRef.current;
    if (!container) return;

    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5; // Multiply for faster scroll
    container.scrollLeft = scrollLeft - walk;
  };

  // Stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
    const container = scrollRef.current;
    if (container) {
      container.style.cursor = "grab";
      container.style.userSelect = "";
    }
  };

  // Handle mouse leaving while dragging
  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      const container = scrollRef.current;
      if (container) {
        container.style.cursor = "grab";
        container.style.userSelect = "";
      }
    }
  };

  // Scroll by clicking chevrons
  const handleScrollLeft = () => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({ left: -400, behavior: "smooth" });
  };

  const handleScrollRight = () => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({ left: 400, behavior: "smooth" });
  };

  // Check overflow on mount, scroll, and resize
  useEffect(() => {
    checkOverflow();
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => checkOverflow();
    const handleResize = () => checkOverflow();

    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [children]);

  return (
    <div className="relative group">
      {/* Left Gradient Overlay with Chevron */}
      {showLeftGradient && (
        <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
          <button
            onClick={handleScrollLeft}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface/80 backdrop-blur-sm border border-subtle hover:bg-surface hover:border-accent/50 transition-all pointer-events-auto opacity-0 group-hover:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} className="text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Right Gradient Overlay with Chevron */}
      {showRightGradient && (
        <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
          <button
            onClick={handleScrollRight}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface/80 backdrop-blur-sm border border-subtle hover:bg-surface hover:border-accent/50 transition-all pointer-events-auto opacity-0 group-hover:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} className="text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Scrollable Content */}
      <div
        ref={scrollRef}
        className={`flex gap-4 overflow-x-auto py-6 -my-6 -mx-4 px-4 scrollbar-hide cursor-grab active:cursor-grabbing ${className}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </div>
  );
}
