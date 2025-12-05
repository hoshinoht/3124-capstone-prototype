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

# 🚀 Quick Start Guide (Complete Beginner Friendly!)

This guide will walk you through **every single step** to get this project running on your computer. No programming experience needed!

---

## 📋 What You'll Need to Install

Before we begin, you need to install these programs. Don't worry - we'll guide you through each one!

| Program                       | What it's for                         | Download Link                                              |
| ----------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| **Git**                       | Downloads the project                 | https://git-scm.com/downloads                              |
| **Node.js**                   | Runs the website (frontend)           | https://nodejs.org/                                        |
| **Rust**                      | Runs the server (backend)             | https://rustup.rs/                                         |
| **Visual Studio Build Tools** | Compiles Rust code (Windows only)     | https://visualstudio.microsoft.com/visual-cpp-build-tools/ |
| **SQLite**                    | Database viewer (optional but useful) | https://www.sqlite.org/download.html                       |

> ⚠️ **Windows Users**: You MUST install Visual Studio Build Tools before installing Rust. Without it, Rust won't be able to compile the backend!

---

## 🪟 Step 1: Install Git (Includes Git Bash for Windows)

### For Windows 11 Users:

1. Go to: **https://git-scm.com/downloads**
2. Click **"Download for Windows"**
3. Open the downloaded file (something like `Git-2.x.x-64-bit.exe`)
4. Click **Next** on each screen (keep all the default options)
5. **Important:** When you see "Adjusting your PATH environment", make sure **"Git from the command line and also from 3rd-party software"** is selected
6. Continue clicking **Next** and finally **Install**
7. Click **Finish** when done

> 💡 **What is Git Bash?** Git Bash is a special terminal (command window) that comes with Git. It lets Windows users run the same commands as Mac/Linux users. You'll use Git Bash to run all commands in this guide!

### For Mac Users:

1. Go to: **https://git-scm.com/downloads**
2. Click **"Download for macOS"**
3. Open the downloaded file and follow the installation steps
4. You can use the built-in **Terminal** app (found in Applications → Utilities → Terminal)

---

## 📦 Step 2: Install Node.js

### For Windows 11 and Mac:

1. Go to: **https://nodejs.org/**
2. Click the big green button that says **"LTS"** (this means Long Term Support - the stable version)
3. Open the downloaded file:
   - **Windows**: `node-v20.x.x-x64.msi`
   - **Mac**: `node-v20.x.x.pkg`
4. Click **Next** (or **Continue** on Mac) through all screens
5. Click **Install** and wait for it to finish
6. Click **Finish** (or **Close** on Mac)

### ✅ Verify Installation:

1. Open **Git Bash** (Windows) or **Terminal** (Mac)
   - **Windows**: Press the Windows key, type "Git Bash", and press Enter
   - **Mac**: Press Cmd+Space, type "Terminal", and press Enter
2. Type this command and press Enter:
   ```
   node --version
   ```
3. You should see something like `v20.x.x` ✓

---

## 🔧 Step 2.5: Install Visual Studio Build Tools (Windows Only!)

> ⚠️ **This step is REQUIRED for Windows users before installing Rust!** Mac users can skip to Step 3.

Rust needs special tools from Microsoft to compile code on Windows. Without these, you'll get errors!

### For Windows 11:

1. Go to: **https://visualstudio.microsoft.com/visual-cpp-build-tools/**
2. Click **"Download Build Tools"**
3. Open the downloaded file (`vs_BuildTools.exe`)
4. The Visual Studio Installer will open
5. Check the box for **"Desktop development with C++"**
6. Click **Install** (this may take 10-15 minutes and requires about 6GB of space)
7. When finished, you may need to restart your computer

> 💡 **Why do I need this?** Rust uses these tools to compile (build) the backend server. Without them, `cargo run` will fail with confusing errors!

---

## 🗄️ Step 2.6: Install SQLite (Optional but Recommended)

SQLite is the database used by this project. Installing the command-line tool lets you view and manage the database directly.

### For Windows 11:

