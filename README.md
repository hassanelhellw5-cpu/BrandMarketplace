# BrandMarketplace — Website (React)

Modern public website + user dashboard for BrandMarketplace, wired to the deployed backend at `http://brandmarketplace.runasp.net`.

## Stack
- **React 18 + Vite** (JavaScript, no TypeScript)
- **axios** with JWT auth + automatic refresh-token flow
- **react-router-dom** v6
- **lucide-react** icons
- Custom design system (CSS variables) — dark "Lavish Noir" theme with violet→pink gradients

## Quick start
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build -> dist/
npm run preview    # serve the production build
```

## API wiring
- Dev: Vite proxies `/api/*` → `http://brandmarketplace.runasp.net` (see `vite.config.js`).
- Prod: set `VITE_API_BASE` to the API origin (defaults to `/api`, so same-origin on runasp.net).
- JWT stored in `localStorage`; on a 401 the client silently tries `POST /api/auth/refresh` once, then redirects to `/login`.

## Pages & endpoints used
| Page | Route | Backend endpoints |
|------|-------|-------------------|
| Home | `/` | `GET /profiles/search`, `GET /castings` |
| Explore | `/explore` | `GET /profiles/search` (filters + sort + pagination) |
| Model profile | `/model/:userId` | `GET /profiles/model`, `GET /portfolio`, `GET /reviews`, `GET /follows/counts`, `GET /follows/following`, `POST /follows/:id`, `POST /bookings`, `POST /reviews` |
| Portfolio | `/portfolio/:userId` | `GET /portfolio` |
| Castings | `/castings`, `/casting/:id` | `GET /castings`, `GET /castings/:id`, `POST /castings/:id/apply` |
| Campaigns | `/campaigns`, `/campaign/:id` | `GET /campaigns`, `GET /campaigns/:id`, `POST /campaigns/:id/apply` |
| Events | `/events`, `/event/:id` | `GET /events`, `GET /events/:id`, `GET /events/:id/tickets`, `POST /events/:id/register` |
| Marketplace | `/marketplace` | `GET /enterprise/marketplace` |
| Login | `/login` | `POST /auth/login` |
| Signup | `/signup` | `POST /auth/signup` |
| Forgot | `/forgot-password` | `POST /auth/forgot-password` |
| Dashboard | `/dashboard` | `GET /bookings`, `GET /notifications` |
| My bookings | `/my-bookings` | `GET /bookings`, `GET /bookings/:id`, `POST /bookings/:id/status`, `POST /bookings/:id/rate`, `POST /contracts/:id/sign` |
| My profile | `/profile` | `GET/PUT /profiles/model|brand|agency`, `POST /profiles/picture`, `POST /profiles/cover`, `GET /profiles/model/price-suggestion`, `GET /profiles/model/quality` |
| Wallet | `/wallet` | `GET /wallet`, `GET /wallet/transactions`, `GET /wallet/escrow`, `POST /wallet/deposit/proof`, `POST /wallet/withdraw` |
| Messages | `/messages` | `GET /chat/conversations`, `GET /chat/messages/:id`, `POST /chat/send` |
| Notifications | `/notifications` | `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all`, `DELETE /notifications/:id` |
| Admin | `/admin` (Admin/SuperAdmin only) | `GET /admin/dashboard`, `GET /users`, `PUT /admin/users/:id/status`, `GET/PUT /admin/reports`, `GET/PUT /admin/verifications`, `GET/PUT /admin/withdrawals` |

## Structure
```
src/
  api/client.js        axios instance + token store + refresh logic
  config.js            API base URL
  context/AuthContext.jsx
  components/          Navbar, Footer, Toast, Modal, ui (Spinner/Pagination/EmptyState)
  pages/               one file per page (public + protected)
```
