# MUSD Signal Glass — Wave 1 presentation evidence

The 7-page editable, original HTML deck and its rendered PDF cover the **live public Mezo MUSD read-only app**, the explicit user problem, technical safety boundaries, one actual pinned mainnet observation, and realistic future scope.

- Deck PDF: MUSD-Signal-Glass-Mezo-Wave1-Pitch-20261023.pdf
- Pitch video: MUSD-Signal-Glass-2min-Pitch-20261023.mp4 (GitHub Release asset, 119.512 seconds, locally synthesized English narration and original slides).
- Evidence: Original repo root has 25 offline Node test results, official Mezo RPC snapshot JSON and real public-browser screenshot.
- Script provenance: deck.html, render-deck.mjs, build-video.py, voice/script-01.txt through script-07.txt.

Rebuild slides from deck.html using the existing Playwright-compatible browser dependency referenced in render-deck.mjs. For narrations, install the local open-source tool espeak-ng and render each voice/script-NN.txt to voice/voice-NN.wav at English speed 170, pitch 45, then run build-video.py using ffmpeg. The rebuilt audio/video is reproducible but may have minor codec timing variance.

No grant award, revenue, trading position, authenticated Mezo merchant or paid customer is represented. Video shows real deployed UI screenshots, test evidence and limitations, not a fabricated onchain payment. One original South Korea-based human beneficial owner, with transparent AI assistance.
