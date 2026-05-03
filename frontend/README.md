# House Rental System

This project contains a simple house rental frontend and an Express/MongoDB backend.

## Frontend

Open `index.html` in a browser to use the demo pages.

Pages included:

- `index.html` - home page with featured houses
- `search.html` - search and filter available houses
- `login.html` - tenant login demo
- `registrer.html` - registration page
- `dashboard.html` - add, view, update, and delete demo listings

The frontend uses `localStorage`, so it works before the backend is connected.

## Backend

Go into the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Start MongoDB on your computer, then run:

```bash
npm run dev
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

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/properties`
- `GET /api/properties/:id`
- `POST /api/properties`
- `PUT /api/properties/:id`
- `DELETE /api/properties/:id`
- `GET /api/bookings`
- `POST /api/bookings`
- `PATCH /api/bookings/:id/status`
