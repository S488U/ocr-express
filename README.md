# OCR Express

OCR Express is a modern, fast, and privacy-friendly web app to extract text from images using Tesseract OCR (via WebAssembly) on a Node.js backend. Upload, paste, or link images and get instant text results with a beautiful, responsive UI.

## Features
- Upload, drag & drop, or paste multiple images
- Provide image URLs (comma or newline separated)
- Preview images before processing
- See OCR results for each image, with backend/frontend timing
- Copy results with one click
- View images in a large modal
- Developer-friendly API documentation and example requests
- SEO-ready with meta tags, sitemap, and robots.txt
- Built with Node.js, Express, Tesseract, [tesseract-wasm](https://www.npmjs.com/package/tesseract-wasm), Tailwind CSS, and highlight.js

## 🚀 Quick Start (Docker)
The easiest way to run the app. No need to install Node.js.

1. **Get the code:** Download or clone this repository.
2. **Run with Docker Compose:**
   ```bash
   docker compose up --build
   ```
3. **Open your browser:**
   Visit `http://localhost:3000`

## 🛠 Manual Setup (Development)
If you want to modify the code or run without Docker.

1. **Prerequisites:** Ensure you have Node.js 22+ installed.
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run the server:**
   ```bash
   npm start
   ```
   *(Access via `http://localhost:3000`)*

## API Usage
See the API section in the web UI or the internal API documentation for details and examples.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
This project was part of vibe coding.