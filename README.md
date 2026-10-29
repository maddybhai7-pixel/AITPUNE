# OneStop AIT | Army Institute of Technology Pune

A full-stack campus platform for the **Army Institute of Technology (AIT), Dighi Hills, Pune**. Built with high-performance native Node.js, an embedded live SQLite database, real-time web scrapers syncing from `aitpune.com`, and a mobile/desktop web interface.

---

## Key Features

### 1. Live SQLite Database (`ait_onestop.db`)
- **High Concurrency WAL Mode**: Zero-external-dependency synchronous database powered by Node.js built-in `node:sqlite`.
- Stores:
  - `notices`: 550+ authentic circulars scraped from the official AIT portal with categorization (Academic, Exams, Hostel, T&P, Welfare).
  - `transit_pools`: Active cadet carpools with seat allocation tracking and rider lists.
  - `mess_menu` & `mess_ratings`: Daily nutritional menus for Thapa & Kanika Mess with verified cadet ratings.
  - `chat_logs`: Historic queries and intelligence logs.

### 2. Real-Time AIT Circular Scraper (`scraper.js`)
- Directly scrapes `https://www.aitpune.com/Notices-and-Circulars.aspx`.
- Normalizes titles, publication months/years, categories, and direct PDF download links.
- Interactive **"⚡ Sync with AIT Portal"** button on the frontend for 1-click live updates.
- Offline cache ensures instant page load even if institutional servers are down.

### 3. Interactive Transit Pooling Hub
- Ride-sharing board for cadets traveling between **AIT Main Gate**, **Pune Railway Station**, **Pune Airport (PNQ)**, **Shivaji Nagar**, and **Phoenix Marketcity**.
- **+ Post a Ride**: Cadets can publish planned rides with departure times and seats.
- **1-Click Join**: Decrements available seats and registers riders in real time.

### 4. Dining & Mess Operations
- Dual Mess switchers:
  - **Thapa Mess**: 1st & 4th Year Cadets
  - **Kanika Mess**: 2nd & 3rd Year Cadets
- Full meal breakdowns for Breakfast, Lunch, Evening Snacks, and Dinner with dietary badges (High-Protein, Balanced, Special).
- Interactive **Cadet Meal Review & Star Rating** widget.

### 5. AIT-GPT Campus Intelligence Assistant
- Powered by the live database across circulars, mess menus, ride shares, and campus rulebooks.
- Quick inquiry chips for instant access to gate timings, dinner menus, railway concessions, and exam circulars.

### 6. Campus Directory & SOS Emergency Modal
- Quick-dial access for MI Room (Medical Inspection Room Ext 212), Security Desk, and Hostel Wardens.

---

## Quick Start

### Start Local Server
```bash
npm start
# or: node server.js
```

The application will be live at:
**[http://localhost:5000](http://localhost:5000)**

---

## REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/notices` | `GET` | Fetch circulars (supports `?search=...` and `?category=...`) |
| `/api/notices/sync` | `POST` | Trigger real-time web scraper against `aitpune.com` |
| `/api/pools` | `GET` | List all active transit carpools |
| `/api/pools` | `POST` | Create a new cadet carpool |
| `/api/pools/join` | `POST` | Join an existing carpool |
| `/api/mess` | `GET` | Get dining menus & reviews (`?name=Thapa Mess` or `Kanika Mess`) |
| `/api/mess/rate` | `POST` | Submit star rating and feedback for today's meal |
| `/api/query` | `POST` | Query AIT-GPT campus intelligence database |
