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
  const [hasDragged, setHasDragged] = useState(false);
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
    setHasDragged(false);
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

    // If user has dragged more than 5px, mark as dragged
    if (Math.abs(walk) > 5) {
      setHasDragged(true);
    }

    container.scrollLeft = scrollLeft - walk;
  };

  // Stop dragging
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (container) {
      container.style.cursor = "grab";
      container.style.userSelect = "";
    }

    // If user dragged significantly, prevent click events
    if (hasDragged && isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }

    setIsDragging(false);
    setHasDragged(false);
  };

  // Handle mouse leaving while dragging
  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setHasDragged(false);
      const container = scrollRef.current;
      if (container) {
        container.style.cursor = "grab";
        container.style.userSelect = "";
      }
    }
  };

  // Prevent click if user was dragging
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Scroll by clicking chevrons
  const handleScrollLeft = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({ left: -400, behavior: "smooth" });
  };

  const handleScrollRight = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="relative py-6 -my-6">
      <div className="group relative">
        {/* Left Chevron */}
        {showLeftGradient && (
          <button
            onClick={handleScrollLeft}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity hover:text-purple-400 text-muted-foreground"
            aria-label="Scroll left"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
        )}

        {/* Right Chevron */}
        {showRightGradient && (
          <button
            onClick={handleScrollRight}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity hover:text-purple-400 text-muted-foreground"
            aria-label="Scroll right"
          >
            <ChevronRight size={28} strokeWidth={2.5} />
          </button>
        )}

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className={`flex gap-4 overflow-x-auto -mx-4 px-4 scrollbar-hide cursor-grab active:cursor-grabbing ${className}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
