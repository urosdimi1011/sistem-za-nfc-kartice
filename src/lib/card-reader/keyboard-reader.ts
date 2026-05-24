import type { CardReader, CardScanHandler } from "./types";

/**
 * Keyboard (HID) reader — za RFID/NFC čitače koji emuliraju tastaturu.
 * Karakteristika: brzo "ukucaju" UID + Enter na kraju.
 *
 * Detekcija: ako između dva pritiska prođe < `interKeyTimeoutMs`, to je skeniranje.
 * Ako prođe više — to je čovek koji kuca, ignorišemo.
 */
export interface KeyboardCardReaderOptions {
  interKeyTimeoutMs?: number;
  minUidLength?: number;
}

export class KeyboardCardReader implements CardReader {
  private buffer = "";
  private lastKeyAt = 0;
  private readonly interKeyTimeoutMs: number;
  private readonly minUidLength: number;

  constructor(opts: KeyboardCardReaderOptions = {}) {
    this.interKeyTimeoutMs = opts.interKeyTimeoutMs ?? 50;
    this.minUidLength = opts.minUidLength ?? 4;
  }

  start(onScan: CardScanHandler) {
    if (typeof window === "undefined") return () => {};

    const handler = (e: KeyboardEvent) => {
      const now = Date.now();
      const dt = now - this.lastKeyAt;
      this.lastKeyAt = now;

      if (e.key === "Enter") {
        if (this.buffer.length >= this.minUidLength) {
          const uid = this.buffer;
          this.buffer = "";
          onScan(uid);
          e.preventDefault();
        } else {
          this.buffer = "";
        }
        return;
      }

      // Reset bafera ako prođe previše vremena (čovek kuca, ne čitač)
      if (dt > this.interKeyTimeoutMs) {
        this.buffer = "";
      }

      if (e.key.length === 1) {
        this.buffer += e.key;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }
}
