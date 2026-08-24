# Prashant Portfolio — Complete Version

This package is designed to replace the current `src` and add your portrait under `public/images`.

## Requirements

Your existing Next.js project should already have Tailwind CSS configured.

Install:

```bash
cd ~/portfolio
npm install motion lucide-react
```

## Installation

1. Stop the local server with `Control + C`.
2. Extract this ZIP.
3. Copy the `src` and `public` folders into your project:

```bash
cp -R src ~/portfolio/
cp -R public ~/portfolio/
```

4. Start the development server:

```bash
cd ~/portfolio
npm run dev
```

5. Test the production build before publishing:

```bash
npm run build
```

## Important edits before publishing

Open:

```text
src/components/Portfolio.tsx
```

Update:

- LinkedIn URL
- Contact email
- Experience wording
- Research details
- Patent details

Open:

```text
src/app/layout.tsx
```

Update the `metadataBase` domain if your actual domain is not:

```text
https://prashantlokur.com
```

## Image

Your uploaded portrait is included as:

```text
public/images/prashant.png
```

## Privacy and confidentiality

The interactive engineering demo is labeled illustrative and does not claim to use proprietary or production vehicle data.
