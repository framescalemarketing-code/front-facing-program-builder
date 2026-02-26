# Front Facing Program Builder

Front-facing React + TypeScript app for:
- Program Recommendation intake
- Program Recommendation summary

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

