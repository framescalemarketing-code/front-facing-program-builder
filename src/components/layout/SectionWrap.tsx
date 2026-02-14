import React from "react";

export function SectionWrap(props: { children: React.ReactNode }) {
  return <section className="py-10">{props.children}</section>;
}
