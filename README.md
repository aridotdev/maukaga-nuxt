# Mau KaGa Nuxt

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Build CS Static

CS tidak membutuhkan Node runtime di server kantor. Node hanya diperlukan di mesin build atau CI.

```bash
pnpm install
pnpm build:cs
```

Deploy isi folder berikut ke static hosting internal:

```text
apps/cs-web/.output/public/
```

Recommended runtime: IIS, Apache, Nginx, static intranet host, atau static hosting internal lain yang disetujui IT.

Fallback: zip folder `apps/cs-web/.output/public/`, extract di PC cabang, lalu buka `index.html`. Fallback ini wajib diuji karena `file://` tidak sama dengan static hosting untuk routing, asset path, MIME type, dan fetch browser.

Untuk deployment di subfolder, set base URL saat build:

```bash
NUXT_APP_BASE_URL=/maukaga-cs/ pnpm build:cs
```

Artifact produksi CS harus tetap bebas dari halaman, route, middleware, composable, dan server API admin.

## Production Root App

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
