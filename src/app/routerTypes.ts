export type PageId = "builder" | "calculator" | "quote";

export type NavSource = "builder_continue" | "calculator_continue" | "internal";

export type NavigateFn = (page: PageId, via?: NavSource) => void;
