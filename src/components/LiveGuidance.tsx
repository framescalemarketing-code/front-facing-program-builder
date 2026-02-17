type LiveGuidanceProps = {
  message: string;
  politeness?: "polite" | "assertive";
  id?: string;
  className?: string;
};

export function LiveGuidance({ message, politeness = "polite", id, className }: LiveGuidanceProps) {
  if (!message?.trim()) return null;
  return (
    <p
      id={id}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={className ?? "text-sm text-muted-foreground"}
    >
      {message}
    </p>
  );
}
