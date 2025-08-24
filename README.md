# Apply Hub

A blank React website built with TypeScript and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (one-way operation)

## Project Structure

```
apply-hub/
├── public/
│   └── index.html
├── src/
│   ├── App.tsx          # Main application component
│   ├── index.tsx        # Application entry point
│   ├── index.css        # Global styles with Tailwind CSS
│   └── react-app-env.d.ts # TypeScript declarations
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
└── README.md           # This file
```

## Technologies Used

- **React** - JavaScript library for building user interfaces
- **TypeScript** - Typed JavaScript for better development experience
- **Tailwind CSS** - Utility-first CSS framework
- **Create React App** - React development environment

## Customization

The website includes:

- Responsive header with navigation
- Hero section with call-to-action buttons
- Footer
- Mobile-friendly design
- Full TypeScript support with proper type annotations

You can customize the design by modifying the Tailwind CSS classes in the components or extending the Tailwind configuration in `tailwind.config.js`.

## TypeScript Benefits

This project uses TypeScript which provides:

- Better IntelliSense and autocomplete
- Catch errors at compile time
- Better refactoring support
- Improved code documentation through types
- Enhanced developer experience

## Building for Production

To create a production build:

```bash
npm run build
```

This will create an optimized build in the `build` folder that you can deploy to any static hosting service.
