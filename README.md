# StarReach Talent Booking Platform

Full-stack version of the supplied talent-booking design, separated into HTML/CSS/JS and connected to an Express + MongoDB backend.

## Features
- Clickable artist images and profiles
- Artist profile page with booking sections and prices
- Register/sign-in modals on the same page
- Clicking Book while logged out opens registration
- Logged-in clients get a client profile/dashboard
- Booking form collects event management information
- Admin dashboard with client/artist/booking statistics
- Admin can update booking status
- JWT authentication and hashed passwords
- Responsive navigation, FAQ, animations and gallery interactions

## Run
1. Open `backend/.env.example`, copy it to `backend/.env`, and fill in your Atlas credentials.
2. From `backend` run `npm install`.
3. Run `npm run seed:admin` once.
4. Run `npm run dev`.
5. Open `http://localhost:5000`.

## MongoDB Atlas
Use the connection string Atlas gives you. Replace the password placeholder with the database-user password. If the password contains characters such as `@`, `:`, `/`, `?`, `#`, `%`, or `&`, URL-encode it. Example: `@` becomes `%40`.

Do not commit `.env` to GitHub.
