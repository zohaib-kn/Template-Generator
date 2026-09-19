import { useLorContext } from "../state/LorContext";

/**
 * Hook for consuming LOR Generator state and actions.
 */
export function useLorState() {
  return useLorContext();
}
