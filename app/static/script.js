let audioContext;
let audioBuffer;
let sourceNode;
let startTime = 0;
let endTime = 0;
let isPlaying = false;

async function downloadAudio() {
    const url = document.getElementById('url-input').value;
    const formData = new FormData();
    formData.append('url', url);

    try {
        const response = await fetch('/download', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.error) {
            alert('Error: ' + data.error);
            return;
        }
        
        const audioPlayer = document.getElementById('audio-player');
        audioPlayer.src = `/download/${data.filename}`;
        document.getElementById('editor-section').style.display = 'block';
        
        // Initialize Web Audio API
        await initAudio(audioPlayer);
    } catch (error) {
        alert('Error downloading audio: ' + error);
    }
}

async function initAudio(audioElement) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const response = await fetch(audioElement.src);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Set initial end time to full duration
    endTime = audioBuffer.duration;
    document.getElementById('end-time').value = endTime;
    document.getElementById('duration').textContent = formatTime(endTime);
    
    // Draw waveform
    drawWaveform();
    
    // Update current time display
    audioElement.addEventListener('timeupdate', () => {
        document.getElementById('current-time').textContent = 
            formatTime(audioElement.currentTime);
    });
    
    // Add input event listeners
    document.getElementById('start-time').addEventListener('input', (e) => {
        updateStartTime(e.target.value);
    });
    
    document.getElementById('end-time').addEventListener('input', (e) => {
        updateEndTime(e.target.value);
    });
    
    // Make canvas responsive
    window.addEventListener('resize', drawWaveform);
}

function drawWaveform() {
    const canvas = document.getElementById('waveform');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match display size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    
    // Draw full waveform
    ctx.beginPath();
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 1;
    
    for(let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        
        for(let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        
        ctx.moveTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();
    
    // Draw start and end markers
    const startX = (startTime / audioBuffer.duration) * width;
    const endX = (endTime / audioBuffer.duration) * width;
    
    // Draw start marker
    ctx.beginPath();
    ctx.strokeStyle = '#FF4444';
    ctx.lineWidth = 2;
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.stroke();
    
    // Draw end marker
    ctx.beginPath();
    ctx.strokeStyle = '#FF4444';
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();
    
    // Highlight selected region
    ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
    ctx.fillRect(startX, 0, endX - startX, height);
}

function previewClip() {
    if (isPlaying) {
        stopPreview();
        return;
    }
    
    const loops = parseInt(document.getElementById('loops').value);
    startTime = parseFloat(document.getElementById('start-time').value);
    endTime = parseFloat(document.getElementById('end-time').value);
    
    isPlaying = true;
    playLoop(loops);
}

function playLoop(remainingLoops) {
    if (remainingLoops <= 0 || !isPlaying) {
        isPlaying = false;
        return;
    }
    
    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);
    
    const duration = endTime - startTime;
    
    if (startTime < 0 || endTime > audioBuffer.duration || startTime >= endTime) {
        alert('Invalid start or end time');
        isPlaying = false;
        return;
    }
    
    sourceNode.onended = () => {
        if (isPlaying) {
            setTimeout(() => playLoop(remainingLoops - 1), 0);
        }
    };
    
    try {
        sourceNode.start(0, startTime, duration);
    } catch (error) {
        console.error('Error playing audio:', error);
        isPlaying = false;
    }
}

function stopPreview() {
    isPlaying = false;
    if (sourceNode) {
        sourceNode.stop();
        sourceNode.disconnect();
    }
}

function setStartTime() {
    const currentTime = document.getElementById('audio-player').currentTime;
    updateStartTime(currentTime);
}

function setEndTime() {
    const currentTime = document.getElementById('audio-player').currentTime;
    updateEndTime(currentTime);
}

async function downloadClip() {
    const loops = parseInt(document.getElementById('loops').value);
    const startTime = parseFloat(document.getElementById('start-time').value);
    const endTime = parseFloat(document.getElementById('end-time').value);
    
    // Create an offline audio context for rendering
    const duration = (endTime - startTime) * loops;
    const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        duration * audioContext.sampleRate,
        audioContext.sampleRate
    );
    
    // Create and connect nodes
    let currentTime = 0;
    for(let i = 0; i < loops; i++) {
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start(currentTime, startTime, endTime - startTime);
        currentTime += endTime - startTime;
    }
    
    // Render audio
    const renderedBuffer = await offlineCtx.startRendering();
    
    // Convert to WAV and download
    const wav = audioBufferToWav(renderedBuffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clipped_audio.wav';
    a.click();
    URL.revokeObjectURL(url);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const wav = new ArrayBuffer(44 + buffer.length * blockAlign);
    const view = new DataView(wav);
    
    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * blockAlign, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, buffer.length * blockAlign, true);
    
    // Write audio data
    const offset = 44;
    const data = new Float32Array(buffer.length);
    for(let channel = 0; channel < buffer.numberOfChannels; channel++) {
        buffer.copyFromChannel(data, channel);
        for(let i = 0; i < data.length; i++) {
            const sample = Math.max(-1, Math.min(1, data[i]));
            const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset + (i * blockAlign) + (channel * bytesPerSample),
                         value, true);
        }
    }
    
    return wav;
}

function writeString(view, offset, string) {
    for(let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Add these functions to handle input changes
function updateStartTime(value) {
    startTime = parseFloat(value);
    document.getElementById('start-time').value = startTime;
    drawWaveform();
}

function updateEndTime(value) {
    endTime = parseFloat(value);
    document.getElementById('end-time').value = endTime;
    drawWaveform();
}
