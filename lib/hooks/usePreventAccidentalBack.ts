"use client";

import { useEffect, useRef } from "react";

/**
 * Custom hook to intercept browser back navigation (popstate)
 * and prompt the user with a confirmation modal instead of silently logging out/exiting.
 */
export function usePreventAccidentalBack(
  onAttemptBack: () => void,
  enabled: boolean = true
) {
  const onAttemptBackRef = useRef(onAttemptBack);
  onAttemptBackRef.current = onAttemptBack;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // Push an extra history entry so pressing back fires popstate without immediately leaving
    window.history.pushState({ dashboardStay: true }, "", window.location.href);

    const handlePopState = () => {
      // Keep the current URL / history trap active
      window.history.pushState({ dashboardStay: true }, "", window.location.href);
      // Trigger the confirmation popup
      onAttemptBackRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled]);
}
