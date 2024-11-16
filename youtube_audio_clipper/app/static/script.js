let audioContext;
let audioBuffer;
let sourceNode;
let startTime = 0;
let endTime = 0;
let isPlaying = false;
let audioInitialized = false;
let animationFrameId;
let isDrawingPlayhead = false;
let previewStartTime;
let currentPreviewTime;
let lastPreviewUpdateTime;

async function downloadAudio() {
    const url = document.getElementById('url-input').value;
    const formData = new FormData();
    formData.append('url', url);

    try {
        // Show download progress
        document.getElementById('download-progress').style.display = 'block';
        
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
        
        // Add click handler to initialize audio
        const initializeAudio = async () => {
            await initAudio(audioPlayer);
            audioPlayer.removeEventListener('play', initializeAudio);
        };
        
        audioPlayer.addEventListener('play', initializeAudio);
        
    } catch (error) {
        alert('Error downloading audio: ' + error);
    } finally {
        // Hide download progress
        document.getElementById('download-progress').style.display = 'none';
    }
}

async function initAudio(audioElement) {
    try {
        // Create context only if not already created
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Resume context if it's suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        const response = await fetch(audioElement.src);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Set initial end time to full duration
        endTime = audioBuffer.duration;
        document.getElementById('end-time').value = endTime;
        document.getElementById('duration').textContent = formatTime(endTime);
        
        // Set canvas dimensions and draw waveform
        const canvas = document.getElementById('waveform');
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = 200;
        
        audioInitialized = true;
        
        // Update current time display and waveform on timeupdate
        audioElement.addEventListener('timeupdate', () => {
            const currentTime = audioElement.currentTime;
            document.getElementById('current-time').textContent = formatTime(currentTime);
            drawWaveform(currentTime);
        });

        // Add seeked event to update start/end times when using audio controls
        audioElement.addEventListener('seeked', () => {
            const currentTime = audioElement.currentTime;
            // Update start time if it's before the current end time
            if (currentTime < endTime) {
                startTime = currentTime;
                document.getElementById('start-time').value = currentTime;
            }
        });
        
        // Initial draw
        drawWaveform(0);
        
    } catch (error) {
        console.error('Error initializing audio:', error);
        alert('Error initializing audio: ' + error);
    }
}

function drawWaveform(currentTime = null) {
    if (!audioBuffer) return;  // Guard clause if audio isn't loaded

    const canvas = document.getElementById('waveform');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 1;
    
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    
    ctx.beginPath();
    ctx.moveTo(0, amp);
    
    for(let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        
        for(let j = 0; j < step; j++) {
            const index = Math.floor((i * step) + j);
            if (index < data.length) {
                const datum = data[index];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
        }
        
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }
    
    ctx.stroke();

    // Draw time markers
    const startX = Math.floor((startTime / audioBuffer.duration) * width);
    const endX = Math.floor((endTime / audioBuffer.duration) * width);
    
    // Draw selection region with semi-transparent background
    ctx.fillStyle = 'rgba(200, 200, 255, 0.2)';
    ctx.fillRect(startX, 0, endX - startX, height);
    
    // Draw start marker
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.stroke();
    
    // Draw end marker
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();
    
    // Draw playhead
    if (currentTime !== null) {
        const playheadX = Math.floor((currentTime / audioBuffer.duration) * width);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
    }
}

function updatePlayhead() {
    if (!isDrawingPlayhead) return;
    
    const audioPlayer = document.getElementById('audio-player');
    drawWaveform(audioPlayer.currentTime);
    animationFrameId = requestAnimationFrame(updatePlayhead);
}

async function previewClip() {
    try {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        if (isPlaying) {
            stopPreview();
            return;
        }
        
        if (!audioInitialized) {
            alert('Please wait for audio to initialize');
            return;
        }
        
        const loops = parseInt(document.getElementById('loops').value) || 1;
        startTime = parseFloat(document.getElementById('start-time').value) || 0;
        endTime = parseFloat(document.getElementById('end-time').value) || audioBuffer.duration;
        
        if (startTime >= endTime) {
            alert('Start time must be less than end time');
            return;
        }
        
        // Create and start the source
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(audioContext.destination);
        
        isPlaying = true;
        previewStartTime = null;  // Will be set in playLoop
        
        // Start audio and animation
        const offset = startTime;
        const duration = endTime - startTime;
        sourceNode.start(0, offset, duration);
        playLoop(loops);
        
    } catch (error) {
        console.error('Error previewing clip:', error);
        alert('Error previewing clip: ' + error);
    }
}

function playLoop(loops) {
    if (!isPlaying) return;
    
    const currentTime = audioContext.currentTime;
    
    if (!lastPreviewUpdateTime) {
        previewStartTime = currentTime;
        currentPreviewTime = startTime;
        lastPreviewUpdateTime = currentTime;
    }
    
    // Calculate current position in the clip
    const elapsedTime = currentTime - previewStartTime;
    const clipDuration = endTime - startTime;
    const loopPosition = elapsedTime % clipDuration;
    currentPreviewTime = startTime + loopPosition;
    
    // Update display and waveform
    document.getElementById('current-time').textContent = formatTime(currentPreviewTime);
    drawWaveform(currentPreviewTime);
    
    // Schedule next frame
    requestAnimationFrame(() => playLoop(loops));
    
    // Check if we've completed all loops
    const currentLoop = Math.floor(elapsedTime / clipDuration) + 1;
    if (currentLoop > loops) {
        stopPreview();
        return;
    }
}

function stopPreview() {
    isPlaying = false;
    if (sourceNode) {
        sourceNode.stop();
        sourceNode.disconnect();
    }
    
    // Reset preview timing variables
    previewStartTime = null;
    currentPreviewTime = null;
    lastPreviewUpdateTime = null;
    
    // Reset display to audio player's current time
    const audioPlayer = document.getElementById('audio-player');
    document.getElementById('current-time').textContent = formatTime(audioPlayer.currentTime);
    drawWaveform(audioPlayer.currentTime);
}

function setStartTime() {
    const audioPlayer = document.getElementById('audio-player');
    const currentTime = audioPlayer.currentTime;
    startTime = currentTime;
    document.getElementById('start-time').value = currentTime;
    drawWaveform(currentTime);
}

function setEndTime() {
    const audioPlayer = document.getElementById('audio-player');
    const currentTime = audioPlayer.currentTime;
    endTime = currentTime;
    document.getElementById('end-time').value = currentTime;
    drawWaveform(currentTime);
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

// Add event listeners for manual input changes
document.getElementById('start-time').addEventListener('change', function() {
    const newStartTime = parseFloat(this.value);
    if (newStartTime >= 0 && newStartTime < endTime) {
        startTime = newStartTime;
        const audioPlayer = document.getElementById('audio-player');
        audioPlayer.currentTime = newStartTime;
    }
});

document.getElementById('end-time').addEventListener('change', function() {
    const newEndTime = parseFloat(this.value);
    if (newEndTime > startTime && newEndTime <= audioBuffer.duration) {
        endTime = newEndTime;
        drawWaveform(document.getElementById('audio-player').currentTime);
    }
});