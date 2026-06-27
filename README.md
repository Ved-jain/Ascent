# Ascent

Ascent is an AI-powered competitive programming platform designed specifically for Codeforces users. It helps competitive programmers analyze their performance, discover optimal problems to solve, track their skills, and prepare for upcoming contests—all in one unified, sleek dashboard.

## Features

- **Comprehensive Profile Analytics**: Connect your Codeforces handle to track ratings, submission history, and performance metrics.
- **AI-Powered Recommendations**: Utilizes Groq and Google Generative AI to suggest tailored problems and guide you through complex algorithmic topics.
- **Skill Tree & Upsolving**: Visualize your mastery across different algorithmic domains (Graphs, DP, Math, etc.) and effectively manage problems you need to upsolve from past contests.
- **Peer Comparison**: Compare your performance, speed, and topic mastery head-to-head with friends and rivals.
- **Contest Hub**: Stay updated with upcoming contests and track your prep progress.

## Tech Stack

- **Frontend**: React (Vite), React Router, Recharts, Chart.js
- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Caching**: Redis (Upstash)
- **AI Integrations**: Groq SDK, Google Generative AI
- **Authentication**: JWT & bcrypt

## Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd Ascent
```

### 2. Backend Setup
Navigate to the `server` directory and install dependencies:
```bash
cd server
npm install
```
Copy the `.env.example` file to create your own `.env`:
```bash
cp .env.example .env
```
Fill out the required variables in `.env` (MongoDB URI, Redis URL, JWT Secret, Groq/Gemini API keys, etc.).

Start the server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal window, navigate to the `client` directory, and install dependencies:
```bash
cd client
npm install
```
Start the Vite development server:
```bash
npm run dev
```
The application will launch on `http://localhost:5173`.

## Environment Variables

Make sure to configure the `server/.env` file properly for all features to work (especially AI recommendations and database connections). See `server/.env.example` for details.
