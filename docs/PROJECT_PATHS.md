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
| `src/features/program-builder/ProgramBuilderPage.tsx` | Program Builder UI |
| `src/features/program-calculator/ProgramCalculatorPage.tsx` | Calculator UI and estimates |
| `src/features/quote-preview/QuotePreviewPage.tsx` | Quote preview, PDF generation, submit |

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
| `src/lib/dependencyRules.ts` | Rules controlling which calculator options are visible |

## Serverless API

| Path | Purpose |
| --- | --- |
| `api/send-quote.ts` | Vercel function for sending quote email via Resend |

## Import aliases

Use `@/` to import from `src/`.

Examples

```ts
import { AppShell } from "@/app/AppShell";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { ProgramCalculatorPage } from "@/features/program-calculator";
```
