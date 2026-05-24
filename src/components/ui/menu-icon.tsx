import * as Icons from "lucide-react";
import { DEFAULT_ICON, type MenuIconName } from "@/lib/menu-presets";

interface MenuIconProps {
  name?: string | null;
  className?: string;
}

/**
 * Renderuje lucide ikonu po nazivu. Ako ime nije iz naše liste ili je null,
 * koristi default UtensilsCrossed.
 */
export function MenuIcon({ name, className }: MenuIconProps) {
  const iconName = (name ?? DEFAULT_ICON) as MenuIconName;
  const Component =
    (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
      iconName
    ] ?? Icons.UtensilsCrossed;
  return <Component className={className} />;
}
