export type PageId = "recommendation" | "recommendation_summary" | "recommendation_congratulations";

export type NavSource = "internal";

export type NavigateFn = (page: PageId, via?: NavSource) => void;
