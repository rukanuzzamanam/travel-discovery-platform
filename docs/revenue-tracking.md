# Revenue tracking

```
/destinations/bali  →  click "Hotels"  →  /go/hotel/<id>?from=/destinations/bali&c=booking-panel-hotel
   →  AffiliateClick (session, page, component, destination, provider, subId)
   →  Travelpayouts  →  booking  →  Conversion (commission, status)  →  /admin/revenue
```

## What is recorded

`AffiliateClick`: `sessionId` (anonymous httpOnly cookie), `userId?`, `provider`, `productType`, `destinationId?`, `sourcePage`, `sourceComponent`, `campaign`, `affiliateUrl`, unique `subId`, `createdAt`. Each click also emits `flight|hotel|activity|car_affiliate_click`.

`Conversion`: `affiliateClickId?`, `provider`, `productType`, `commission?` (nullable), `currency`, `status` (PENDING/CONFIRMED/REJECTED), `bookingReference?`.

## Getting commissions in

The provider's reports arrive after the fact. Today conversions are entered in **/admin/revenue → Record a conversion** by matching the **sub id** from the partner report to a click (needs EDITOR). Idempotent per click + booking reference. Automating this (a scheduled import of Travelpayouts statistics, or a postback endpoint) is the natural next step once you have confirmed the reporting API/postback format for your account.

## Reports

`/admin` and `/admin/revenue`: revenue and click counts by **source page**, **destination** and **provider**, plus a conversions table. Revenue sums USD, non-rejected conversions. "Conversion rate" = conversions / clicks in the selected window.

## Reading it

- High clicks, low revenue → page sends traffic that doesn't book (check intent/placement).
- Revenue per click by component (`sourceComponent`) shows which CTA placement works.
- Attribution is last-click within the click's own `subId`; there is no cross-session stitching.
