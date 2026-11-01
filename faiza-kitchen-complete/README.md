# Faiza Kitchen — Pakistani Desi Food Ordering Website

This is a **starter project for a professional restaurant ordering website**, branded as Faiza Kitchen.
It includes a desi Pakistani sample menu with suggested PKR prices, customer accounts, delivery address
collection, Cash on Delivery checkout, order history/tracking, admin order/menu controls, policy pages,
and an optional Ollama-powered menu assistant.

## Important before launch
- Suggested prices are estimates in PKR, not confirmed business prices. Review every item and price.
- Replace sample phone/email/address/social links and policy wording with the real business details.
- Food images use remote Unsplash image URLs. Verify image rights, accuracy and loading; replace with your own licensed food photos.
- This code has **not** been security-audited or tested against your real hosting/database accounts.
- This is not yet a live website. Netlify hosts the frontend; the Express backend needs a separate host such as Render; MongoDB Atlas hosts the database.
- Checkout is Cash on Delivery only. No card/JazzCash/Easypaisa gateway is included.
- The AI assistant is optional and requires an Ollama cloud API key in the backend environment. Never put that key in the frontend.

## Folder guide
- `client/` = customer-facing website (frontend)
- `server/` = API, accounts, orders, menu, admin and AI assistant (backend)

## Run locally (Windows)
1. Install Node.js LTS and MongoDB Community Server, or create a MongoDB Atlas database.
2. Open this whole `faiza-kitchen-complete` folder in VS Code.
3. In VS Code, open Terminal > New Terminal.
4. Run:
   ```bash
   cd server
   npm install
   ```
5. Copy `server/.env.example` to `server/.env`. Fill in `MONGODB_URI`, a long random `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional Ollama settings. Do not share `.env`.
6. In the server terminal:
   ```bash
   npm run seed:admin
   npm run dev
   ```
7. Open another VS Code terminal:
   ```bash
   cd client
   npm install
   ```
8. Create `client/.env` with:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
9. Start the website:
   ```bash
   npm run dev
   ```
10. Open the local URL shown by Vite, usually `http://localhost:5173`.

Keep both terminals running. MongoDB must be reachable.

## Deploy overview
1. Create MongoDB Atlas database and copy its connection string into Render environment variable `MONGODB_URI`.
2. Deploy the `server/` folder as a Node web service on Render. Build command `npm install`; start command `npm start`.
3. Set backend environment variables in Render using `server/.env.example` as a guide. Set `CLIENT_URL` to your Netlify website URL.
4. Deploy `client/` on Netlify. Build command `npm run build`; publish directory `dist`; set `VITE_API_URL` to your Render backend URL plus `/api`.
5. Add your purchased domain in Netlify and follow its DNS instructions.
6. Test registration, login, checkout, address fields, COD, order tracking, admin access, policies and mobile layout before accepting real orders.

## Admin
Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the server environment, then run `npm run seed:admin`. The seed script creates or updates the admin account. Use a unique strong password.

## API and privacy notes
Passwords are hashed. Auth uses JWT. Order tracking uses an unguessable database ID, but the public tracking endpoint reveals limited order details; review whether you want to require phone/email verification before production. Add a proper privacy notice, retention policy, backups, monitoring, and security review before taking customer data.
