import { useEffect } from "react";
import { useAppContext } from "../context/AppContext";

// When disconnected: poll often to detect reconnection quickly.
// When connected: poll rarely — every API call already acts as implicit proof of life.
const POLL_DISCONNECTED = 5_000;
const POLL_CONNECTED = 30_000;

/**
 * Polls the yrest health endpoint and keeps `connected` in sync across the app.
 *
 * Uses adaptive polling: 5 s when disconnected, 30 s when connected.
 * The interval resets on each state change so reconnection is detected promptly.
 *
 * @returns Current connection state (`true` = API is reachable).
 */
export function useServerStatus() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("http://localhost:3070/api/health", {
          // Short timeout so a hung server doesn't block the UI for long.
          signal: AbortSignal.timeout(2000),
        });
        dispatch({ type: "SET_CONNECTED", payload: res.ok });
      } catch {
        dispatch({ type: "SET_CONNECTED", payload: false });
      }
    }

    check();
    const id = setInterval(check, state.connected ? POLL_CONNECTED : POLL_DISCONNECTED);
    return () => clearInterval(id);
    // Re-run when connected changes so the interval adjusts immediately.
  }, [dispatch, state.connected]);

  return state.connected;
}
