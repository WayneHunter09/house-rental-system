# House Rental System

This project contains a simple house rental frontend and an Express/MongoDB backend.

## Frontend

Run the backend and open the Render/local server URL to use the database-backed pages.

Pages included:

- `index.html` - home page with search, featured houses, testimonials, and contact preview
- `houses.html` - search and filter available houses
- `house.html` - house detail page with photos and landlord contacts
- `about.html` - about page
- `contacts.html` - platform contact page
- `login.html` - login page
- `registrer.html` - tenant/landlord registration page
- `dashboard.html` - role-aware tenant, landlord, and admin dashboard

The frontend uses the backend API for users, properties, uploads, favorites, and admin management. It only keeps the login token and current user summary in `localStorage`.

## Backend

Go into the backend folder:

```bash
cd frontend/backend
```

Install dependencies:

```bash
npm install
```

Start MongoDB on your computer, then run:

```bash
npm run dev
```

Create or update the first admin account with:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=change-me npm run create-admin
```

The API will run at:

```text
http://localhost:5000
```

## Deploying To Render

Create one Render Web Service from the GitHub repository.

Use these settings:

- Service type: `Web Service`
- Branch: `main`
- Root Directory: `frontend/backend`
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`

Add these environment variables in Render:

- `MONGO_URI` - your MongoDB Atlas connection string
- `JWT_SECRET` - a strong secret value
- `NODE_ENV` - `production`

After deploy, open the Render URL. The same service serves the frontend pages and the backend API.

Do not commit your real `.env` file. Add the real `MONGO_URI` and `JWT_SECRET` only in the Render dashboard.

Uploaded property photos are stored on the server filesystem. On Render free web services, filesystem changes can be lost after redeploys or restarts, so use a persistent storage service like Cloudinary, S3, or Render Disk before relying on photo uploads in production.

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/properties`
- `GET /api/properties/:id`
- `POST /api/properties`
- `PUT /api/properties/:id`
- `DELETE /api/properties/:id`
- `GET /api/favorites`
- `POST /api/favorites/:propertyId`
- `DELETE /api/favorites/:propertyId`
- `GET /api/admin/reports`
- `GET /api/admin/users`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/listings`
- `PATCH /api/admin/listings/:id/status`
- `DELETE /api/admin/listings/:id`
