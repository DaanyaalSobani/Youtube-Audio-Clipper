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
    username = request.form.get('username')
    password = request.form.get('password')
    
    try:
        def progress_hook(d):
            if d['status'] == 'downloading':
                print(f"Downloading: {d.get('_percent_str', '0%')}")
            elif d['status'] == 'finished':
                print("Download completed")

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s'),
            'cookiefile': 'youtube.cookies',
            'overwrites': True,
            'progress_hooks': [progress_hook],
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
            }],
        }
        
        # Only add credentials if both username and password are provided
        if username and password:
            ydl_opts.update({
                'username': username,
                'password': password,
            })
        print(f"Using credentials: {username} {password}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info).rsplit('.', 1)[0] + '.mp3'
            
        return jsonify({'filename': os.path.basename(filename)})
    except Exception as e:
        print(f"Download error: {str(e)}")  # Add error logging
        return jsonify({'error': str(e)}), 400

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

@app.route('/update-cookies', methods=['GET', 'POST'])
def update_cookies():
    if request.method == 'GET':
        return f'''
            <form method="post" enctype="multipart/form-data">
                <h2>Update YouTube Cookies</h2>
                <p>Current working directory: {os.getcwd()}</p>
                <p>Cookie file exists: {os.path.exists('youtube.cookies')}</p>
                <input type="file" name="cookies" accept=".txt">
                <button type="submit">Upload</button>
            </form>
        '''
        
    if request.method == 'POST':
        if 'cookies' not in request.files:
            return 'No file uploaded'
            
        file = request.files['cookies']
        if file.filename == '':
            return 'No file selected'
            
        try:
            file.save('youtube.cookies')
            return 'Cookies updated successfully! You can close this page.'
        except Exception as e:
            return f'Failed to update cookies: {str(e)}'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
