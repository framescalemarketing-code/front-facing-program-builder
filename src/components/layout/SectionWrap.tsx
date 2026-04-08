import React from "react";

export function SectionWrap(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const className = props.className ?? "py-8 sm:py-10";
  return <section className={className}>{props.children}</section>;
}
