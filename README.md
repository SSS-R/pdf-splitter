# Client-Side PDF Splitter

A modern, secure, and fast PDF manipulation tool built with React. This application runs entirely in your browser, meaning your PDF files are **never uploaded to a server**, ensuring 100% privacy.

## ✨ Features

- **Client-Side Processing**: All PDF splitting happens locally using `pdf-lib`.
- **Privacy First**: No server uploads. Your confidential documents stay on your machine.
- **Flexible Ranges**: Support for complex ranges (e.g., `1-5`, `1,3,5`, `10-end`).
- **Modern UI**: Designed with a premium dark theme and glassmorphism effects.
- **Responsive**: Works seamlessly on desktop and mobile.
- **Instant Preview**: Fast processing with immediate download links.

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
