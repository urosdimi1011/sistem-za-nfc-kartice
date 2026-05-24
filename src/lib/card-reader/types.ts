// Apstrakcija nad fizičkim čitačem kartica.
// Aplikacija ne zna kako se UID dobija — keyboard, USB, lokalni agent — samo prima string.

export type CardScanHandler = (uid: string) => void;

export interface CardReader {
  /** Pokreni osluškivanje skeniranja. Vraća unsubscribe funkciju. */
  start(onScan: CardScanHandler): () => void;
}

export type CardReaderKind = "manual" | "keyboard";
