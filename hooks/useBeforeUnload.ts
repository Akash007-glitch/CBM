import { useEffect } from "react";

/**
 * Attaches a `beforeunload` event listener that triggers the browser's
 * native "Leave site?" confirmation dialog whenever the user tries to:
 *   - Close the tab or window
 *   - Hard-refresh the page (F5 / Ctrl+R)
 *   - Navigate to a fully external URL (address bar, bookmark, etc.)
 *
 * NOTE: The custom `message` string is ignored by every modern browser
 * (Chrome 51+, Firefox 44+, Safari) for security reasons. The browser
 * always shows its own generic text, so we just set returnValue to a
 * non-empty string to trigger the dialog.
 *
 * @param enabled - When false the listener is not attached (default: true).
 */
export function useBeforeUnload(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers (IE, some legacy Edge) require returnValue to be set.
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled]);
}
