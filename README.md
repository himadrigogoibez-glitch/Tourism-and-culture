# Roam North East

A responsive static tourism discovery prototype for North East India, built for the Tourism & Culture hackathon prompt.

## Run locally

Open index.html in a modern browser. Remote Unsplash photos and Google Fonts enhance the page, but the application has no runtime libraries or API keys.

## Test

Requires Node.js 18 or newer. Run `node --test tests/*.test.js` from this folder. The built-in Node test runner checks destination coverage and source links, keyword and facet filtering, price sorting, saved-place filtering, duration-based trip estimates, share-link validation, stored-preference sanitization, safe rendering, and key accessibility markup.

## Features

- Browse a starter destination from each of the eight North East states
- Search destination names, states, regions, descriptions, and travel styles
- Combine state, travel-style, saved-place, and example-budget filters
- Sort by illustrative price from low to high or high to low
- Add or remove trip stops and scale the example budget by days per stop
- Choose a trip month and transport preference, save preferences locally, and share the full plan in a route link
- Open official tourism information from destination cards

## Accessibility, privacy, and content

The app uses semantic landmarks, visible focus styles, keyboard-operable controls, status announcements, reduced-motion support, lazy-loaded images, safe text rendering, and validated share-link data. It stores only favorites, trip stops, month, budget, sort choice, travel preference, and days per stop in this browser; there is no account or server-side tracking in this prototype.

Daily spend amounts are illustrative placeholders, not live prices or quotes. Confirm current costs, permits, access, weather, and local guidance with official sources and local operators before travel. The starter list is not a complete directory. Photos are illustrative and may not depict the named destination.

