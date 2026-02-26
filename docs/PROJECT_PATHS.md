# Project paths

## Entry points

| Path | Purpose |
| --- | --- |
| `src/main.tsx` | Vite entry that mounts the React app |
| `src/App.tsx` | App composition: providers plus `AppShell` |

## App shell and routing

| Path | Purpose |
| --- | --- |
| `src/app/AppShell.tsx` | Header footer and in memory page navigation |
| `src/app/routerTypes.ts` | Page IDs and navigation types |

## Features

| Path | Purpose |
| --- | --- |
| `src/features/recommendation-intake/RecommendationIntakePage.tsx` | Guided recommendation intake flow |
| `src/features/recommendation-summary/RecommendationSummaryPage.tsx` | Final front-facing summary |

## Shared UI

| Path | Purpose |
| --- | --- |
| `src/components/` | Reusable components used across features |
| `src/components/layout/` | Layout wrappers and footer |

## State and domain logic

| Path | Purpose |
| --- | --- |
| `src/hooks/useProgramDraft.ts` | Draft state, localStorage persistence |
| `src/lib/programDraft.ts` | Draft types plus merge serialize utilities |
| `src/lib/recommendProgram.ts` | Rule engine for EU package and tier recommendation |
| `src/lib/programRecommendation.ts` | Maps intake answers into draft and config patch |

## Import aliases

Use `@/` to import from `src/`.

Examples

```ts
import { AppShell } from "@/app/AppShell";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { RecommendationIntakePage } from "@/features/recommendation-intake";
```
