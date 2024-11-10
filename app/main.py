from flask import Flask, request, render_template, send_file, jsonify
import yt_dlp
import os
import logging

app = Flask(__name__)
DOWNLOAD_DIR = '/downloads'
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/download', methods=['POST'])
def download_audio():
    url = request.form['url']
    logger.info(f"Attempting to download: {url}")
    
    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s'),
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.youtube.com/',
            },
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
            }],
            'verbose': True,
            'no_check_certificate': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info("Starting download with yt-dlp")
            info = ydl.extract_info(url, download=True)
            
            if info is None:
                logger.error("Download failed - info is None")
                return jsonify({'error': 'Failed to download video'}), 400
                
            logger.info(f"Download info: {info}")
            filename = ydl.prepare_filename(info).rsplit('.', 1)[0] + '.mp3'
            
            if not os.path.exists(os.path.join(DOWNLOAD_DIR, os.path.basename(filename))):
                logger.error(f"File not found after download: {filename}")
                return jsonify({'error': 'File not found after download'}), 400
                
            logger.info(f"Successfully downloaded: {filename}")
            return jsonify({'filename': os.path.basename(filename)})
            
    except Exception as e:
        logger.exception("Download failed with exception")
        return jsonify({'error': f"Download failed: {str(e)}"}), 400

@app.route('/download/<filename>')
def download_file(filename):
    try:
        file_path = os.path.join(DOWNLOAD_DIR, filename)
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return jsonify({'error': 'File not found'}), 404
            
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        logger.exception("File download failed")
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
