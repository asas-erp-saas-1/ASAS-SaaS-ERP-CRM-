"use client"
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const ActionPanel = DialogPrimitive.Root
const ActionPanelTrigger = DialogPrimitive.Trigger
const ActionPanelClose = DialogPrimitive.Close

const ActionPanelPortal = DialogPrimitive.Portal

const ActionPanelOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <ActionPanelPortal>
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  </ActionPanelPortal>
))
ActionPanelOverlay.displayName = DialogPrimitive.Overlay.displayName

const ActionPanelContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <ActionPanelPortal>
    <ActionPanelOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 right-0 z-50 h-full w-3/4 max-w-sm gap-4 border-l border-asas-silver/20 bg-asas-charcoal p-6 shadow-2xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300 sm:max-w-md md:max-w-xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-asas-gold disabled:pointer-events-none data-[state=open]:bg-white/10">
        <X className="h-4 w-4 text-asas-silver hover:text-asas-sand" />
        <span className="sr-only">Fermer</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </ActionPanelPortal>
))
ActionPanelContent.displayName = DialogPrimitive.Content.displayName

const ActionPanelHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-left pb-4 border-b border-asas-silver/10",
      className
    )}
    {...props}
  />
)
ActionPanelHeader.displayName = "ActionPanelHeader"

const ActionPanelFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-asas-silver/10 mt-auto",
      className
    )}
    {...props}
  />
)
ActionPanelFooter.displayName = "ActionPanelFooter"

const ActionPanelTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-sm font-bold uppercase tracking-wider text-asas-sand",
      className
    )}
    {...props}
  />
))
ActionPanelTitle.displayName = DialogPrimitive.Title.displayName

const ActionPanelDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs text-asas-silver", className)}
    {...props}
  />
))
ActionPanelDescription.displayName = DialogPrimitive.Description.displayName

export {
  ActionPanel,
  ActionPanelPortal,
  ActionPanelOverlay,
  ActionPanelTrigger,
  ActionPanelClose,
  ActionPanelContent,
  ActionPanelHeader,
  ActionPanelFooter,
  ActionPanelTitle,
  ActionPanelDescription,
}
