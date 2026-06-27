# U&I Volunteer Icebreaker Game

A mobile-first web app for live icebreaker sessions with ~70 volunteers. Volunteers log in with name and centre, complete a 3×3 letter grid by finding other volunteers, and receive team color assignments from the moderator.

## Features

- **Volunteer flow**: Login → Lobby → Game → Completion → Team reveal
- **Moderator dashboard**: Volunteer management, game controls, live progress, system health, export
- **Real-time updates**: Socket.IO for event state, progress, and team reveals
- **Persistent storage**: JSON file storage (no native dependencies)
- **Trial seed data**: 5 pre-loaded volunteers for testing

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO, JSON file storage

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm

### Install & Run (Development)

```bash
# Install all dependencies
npm run install:all

# Start both server and client (with hot reload)
npm run dev
```

- Volunteer app: http://localhost:5173
- API server: http://localhost:3001

### Production

```bash
npm run start
```

Serves the built frontend from the Express server on http://localhost:3001

## Admin Access

- **URL**: `/admin`
- **Password**: `admin123`

## Trial Volunteers

| Name     | Centre | Code |
| -------- | ------ | ---- |
| Adithyan | KP     | 111  |
| Dilshan  | VB     | 200  |
| Kalyani  | PB     | 400  |
| Sreyaa   | STC    | 100  |
| Aqsa     | EJ     | 300  |

## Event Flow

1. **Setup**: Add volunteers, generate boards, run pre-event validation
2. **Start Event**: Volunteers move from lobby to game (management locks)
3. **Play**: Volunteers fill 3×3 grid by finding others
4. **Reveal Teams**: Moderator assigns and reveals colors
5. **Export**: Download results as CSV or JSON

## Centres

Only these centres are allowed: **KP**, **VB**, **PB**, **EJ**, **STC**

## Project Structure

```
ugame/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── pages/       # Landing, login, game flow, admin
│       ├── components/  # Game board, modals, lobby
│       └── hooks/       # Socket.IO hook
├── server/          # Express backend
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── data/            # JSON data store (auto-created)
└── package.json     # Root scripts
```

## API Overview

| Endpoint | Description |
| -------- | ----------- |
| `POST /api/volunteer/login` | Volunteer login |
| `GET /api/volunteer/:id` | Get volunteer state |
| `POST /api/volunteer/:id/cell` | Submit cell entry |
| `GET /api/admin/volunteers` | List volunteers (admin) |
| `POST /api/admin/start-event` | Start the game |
| `GET /api/admin/health` | Pre-event validation |

## Notes

- Boards are generated once and persist across refresh/re-login
- Volunteer management locks after event starts
- For full 9-cell boards with diverse letters, add volunteers with varied name initials
- With 5 trial volunteers, boards use repeating letters (still fully functional)

## License

Private — U&I Volunteer Event 2026
