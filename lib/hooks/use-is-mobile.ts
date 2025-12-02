"use client";

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

/**
 * Hook to detect if the current viewport is mobile-sized.
 * Uses SSR-safe pattern with initial false state.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

/**
 * Hook to detect if the current viewport is tablet-sized or smaller.
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkTablet = () => setIsTablet(window.innerWidth < TABLET_BREAKPOINT);

    // Initial check
    checkTablet();

    // Listen for resize
    window.addEventListener("resize", checkTablet);
    return () => window.removeEventListener("resize", checkTablet);
  }, []);

  return isTablet;
}

/**
 * Hook that returns both mobile and tablet states for more granular control.
 */
export function useResponsive() {
  const [state, setState] = useState({ isMobile: false, isTablet: false });

  useEffect(() => {
    const checkResponsive = () => {
      const width = window.innerWidth;
      setState({
        isMobile: width < MOBILE_BREAKPOINT,
        isTablet: width < TABLET_BREAKPOINT,
      });
    };

    // Initial check
    checkResponsive();

    // Listen for resize
    window.addEventListener("resize", checkResponsive);
    return () => window.removeEventListener("resize", checkResponsive);
  }, []);

  return state;
}