1. Go to: **https://www.sqlite.org/download.html**
2. Under "Precompiled Binaries for Windows", download **sqlite-tools-win-x64-xxxxxx.zip**
3. Extract the zip file to a folder (e.g., `C:\sqlite`)
4. Add SQLite to your PATH (so you can use it from Git Bash):
   - Press **Windows Key**, type "Environment Variables", click **"Edit the system environment variables"**
   - Click **"Environment Variables..."** button
   - Under "System variables", find **Path** and click **Edit**
   - Click **New** and add `C:\sqlite` (or wherever you extracted it)
   - Click **OK** on all windows

### For Mac:

SQLite usually comes pre-installed on Mac! To verify:
1. Open **Terminal**
2. Type `sqlite3 --version` and press Enter
3. If you see a version number, you're good! If not, install via Homebrew:
   ```
   brew install sqlite
   ```

### ✅ Verify Installation:

1. Open a **new** Git Bash (Windows) or Terminal (Mac) window
2. Type this command and press Enter:
   ```
   sqlite3 --version
   ```
3. You should see something like `3.x.x` ✓

---

## 🦀 Step 3: Install Rust

### For Windows 11:

1. Go to: **https://rustup.rs/**
2. Click **"Download rustup-init.exe (64-bit)"**
3. Open the downloaded `rustup-init.exe` file
4. A black window will appear with text
5. When asked for options, type `1` and press **Enter** (this chooses the default installation)
6. Wait for installation to complete (this takes about 5-10 minutes)
7. When you see "Rust is installed now", press **Enter** to close the window
8. **⚠️ Important: Close ALL Git Bash windows and reopen Git Bash**

### For Mac:

