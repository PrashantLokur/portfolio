# Install Prashant Portfolio v1

This package replaces the initial homepage in your existing Next.js project.

## 1. Stop the development server

Press `Control + C`.

## 2. From your project folder, install the dependencies

```bash
cd ~/portfolio
npm install motion lucide-react
```

## 3. Copy these folders into your existing project

Copy the included `src` folder into `~/portfolio`, allowing it to replace the matching files.

On macOS Terminal, from the extracted download folder:

```bash
cp -R src ~/portfolio/
```

## 4. Start the website

```bash
cd ~/portfolio
npm run dev
```

Open http://localhost:3000

## 5. Personalize before publishing

In `src/components/Portfolio.tsx`:

- Replace the LinkedIn URL.
- Confirm the email address.
- Correct or expand the experience descriptions.
- Add verified publications.
- Confirm the exact patent information.
- Replace any placeholder claims before publishing.

In `src/app/layout.tsx`:

- Replace `https://prashantlokur.com` if your purchased domain is different.

## Notes

The engineering playground is deliberately labeled as illustrative. It does not use proprietary vehicle data or production control logic.
