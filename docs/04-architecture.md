# 04 — Architecture
Static site, no build step: index.html + style.css + app.js + 404.html.
Vanilla JS IIFE exposing window.initSynapse(); auto-runs on DOMContentLoaded. Same src/ fragment also wrapped in a React shell for the Instinct File preview build.
State: single object in localStorage ("synapse.v1"), validated on load with graceful fallback.
No frameworks, no bundlers, no external JS. Only external request: Google Fonts (2 families).
