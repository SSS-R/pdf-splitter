# Client-Side PDF Splitter

A modern, secure, and fast PDF manipulation tool built with React. This application runs entirely in your browser, meaning your PDF files are **never uploaded to a server**, ensuring 100% privacy.

## ✨ Features

- **Client-Side Processing**: All PDF splitting happens locally using `pdf-lib`.
- **Privacy First**: No server uploads. Your confidential documents stay on your machine.
- **Flexible Ranges**: Support for complex ranges (e.g., `1-5`, `1,3,5`, `10-end`).
- **Modern UI**: Designed with a premium dark theme and glassmorphism effects.
- **Responsive**: Works seamlessly on desktop and mobile.
- **Instant Preview**: Fast processing with immediate download links.

## 🧠 How It Works (Architecture)

This is a **Static Web Application**. It does not require a database or a backend server to process files.

### 🏠 Running Locally vs ☁️ Running Live
Even when you host this website on a public URL (like vercel, netlify, or your own domain):
1. **It works exactly the same.** The server only *delivers* the code to the user's browser.
2. **The Server is NOT processing files.** The processing still happens in the **user's computer** (Client-Side).
3. **No Database Needed.** Since files aren't stored, you don't need a database.
4. **Bandwidth Saver**: Because users don't "upload" files to you, it costs you almost nothing to host.

## ⚠️ Performance & Large Files

Since the processing happens on your device, performance depends on **your computer's RAM** (memory).

- **Files < 100MB**: Lightning fast.
- **Files 150MB - 300MB**: Works well on most modern laptops (8GB+ RAM). might take a few seconds.
- **Files 500MB+**: May cause the browser tab to crash if your device runs out of memory.

**Pro Tip**: Because there is no "uploading" phase, working with a 150MB file is often **faster** than server-based tools because you don't have to wait for the upload to finish!

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **PDF Processing**: [pdf-lib](https://pdf-lib.js.org/)
- **Icons**: Lucide React
- **Downloads**: FileSaver.js
- **Styling**: Vanilla CSS (Variables & modern layout techniques)

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pdf-splitter.git
   cd pdf-splitter
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

## 📦 Building for Production

To build the app for deployment (e.g., Vercel, Netlify, GitHub Pages):

```bash
npm run build
```

The output will be in the `dist` folder.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
