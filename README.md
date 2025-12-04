# Centralized Collaboration Dashboard - IT-Engineering Coordination Platform

## Project Overview

A full-stack web application designed for IT-Engineering coordination with features including:

- **Centralized Dashboard**: Single interface for both IT and Engineering teams
- **Calendar & Equipment Booking**: Shared calendar with equipment booking to prevent conflicts
- **Task Management**: Task upload with urgency tagging and automated "Must Do" highlighting
- **Personnel Coordination**: Check-in/check-out system with real-time status visibility
- **Quick Links**: Dedicated panel for recurring meeting links and important resources
- **Shared Glossary**: Searchable HVAC and BMS terminology database with user contributions
- **Projects**: Project management with team members and task organization

## Technology Stack

### Backend
- **Language**: Rust
- **Web Framework**: Actix Web 4.4
- **Database**: SQLite with SQLX
- **Authentication**: JWT (JSON Web Tokens)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components

---

# 🚀 Quick Start Guide for Windows 11 (Complete Beginner)

This guide will walk you through every step to get this project running on your Windows 11 computer. No prior programming experience required!

## Step 1: Install Required Software

### 1.1 Install Node.js (for the Frontend)

1. Open your web browser and go to: https://nodejs.org/
2. Click the big green button that says **"LTS"** (Long Term Support) - this downloads the installer
3. Open the downloaded file (it will be called something like `node-v20.x.x-x64.msi`)
4. Click **Next** through all the screens, keeping all default options
5. Click **Install** and wait for it to finish
6. Click **Finish**

**To verify it worked:**
1. Press `Windows Key + R` on your keyboard
2. Type `cmd` and press Enter (this opens Command Prompt)
3. Type `node --version` and press Enter
4. You should see a version number like `v20.x.x`

### 1.2 Install Rust (for the Backend)

1. Open your web browser and go to: https://rustup.rs/
2. Click **"Download rustup-init.exe (64-bit)"**
3. Open the downloaded `rustup-init.exe` file
4. A black terminal window will appear
5. When it asks for installation options, just press `1` and then `Enter` to use defaults
6. Wait for the installation to complete (this may take 5-10 minutes)
7. When it says "Rust is installed now", press Enter to close

**To verify it worked:**
1. **Close any open Command Prompt windows**
2. Press `Windows Key + R`, type `cmd`, and press Enter (open a NEW Command Prompt)
3. Type `cargo --version` and press Enter
4. You should see a version number like `cargo 1.x.x`

### 1.3 Install Git (to download the project)

1. Go to: https://git-scm.com/download/win
2. The download should start automatically. If not, click "Click here to download manually"
3. Open the downloaded installer
4. Click **Next** through all screens, keeping all default options
5. Click **Install** and wait for it to finish
6. Click **Finish**

---

## Step 2: Download the Project

1. Press `Windows Key + R`, type `cmd`, and press Enter
2. Navigate to where you want to save the project. For example, to save it on your Desktop:
   ```
   cd Desktop
   ```
3. Download the project by typing:
   ```
   git clone https://github.com/hoshinoht/3124-capstone-prototype.git
   ```
4. Enter the project folder:
   ```
   cd 3124-capstone-prototype
   ```

---

## Step 3: Start the Backend Server

1. In the same Command Prompt window, go to the backend folder:
   ```
   cd backend
   ```

2. Build and start the backend server:
   ```
   cargo run
   ```

3. **The first time you run this, it will take 5-15 minutes** to download and compile everything. This is normal! You'll see lots of text scrolling by.

4. When it's ready, you'll see a message like:
   ```
   Starting server at http://127.0.0.1:8080
   ```

5. **Keep this window open!** The backend needs to stay running.

---

## Step 4: Start the Frontend (in a NEW window)

1. **Open a NEW Command Prompt window** (Press `Windows Key + R`, type `cmd`, press Enter)

