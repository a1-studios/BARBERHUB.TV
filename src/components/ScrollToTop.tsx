import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets scroll to the top of the page on every route change.
 * Also disables the browser's native scroll restoration so refreshes
 * land at the top instead of the last saved offset.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
