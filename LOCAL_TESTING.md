# Local Testing

1. Create a `.env.local` file in the project root for Vite and local serverless config.
2. Put frontend vars in `.env.local`:
   - `VITE_API_BASE_URL=http://localhost:3000`
   - `VITE_SUPPORT_EMAIL=team@onsightoptics.com`
   - `VITE_SUPPORT_PHONE=619-402-1033`
   - `VITE_SHOWROOM_ADDRESS=6780 Miramar Rd, San Diego, CA 92121`
3. Put server vars in `.env.local` as well, or copy values from `.env.server.example`:
   - `RESEND_API_KEY=...`
   - `FROM_EMAIL=onboarding@resend.dev`
   - `TO_EMAIL=framescalemarketing@framescalemarketing.com`
   - `RESEND_TEST_MODE=true`
   - `CORS_ALLOW_ORIGIN=http://localhost:5173`
   - `APPLE_MAPS_JWT=...` (optional but recommended for shortest-route comparison with Apple + OSM providers)
   When `RESEND_TEST_MODE=true`, submit sends are forced to:
   - `from: OSSO Quotes <onboarding@resend.dev>`
   - `to: framescalemarketing@framescalemarketing.com`
   - subject prefix: `[QUOTE TEST]`
4. Restart both terminals any time you change environment variables.
5. Run `vercel dev` in one terminal (serves `/api` on `http://localhost:3000`).
6. Run `npm run dev` in a second terminal (Vite on `http://localhost:5173`).
7. Confirm `VITE_API_BASE_URL` is set to `http://localhost:3000`.
8. Submit a quote from the UI, or test the API directly with PowerShell:

```powershell
$payload = @{
  quoteId = "QLOCALTEST001"
  createdAtIso = (Get-Date).ToString("o")
  showroomReference = "6780 Miramar Rd, San Diego, CA 92121"
  draft = @{
    builder = @{
      guidelines = @{
        sideShieldType = "permanent"
        eligibilityFrequency = "annual"
        hsaFsaAvailable = $false
        approvalWorkflowEnabled = $false
      }
    }
    calculator = @{
      contact = @{
        companyName = "Acme Co"
        fullName = "Jane Doe"
        email = "jane.doe@example.com"
        phone = "619 555 0100"
      }
      locations = @(
        @{
          label = "Location 1"
          streetAddress = "123 Main St"
          city = "San Diego"
          state = "CA"
          zipCode = "92121"
        }
      )
      selectedEU = "Compliance"
      selectedTier = "Essential"
      eligibleEmployees = 25
      paymentTerms = "NET30"
      paymentDiscount = "none"
    }
  }
  estimate = @{
    onboardingFee = 1200
    allowanceTotal = 0
    serviceTotal = 0
    extraVisitsFee = 0
    travelTotal = 0
    financeFeeTotal = 0
    discountTotalMax = 0
    grandTotal = 1200
    travelByLocation = @()
  }
}

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/send-quote" `
  -ContentType "application/json" `
  -Body ($payload | ConvertTo-Json -Depth 12)
```

9. Optional deterministic curl test using a JSON file:

```powershell
curl.exe -i -sS -X POST "http://localhost:3000/api/send-quote" `
  -H "Content-Type: application/json" `
  -H "Expect:" `
  --data-binary "@send-quote-test.json"
```