2. Navigate to the project's frontend folder:
   ```
   cd Desktop\3124-capstone-prototype\frontend
   ```
   (Adjust the path if you saved the project somewhere else)

3. Install the frontend dependencies:
   ```
   npm install
   ```
   This will take 2-5 minutes the first time.

4. Start the frontend:
   ```
   npm run dev
   ```

5. You'll see a message like:
   ```
   VITE v5.x.x  ready in xxx ms

   ➜  Local:   http://localhost:3000/
   ```

---

## Step 5: Open the Application

1. Open your web browser (Chrome, Edge, Firefox, etc.)
2. Go to: **http://localhost:3000**
3. You should see the login page!

---

## 🔐 Getting Started

Register a new account on the login page to get started, or contact your administrator for login credentials.

---

## 🛑 How to Stop the Application

1. In the **Frontend** Command Prompt window: Press `Ctrl + C`
2. In the **Backend** Command Prompt window: Press `Ctrl + C`

---

## 🔄 How to Start the Application Again (After First Setup)

Once you've done the initial setup, starting the application is much faster:

### Start Backend:
1. Open Command Prompt
2. Type:
   ```
   cd Desktop\3124-capstone-prototype\backend
   cargo run
   ```

### Start Frontend (in a NEW Command Prompt):
1. Open another Command Prompt
2. Type:
   ```
   cd Desktop\3124-capstone-prototype\frontend
   npm run dev
   ```

### Open in Browser:
Go to **http://localhost:3000**

---

## ❓ Troubleshooting Common Issues

### "node is not recognized as a command"
- Close ALL Command Prompt windows
- Restart your computer
- Try again

### "cargo is not recognized as a command"
- Close ALL Command Prompt windows
- Restart your computer
- Try again

### "npm install" shows errors
- Make sure you're in the `frontend` folder
- Try running: `npm cache clean --force` then `npm install` again

### "cargo run" fails with database errors
- Make sure you're in the `backend` folder
- The database file (`database.db`) should be created automatically

### Backend says "Address already in use"
- Another program is using port 8080
- Close other applications or restart your computer

### Frontend says "Port 3000 is already in use"
- Press `y` and Enter when asked if you want to use a different port
- Or close other applications using that port

### The page shows "Cannot connect to server"
- Make sure the backend is running (Step 3)
- Check that you see "Starting server at http://127.0.0.1:8080" in the backend window

---

## 📁 Project Structure (For Reference)

```
3124-capstone-prototype/
├── backend/                 # Rust backend server
│   ├── src/                # Source code
│   ├── Cargo.toml          # Rust dependencies
│   └── database.db         # SQLite database (created automatically)
├── frontend/               # React frontend
│   ├── src/               # Source code
│   │   ├── components/    # UI components
│   │   ├── services/      # API communication
│   │   └── context/       # App state management
│   └── package.json       # Node.js dependencies
├── Docs/                   # Documentation
└── README.md              # This file
```

---

## 🎯 Application Features

### Dashboard
- Overview of projects, team members, tasks, and meetings
- Quick access to important information

### Task Management
- Create tasks with deadlines and urgency levels
- Calendar view with colored dots showing task urgency
- Create meetings and equipment bookings

### Projects
- Create and manage projects
- Add team members to projects
- Associate tasks with projects

### Personnel
- View team member status (checked in/out)
- Track who is available

### Equipment Booking
- Book shared equipment
- Prevent scheduling conflicts

### Glossary
- Searchable database of HVAC and BMS terms
- Add new terms and definitions

### Notifications
- Get alerts for upcoming deadlines
- Meeting reminders

---

## 📞 Need Help?

If you encounter any issues not covered in this guide:
1. Make sure both Command Prompt windows are still open and running
2. Try restarting both the backend and frontend
3. As a last resort, restart your computer and try again

---

**Project Type**: System Performance, Intelligence and Sustainability in Buildings (Workflow Process Optimization)

**Date**: December 2025
