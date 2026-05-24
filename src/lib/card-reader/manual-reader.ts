import type { CardReader, CardScanHandler } from "./types";

/**
 * Manual reader — za development i fallback.
 * UI ručno poziva `emit(uid)` (npr. forma sa input poljem).
 */
export class ManualCardReader implements CardReader {
  private handler: CardScanHandler | null = null;

  start(onScan: CardScanHandler) {
    this.handler = onScan;
    return () => {
      this.handler = null;
    };
  }

  emit(uid: string) {
    this.handler?.(uid);
  }
}
