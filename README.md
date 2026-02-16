# OSSO Quote Tool Front Facing

Internal React + TypeScript app for:
- Program Builder
- Program Calculator
- Quote Preview + print-ready output

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Start dev server:
```bash
npm run dev
```

3. Build production bundle:
```bash
npm run build
```

## Environment Variables

Frontend (`Vite`):
- `VITE_SHOWROOM_ADDRESS`
- `VITE_SUPPORT_EMAIL`
- `VITE_SUPPORT_PHONE`
- `VITE_BRAND_LOGO_URL`
- `VITE_API_BASE_URL` (only needed when quote submit is enabled)
- `VITE_ENABLE_QUOTE_SUBMIT` (`true`/`false`, defaults to `false`)

Backend (`Vercel functions`, only relevant if submit is enabled):
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `TO_EMAIL`
- `RESEND_TEST_MODE`
- `CORS_ALLOW_ORIGIN`
- `APPLE_MAPS_JWT`

## Quote Submit Feature Flag

Submit UI/actions are behind:
- `VITE_ENABLE_QUOTE_SUBMIT`

Default behavior is disabled (`false`) to keep the workflow print-first.

## Print/PDF Behavior

Quote Preview print output is grouped in this order:
1. Contact + Guidelines + Notes + Selected Options
2. Locations and visits
3. Program Inputs + Payment Terms
4. Total Estimate

Additional print rules:
- Page header (logo/name/details) repeats on new printed pages.
- Large sections can flow across pages to minimize blank pages.
- Item-level blocks (locations and breakdown blocks) avoid mid-item splitting where possible.

## Validation

Contact validation includes:
- Email format (`name@company.com`)
- Phone format (`###-###-####`)
- Auto-formatting for phone input while typing

## Quality Commands

```bash
npm run lint
npm run test
```

Test pipeline:
- `npm run test:build` compiles test targets into `.tmp-tests`
- `npm run test` runs `node:test` on compiled test files

