# Momentum — Dynamic Task Manager & Productivity Tracker

A responsive task management web app built with HTML, CSS and vanilla JavaScript. It supports task CRUD operations and stores tasks in browser `localStorage`, so they persist after a page reload.

## Features
- Create tasks with a title, category and optional due date.
- Read, edit and delete existing tasks.
- Mark tasks as completed or active.
- Categories: Work, Personal and Study.
- Filter by All, Active and Completed status or by category.
- Search tasks by title.
- Sort tasks by newest, due date or title.
- Drag and drop tasks to reorder them.
- Summary cards for total tasks, active tasks, completed tasks and completion rate.
- Due-date indicators for overdue tasks and tasks due today.
- Light/dark theme toggle.
- Responsive layout for desktop, tablet and mobile.
- Automatic persistence through `localStorage`; no server or database is required.

## Project structure
```text
dynamic_task_manager_productivity_tracker/
├── index.html
├── README.md
├── css/
│   └── styles.css
└── js/
    └── app.js
```

## Run locally
1. Extract the project ZIP.
2. Open the folder in Visual Studio Code.
3. Open `index.html` in your browser, or use the Live Server extension.
4. Add tasks and refresh the page to confirm that they remain saved.

## Data storage and privacy
Tasks are saved in the current browser using the key `momentum-task-manager-v1`. Data is local to that browser and device; it is not sent to a server. Clearing the browser's site data may remove saved tasks.

## Technologies
- HTML5
- CSS3 (Grid, Flexbox, transitions and responsive media queries)
- JavaScript ES6+
- DOM manipulation
- Browser `localStorage` API
