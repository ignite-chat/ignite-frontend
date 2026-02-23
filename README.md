# Ignite

A Discord-inspired chat platform built with React, featuring real-time messaging, guild management, role-based permissions.

## Features

- **Guilds (Servers)** — Create and manage servers with custom icons, organized channels, and invite links
- **Real-time Messaging** — Instant message delivery via WebSockets, with editing, deleting, and markdown support
- **Channels** — Text channels, categories, and DM channels with drag-and-drop sorting
- **Role & Permissions** — Granular permission system with role hierarchy, color-coded members, and per-role access control
- **Friends System** — Send/accept friend requests, manage your friends list, and start direct message conversations
- **Mentions & Unreads** — `@user` mention support with inline suggestions, per-channel unread tracking, and badge indicators
- **Invite System** — Generate invite links with preview pages and quick sign-up for new users
- **Dark Theme** — Dark UI inspired by modern chat platforms

## Tech Stack

| Layer             | Technology                                   |
| ----------------- | -------------------------------------------- |
| Framework         | React 18 + TypeScript                        |
| Build Tool        | Vite 5                                       |
| State Management  | Zustand                                      |
| Styling           | Tailwind CSS + Radix UI + shadcn/ui          |
| HTTP Client       | Axios                                        |
| Forms             | React Hook Form                              |
| Rich Text         | Lexical                                      |
| Drag & Drop       | dnd-kit                                      |
| Routing           | React Router v6                              |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A running Ignite API backend

### Installation

```bash
git clone <repository-url>
cd ignite-frontend
npm install
```

### Environment

Copy the `.env.example` file to `.env`:

### Development

```bash
# Web
npm run dev

# Desktop (Electron)
cd electron-src && npm run start
```

### Build

```bash
# Web build
npm run build

# Electron build
cd electron-src && npm run make
```

## License

All rights reserved.
