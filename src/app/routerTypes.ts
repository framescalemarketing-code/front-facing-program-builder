export type PageId =
  | "builder"
  | "program"
  | "calculator"
  | "quote"
  | "recommendation"
  | "recommendation_summary";

export type NavSource =
  | "builder_continue"
  | "program_continue"
  | "calculator_continue"
  | "recommendation_complete"
  | "internal";

export type NavigateFn = (page: PageId, via?: NavSource) => void;
