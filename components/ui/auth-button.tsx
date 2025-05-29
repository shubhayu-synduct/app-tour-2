"use client"

import { ButtonHTMLAttributes } from "react"
import { Button } from "./button"
import { IconLoader2 } from "@tabler/icons-react"

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  variant?: "default" | "outline" | "secondary" | "ghost" | "link"
}

export function AuthButton({ 
  children, 
  isLoading, 
  disabled, 
  variant = "default",
  ...props 
}: AuthButtonProps) {
  return (
    <Button
      variant={variant}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
          Please wait
        </>
      ) : (
        children
      )}
    </Button>
  )
} 