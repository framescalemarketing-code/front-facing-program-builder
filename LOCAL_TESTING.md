# Local Testing

1. Create `.env.local` in the project root.
2. Add frontend vars:
   - `VITE_SUPPORT_EMAIL=team@onsightoptics.com`
   - `VITE_SUPPORT_PHONE=619-402-1033`
   - `VITE_SHOWROOM_ADDRESS=6780 Miramar Rd, San Diego, CA 92121`
   - `VITE_BRAND_LOGO_URL=/brand/osso/osso-logo-horizontal.png`
3. Restart the dev server after changing env vars.
4. Run the app:
   - `npm run dev`
5. Run checks:
   - `npm run lint`
   - `npm run test`
