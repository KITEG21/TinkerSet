# Frontend (Vite + React + Tailwind)

Dev commands

```bash
# install deps (from frontend/)
npm install

# start frontend dev server
npm run dev

# build
npm run build

# tauri dev (if you have Tauri toolchain installed)
npm run tauri:dev
```

Notes
- This is a minimal scaffold tailored to your design system (dark theme tokens in `src/index.css`).
- Integrate with the Python backend at `http://127.0.0.1:8000` (FastAPI) — enable CORS there if needed.

Windows / Tauri prerequisites

- Install Rust (rustup): https://rustup.rs — Tauri requires the Rust toolchain.
- Install Visual Studio Build Tools (Desktop development with C++) for MSVC targets: https://visualstudio.microsoft.com/downloads/
- Install the Tauri CLI (either globally or use the local npm devDependency added here):
	- Global (recommended for dev): `cargo install tauri-cli`
	- Local (already added): `npm install` then `npx tauri dev`

If `tauri` is not recognized, make sure Rust + `cargo` are installed and on your PATH. Building the app requires the Rust toolchain even when using the Node CLI wrapper.
