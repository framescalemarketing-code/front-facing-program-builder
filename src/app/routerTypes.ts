export type PageId = "builder" | "program" | "recommendation" | "recommendation_summary";

export type NavSource =
  | "builder_continue"
  | "program_continue"
  | "recommendation_complete"
  | "internal";

export type NavigateFn = (page: PageId, via?: NavSource) => void;