1. Open **Terminal**
2. Copy and paste this command, then press Enter:
   ```
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
3. When asked, type `1` and press **Enter** for default installation
4. Wait for installation to complete
5. Close Terminal and open a new one

### ✅ Verify Installation:

1. Open a **new** Git Bash (Windows) or Terminal (Mac) window
2. Type this command and press Enter:
   ```
   cargo --version
   ```
3. You should see something like `cargo 1.x.x` ✓

---

## 📥 Step 4: Download the Project

1. Open **Git Bash** (Windows) or **Terminal** (Mac)

2. Navigate to where you want to save the project. For your Desktop:
   ```
   cd ~/Desktop
   ```

3. Download the project:
   ```
   git clone https://github.com/hoshinoht/3124-capstone-prototype.git
   ```
   
4. Go into the project folder:
   ```
   cd 3124-capstone-prototype
   ```

---

## 🎯 Step 5: Start the Application (The Easy Way!)

We've created a special script called `start.sh` that does everything for you automatically!

### For Windows 11 (using Git Bash):

1. Make sure you're in the project folder in **Git Bash**
2. Type this command and press Enter:
   ```
   bash start.sh
   ```

### For Mac:

1. Make sure you're in the project folder in **Terminal**
2. First, make the script executable (only need to do this once):
   ```
   chmod +x start.sh
   ```
3. Then run it:
   ```
   ./start.sh
   ```

### 🕐 What happens next:

1. **First time only**: The script will download and compile everything. This takes **10-20 minutes**. Be patient! ☕
2. You'll see lots of text scrolling by - this is normal!
3. When everything is ready, you'll see:
   ```
   ========================================
     All services started successfully!
   ========================================
   
     Backend:  http://localhost:8080
     Frontend: http://localhost:3000
   ```

---

## 🌐 Step 6: Open the Application

1. Open your web browser (Chrome, Edge, Firefox, Safari, etc.)
2. Type this address in the address bar:
   ```
   http://localhost:3000
   ```
3. Press **Enter**
4. You should see the login page! 🎉

---

## 🔐 Login Information

Use these credentials to log in:

| Role          | Email             | Password    |
| ------------- | ----------------- | ----------- |
| **Admin**     | admin@company.com | admin123    |
| **Demo User** | Any demo user     | password123 |

Or click **Register** to create your own account!

---

## 🛑 How to Stop the Application

When you're done using the application:

1. Go back to your **Git Bash** or **Terminal** window
2. Press **Ctrl + C** on your keyboard
3. The script will automatically stop everything and show:
   ```
   All services stopped
   ```

---

## 🔄 Starting the Application Again

After the first setup, starting is much faster! Just:

1. Open **Git Bash** (Windows) or **Terminal** (Mac)
2. Navigate to the project folder:
   ```
   cd ~/Desktop/3124-capstone-prototype
   ```
3. Run the start script:
   - **Windows**: `bash start.sh`
   - **Mac**: `./start.sh`
4. Open http://localhost:3000 in your browser

---

## 🔧 Other Useful Commands

The `start.sh` script has several commands:

| Command                  | What it does                          |
| ------------------------ | ------------------------------------- |
| `bash start.sh`          | Start everything (backend + frontend) |
| `bash start.sh stop`     | Stop all running services             |
| `bash start.sh restart`  | Restart everything                    |
| `bash start.sh backend`  | Start only the backend server         |
| `bash start.sh frontend` | Start only the frontend website       |
| `bash start.sh help`     | Show all available commands           |

---

## ❓ Troubleshooting

### "node is not recognized" or "npm is not recognized"
- **Solution**: Close Git Bash/Terminal completely and reopen it
- If that doesn't work, restart your computer and try again

### "cargo is not recognized"
- **Solution**: Close Git Bash/Terminal completely and reopen it
- If that doesn't work, restart your computer and try again

### "error: linker `link.exe` not found" or "MSVC not found" (Windows)
- **Solution**: You need to install Visual Studio Build Tools (Step 2.5)
- Make sure you selected **"Desktop development with C++"** during installation
- Restart your computer after installing, then try again

### "Permission denied" when running start.sh (Mac only)
- **Solution**: Run `chmod +x start.sh` first, then try again

### The script says "Missing required tools"
- **Solution**: Make sure you installed Node.js and Rust (Steps 2 and 3)
- Close and reopen Git Bash/Terminal, then try again

### "Address already in use" or "Port is already in use"
- **Solution**: The script should handle this automatically
- If not, try running: `bash start.sh stop` then `bash start.sh` again

### The page shows "Cannot connect to server" or is blank
- **Solution**: Make sure the script is still running (don't close Git Bash/Terminal!)
- Wait a few more minutes - the first startup takes time
- Try refreshing the page (press F5 or Ctrl+R)

### First startup is taking forever
- **This is normal!** The first time takes 10-20 minutes
- The script is downloading and compiling all the code
- Subsequent startups will be much faster (1-2 minutes)

### Nothing works - I'm stuck!
1. Close all Git Bash/Terminal windows
2. Restart your computer
3. Open Git Bash/Terminal
4. Navigate to the project: `cd ~/Desktop/3124-capstone-prototype`
5. Try again: `bash start.sh`

---

## 🎯 Application Features

Once you're logged in, you can explore:

### 📊 Dashboard
- Overview of projects, team members, tasks, and meetings
- Quick access to important information

### ✅ Task Management
- Create tasks with deadlines and urgency levels
- Calendar view with colored dots showing task urgency
- Create meetings and equipment bookings

### 📁 Projects
- Create and manage projects
- Add team members to projects
- Associate tasks with projects

### 👥 Personnel
- View team member status (checked in/out)
- Track who is available

### 🔧 Equipment Booking
- Book shared equipment
- Prevent scheduling conflicts

### 📖 Glossary
- Searchable database of HVAC and BMS terms
- Add new terms and definitions

### 🔔 Notifications
- Get alerts for upcoming deadlines
- Meeting reminders

---

## 📁 Project Structure (For Reference)

```
3124-capstone-prototype/
├── start.sh                 # ⭐ The startup script - run this!
├── backend/                 # Rust backend server
│   ├── src/                 # Source code
│   ├── Cargo.toml           # Rust dependencies
│   ├── schema.sql           # Database structure
│   └── database.sqlite      # Database file (created automatically)
├── frontend/                # React frontend
│   ├── src/                 # Source code
│   │   ├── components/      # UI components
│   │   ├── services/        # API communication
│   │   └── context/         # App state management
│   └── package.json         # Node.js dependencies
├── Docs/                    # Documentation
└── README.md                # This file
```

---

## 📞 Need More Help?

If you're still stuck:

1. Make sure Git Bash (Windows) or Terminal (Mac) is still open with the script running
2. Try stopping everything with `Ctrl+C`, then start again with `bash start.sh`
3. Restart your computer and try the steps again from Step 5

---

## 📄 License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**Project Type**: System Performance, Intelligence and Sustainability in Buildings (Workflow Process Optimization)

**Date**: December 2025
