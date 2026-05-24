"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logoutAction } from "../actions";

interface LogoutButtonProps {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm";
  className?: string;
  showLabel?: boolean;
}

export function LogoutButton({
  variant = "ghost",
  size = "sm",
  className,
  showLabel = true,
}: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {showLabel && <span className="ml-2">Odjavi se</span>}
    </Button>
  );
}
