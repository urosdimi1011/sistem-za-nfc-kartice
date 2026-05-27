// Kurirana lista ikona iz lucide-react za hranu/piće.
// Vrednosti su tačni nazivi komponenti — koriste se i u bazi i u UI.

// Kurirana lista lucide-react ikona za hranu/piće.
// Imena su tačni Pascal-case nazivi komponenti (lucide-react export-uje tako).
export const MENU_ICONS = [
  // Topli napici
  "Coffee", // kafa, šolja sa parom
  "Leaf", // čaj (asocijacija na bilje)
  "Soup", // naglasak na toplo (para)

  // Hladni napici i flašice
  "CupSoda", // čaša sa slamkom (sok, kola)
  "GlassWater", // čaša vode
  "Milk", // kartonska mlečna ambalaža
  "BottleWine", // flašica vina
  "FlaskRound", // generička okrugla flašica
  "Wine", // čaša vina
  "Beer", // pivska čaša
  "Martini", // koktel
  "Grape", // sok od grožđa, vino
  "Wheat", // pivo (slad)

  // Hrana — sendviči, brza
  "Pizza",
  "Sandwich",
  "Hamburger",
  "Croissant",

  // Meso
  "Beef", // svinjsko / govedo
  "Drumstick", // pileći but
  "Ham", // šunka
  "Fish", // riba
  "EggFried", // jaje na oko (sa žumancetom)
  "Egg", // standardno jaje

  // Topla jela / činije
  "Salad",
  "IceCreamBowl", // tanjir/činija — koristi i kao "tanjir hrane" generički

  // Slatkiši
  "Cookie",
  "Cake",
  "Donut",
  "Candy",
  "IceCream",

  // Snack
  "Popcorn",
  "Nut",

  // Voće / dodatak
  "Apple",
  "Banana",
  "Cherry",
  "Carrot",

  // Generički
  "ChefHat", // priprema, dnevni meni
  "UtensilsCrossed", // default
] as const;

export type MenuIconName = (typeof MENU_ICONS)[number];

export const DEFAULT_ICON: MenuIconName = "UtensilsCrossed";

// Predefinisana paleta boja — usklađene sa Tailwind 500-ima.
// `slug` čuvamo u bazi; `bg`/`text`/`border` su klase za UI.
export const MENU_COLORS = [
  {
    slug: "amber",
    label: "Žuta",
    hex: "#f59e0b",
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-900",
    badge: "bg-amber-500",
  },
  {
    slug: "orange",
    label: "Narandžasta",
    hex: "#f97316",
    bg: "bg-orange-100 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-900",
    badge: "bg-orange-500",
  },
  {
    slug: "red",
    label: "Crvena",
    hex: "#ef4444",
    bg: "bg-red-100 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-900",
    badge: "bg-red-500",
  },
  {
    slug: "pink",
    label: "Roze",
    hex: "#ec4899",
    bg: "bg-pink-100 dark:bg-pink-950/40",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-900",
    badge: "bg-pink-500",
  },
  {
    slug: "violet",
    label: "Ljubičasta",
    hex: "#8b5cf6",
    bg: "bg-violet-100 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-900",
    badge: "bg-violet-500",
  },
  {
    slug: "blue",
    label: "Plava",
    hex: "#3b82f6",
    bg: "bg-blue-100 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-900",
    badge: "bg-blue-500",
  },
  {
    slug: "emerald",
    label: "Zelena",
    hex: "#10b981",
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-900",
    badge: "bg-emerald-500",
  },
  {
    slug: "zinc",
    label: "Siva",
    hex: "#71717a",
    bg: "bg-zinc-100 dark:bg-zinc-900",
    text: "text-zinc-700 dark:text-zinc-300",
    border: "border-zinc-200 dark:border-zinc-800",
    badge: "bg-zinc-500",
  },
] as const;

export type MenuColorSlug = (typeof MENU_COLORS)[number]["slug"];

export const COLOR_SLUGS = MENU_COLORS.map((c) => c.slug) as readonly MenuColorSlug[];

export function getColorPreset(slug: string) {
  return MENU_COLORS.find((c) => c.slug === slug) ?? MENU_COLORS[MENU_COLORS.length - 1];
}
