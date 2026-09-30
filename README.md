# ApplyFlow

A full-stack job application tracker built with Node.js, SQLite, HTML, CSS, and vanilla JavaScript.

## Requirements

- Node.js 22.5 or newer

## Run locally

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). Press `Ctrl+C` to stop the server.

## Features

- Add, edit, delete, search, and filter job applications
- Track Applied, Screening, Interview, Offer, and Rejected stages
- Persist data in SQLite
- Validate all writes on the server
- Import applications from CSV
- Capture a job posting from the current Chrome tab
- View pipeline statistics in a responsive interface

## CSV import

Use the **Import CSV** button. The header must contain:

```csv
company,role,stage,appliedDate,jobLink,notes
```

Valid stage values are `Applied`, `Screening`, `Interview`, `Offer`, and `Rejected`. Dates use `YYYY-MM-DD`.

## Chrome capture extension

1. Start ApplyFlow with `npm start`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the `browser-extension` folder.
5. Open a job posting and click **ApplyFlow Job Capture**.
6. Review the detected company and role, then click **Save application**.

Job sites use different page structures, so the detected fields remain editable before saving.

## REST API

- `GET /api/applications`
- `POST /api/applications`
- `PUT /api/applications/:id`
- `DELETE /api/applications/:id`
- `POST /api/applications/import`
- `POST /api/applications/reset`

## Tests

```bash
npm test
```
