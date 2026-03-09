<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## Features

- **Secure Code Execution**: Uses VM2 sandboxed environment for safe code testing
- **Function-Based Coding Questions**: Test algorithmic thinking with factorial and prime number functions
- **Real-time Code Evaluation**: Instant feedback on code correctness against multiple test cases
- **Data Persistence**: SQLite database with WAL mode for reliable data storage
- **Backup System**: Easy database backup and restore functionality

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Data Persistence

This application uses SQLite database (`database.db`) to store all data including:
- User accounts (students and admin)
- Test questions and configurations
- Test results and scores
- Group formations

### Important Notes:
- **Data is persistent** across server restarts and logouts
- The database file `database.db` contains all your application data
- **Do not delete** the `database.db` file unless you want to reset all data
- Use `npm run backup-db` to create a backup of your database

### Coding Questions:
- **Factorial Function**: Implement n! calculation
- **Prime Number Checker**: Determine if a number is prime

### Scoring System:
- **MCQs**: 10 questions × 2 points = 20 points max
- **Coding**: 2 functions × 2 points = 4 points max (2 points for all 3 tests pass, 1 point for 2+ tests pass)
- **Total**: 24 points maximum

### Resetting Data:
If you need to reset the database (⚠️ **This will delete all data**):
1. Stop the server (Ctrl+C)
2. Delete the `database.db` file
3. Restart the server with `npm run dev`
