# Youtube Audio Clipper

A web application for downloading audio from YouTube (and other URLs), clipping segments, looping them, and exporting as WAV files. All clip editing happens client-side in the browser.

## Features

- Download audio from YouTube and other URLs via yt-dlp
- Visual waveform display with start/end markers
- Real-time audio preview and playback
- Clip and loop audio segments
- Export edited clips as WAV files

---

## Project Structure

```text
Youtube Audio Clipper/
├── youtube_audio_clipper/     # Main application directory
│   ├── app/
│   │   ├── main.py            # Flask backend (API routes)
│   │   ├── templates/
│   │   │   ├── index.html     # Main UI
│   │   │   └── admin.html     # Cookie management page
│   │   └── static/
│   │       ├── script.js      # Client-side audio processing
│   │       └── style.css
│   ├── downloads/             # Downloaded audio files (auto-created)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   └── fly.toml               # Fly.io deployment config
└── README.md
```

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose

### 1. Clone the repo

```bash
git clone https://github.com/DaanyaalSobani/Youtube-Audio-Clipper.git
cd "Youtube Audio Clipper"
```

### 2. Build and run with Docker Compose

```bash
cd youtube_audio_clipper
docker-compose up --build
```

The app will be available at <http://localhost:8080>

To run in the background:

```bash
docker-compose up --build -d
```

To stop:

```bash
docker-compose down
```

---

### Running Without Docker

If you prefer to run the app directly:

**Prerequisites:** Python 3.9+, FFmpeg installed and on your PATH

```bash
cd youtube_audio_clipper
pip install -r requirements.txt
python app/main.py
```

The app will be available at <http://localhost:8080>

---

## API Endpoints

All endpoints are served by the Flask backend on port **8080**.

### `GET /`

Returns the main web UI.

---

### `POST /download`

Downloads audio from a URL and converts it to MP3.

**Request body (JSON):**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | Yes | URL of the audio/video to download |
| `username` | string | No | YouTube account username (if not using cookies) |
| `password` | string | No | YouTube account password (if not using cookies) |

**Success response:**

```json
{ "filename": "audio_title.mp3" }
```

**Error response:**

```json
{ "error": "Error message" }
```

---

### `GET /download/<filename>`

Returns a downloaded audio file for in-browser playback or saving.

**URL parameter:** `filename` — the filename returned by `POST /download`

---

### `GET /update-cookies`

Returns the cookie management form (admin page).

### `POST /update-cookies`

Uploads a new YouTube cookies file to replace the existing one.

**Request:** multipart form with a `cookies` file field.

---

## Usage

1. Open <http://localhost:8080> in your browser
2. Paste a YouTube (or other supported) URL into the input field and click **Download**
3. Use the waveform and audio player to find your clip start and end points
4. Click **Set Current** next to Start/End to capture the current playhead position, or type times manually
5. Set a loop count if you want the clip repeated
6. Click **Preview** to hear the clip, or **Download** to export it as a WAV file

---

## Deployment (Fly.io)

The app is configured for deployment to [Fly.io](https://fly.io).

```bash
cd youtube_audio_clipper
flyctl deploy --remote-only
```

Deployments are also triggered automatically on push to `main` via GitHub Actions (requires `FLY_API_TOKEN` set as a repository secret).

---

## Maintenance

### Updating YouTube Cookies

YouTube downloads require valid cookies to work. These expire over time and need to be refreshed:

1. Install the [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) Chrome extension
2. Log in to YouTube in your browser
3. Export the cookies using the extension (Netscape format)
4. Upload the file via the `/update-cookies` admin page, or replace `youtube_audio_clipper/youtube.cookies` manually
5. Restart the container or redeploy

> The `youtube.cookies` file is listed in `.gitignore` and will not be committed to the repo.

### Clearing Downloads

Downloaded files accumulate in `youtube_audio_clipper/downloads/`. To clear them:

```bash
rm youtube_audio_clipper/downloads/*
```
