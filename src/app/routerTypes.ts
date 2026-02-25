export type PageId = "recommendation" | "recommendation_summary";

export type NavSource = "internal";

export type NavigateFn = (page: PageId, via?: NavSource) => void;
