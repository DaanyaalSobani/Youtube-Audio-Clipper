# Audio Clipper Web App

A simple web application for downloading audio from URLs, creating clips, and looping them.

## Features
- Download audio from URLs using yt-dlp
- Visual waveform display
- Real-time audio preview
- Clip and loop audio segments
- Client-side audio processing
- Download edited clips as WAV files

## Setup
1. Make sure you have Docker installed
2. Run `docker-compose up --build`
3. Access the app at http://localhost:5000

## Usage
1. Enter an audio URL and click Download
2. Use the waveform display and audio player to find your clip points
3. Set start and end times (or use "Set Current" buttons)

## Maintenance

### YouTube Cookies
The application uses YouTube cookies for authentication. These need to be updated periodically:

1. Install the "Get cookies.txt" Chrome extension
2. Go to YouTube and ensure you're logged in
3. Export cookies using the extension
4. Replace `youtube.cookies` in the project
5. Redeploy with `fly deploy`

Last cookie update: [Date]
