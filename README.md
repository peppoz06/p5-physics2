Tilt & Shake — 3D Physics Demo

This is a single-page mobile-first demo that shows pastel spheres inside a frosted transparent cube. The demo uses Three.js for rendering and cannon-es for physics. Device orientation and motion are used on mobile to change gravity and shake the balls.

Files
- index.html — main page
- style.css — styles
- main.js — main module (uses ES modules and CDN imports)

How to run
- No bundler required. Just open `index.html` in a modern browser that supports ES modules.
- For local testing, serve the folder via a simple HTTP server. For example (macOS / zsh):

```bash
# from project folder
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Notes
- On iOS/Safari you must tap "Enable motion controls" which triggers the DeviceMotion permission dialog.
- Desktop users can drag the view to tilt the cube (pointer) or use arrow keys.
- The demo is tuned for mobile performance. If you need to optimize further, reduce shadow map size, lower sphere count, or reduce physics solver iterations.

License
Free to use in demos and learning projects.
