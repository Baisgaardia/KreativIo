document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const screenOption = document.getElementById('screenOption');
    const webcamOption = document.getElementById('webcamOption');
    const micOption = document.getElementById('micOption');
    const systemAudioOption = document.getElementById('systemAudioOption');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const status = document.getElementById('status');
    const webcamPreview = document.getElementById('webcamPreview');
    const finalVideo = document.getElementById('finalVideo');
    const downloadLink = document.getElementById('downloadLink');
    const downloadShareContainer = document.getElementById('download-share-container');
    const videoCanvas = document.getElementById('videoCanvas');
    const ctx = videoCanvas.getContext('2d');

    // State Management
    let mediaRecorder;
    let recordedChunks = [];
    let screenStream, webcamStream, micStream;
    let animationFrameId;

    // FFmpeg setup
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({
        log: true,
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    });

    // --- Option Button Event Listeners ---

    screenOption.addEventListener('click', () => screenOption.classList.toggle('active'));
    systemAudioOption.addEventListener('click', () => systemAudioOption.classList.toggle('active'));

    webcamOption.addEventListener('click', async () => {
        webcamOption.classList.toggle('active');
        if (webcamOption.classList.contains('active')) {
            try {
                webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, frameRate: 30 }, audio: false });
                webcamPreview.srcObject = webcamStream;
                webcamPreview.classList.remove('hidden');
                status.textContent = "Webcam aktiveret. Klar til at optage.";
            } catch (err) {
                status.textContent = "Kunne ikke få adgang til webcam. Tjek tilladelser.";
                webcamOption.classList.remove('active');
                console.error("Webcam error:", err);
            }
        } else {
            if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
                webcamStream = null;
            }
            webcamPreview.classList.add('hidden');
            webcamPreview.srcObject = null;
        }
    });

    micOption.addEventListener('click', async () => {
        micOption.classList.toggle('active');
        if (micOption.classList.contains('active')) {
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
                status.textContent = "Mikrofon aktiveret. Klar til at optage.";
            } catch (err) {
                status.textContent = "Kunne ikke få adgang til mikrofon. Tjek tilladelser.";
                micOption.classList.remove('active');
                console.error("Microphone error:", err);
            }
        } else {
            if (micStream) {
                micStream.getTracks().forEach(track => track.stop());
                micStream = null;
            }
        }
    });

    // --- Core Recording Logic ---

    startButton.addEventListener('click', async () => {
        const isScreen = screenOption.classList.contains('active');
        const isWebcam = webcamOption.classList.contains('active');

        if (!isScreen && !isWebcam) {
            status.textContent = "Fejl: Du skal vælge enten skærm eller webcam for at optage.";
            return;
        }

        resetUI();

        try {
            await setupStreamsAndStart();
        } catch (error) {
            console.error("Fejl under start af optagelse:", error);
            status.textContent = `Kunne ikke starte optagelse: ${error.message}`;
            stopAllStreams();
        }
    });

    stopButton.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
        stopButton.classList.add('hidden');
        startButton.classList.remove('hidden');
    });

    // --- Stream & Canvas Setup ---

    async function setupStreamsAndStart() {
        status.textContent = "Initialiserer streams...";
        const isScreen = screenOption.classList.contains('active');
        const isSystemAudio = systemAudioOption.classList.contains('active');

        if (isScreen) {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 30 },
                audio: isSystemAudio
            });
        }

        const videoTrack = screenStream ? screenStream.getVideoTracks()[0] : (webcamStream ? webcamStream.getVideoTracks()[0] : null);
        if (!videoTrack) {
            throw new Error("Ingen videokilde fundet.");
        }
        
        const { width, height } = videoTrack.getSettings();
        videoCanvas.width = width;
        videoCanvas.height = height;

        const screenVideoEl = document.createElement('video');
        if (screenStream) {
            screenVideoEl.srcObject = screenStream;
            screenVideoEl.muted = true;
            await screenVideoEl.play();
        }
        
        drawToCanvas(screenVideoEl, webcamPreview);

        const canvasStream = videoCanvas.captureStream(30);
        const finalStream = new MediaStream(canvasStream.getVideoTracks());

        const audioTracks = [];
        if (micStream) audioTracks.push(...micStream.getAudioTracks());
        if (isSystemAudio && screenStream && screenStream.getAudioTracks().length > 0) {
            audioTracks.push(...screenStream.getAudioTracks());
        }
        
        audioTracks.forEach(track => finalStream.addTrack(track));

        startRecording(finalStream);
    }
    
    function drawToCanvas(screenEl, webcamEl) {
        const isScreen = screenOption.classList.contains('active');
        const isWebcam = webcamOption.classList.contains('active');

        if (!isScreen && !isWebcam) return;

        ctx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);

        if (isScreen && screenEl.readyState >= 2) {
            ctx.drawImage(screenEl, 0, 0, videoCanvas.width, videoCanvas.height);
        } else if (isWebcam && !isScreen && webcamEl.readyState >= 2) {
             ctx.save();
             ctx.translate(videoCanvas.width, 0);
             ctx.scale(-1, 1);
             ctx.drawImage(webcamEl, 0, 0, videoCanvas.width, videoCanvas.height);
             ctx.restore();
        }

        if (isWebcam && isScreen && webcamEl.readyState >= 2) {
            const webcamWidth = videoCanvas.width * 0.2;
            const webcamHeight = (webcamWidth / 4) * 3;
            const margin = 20;
            ctx.save();
            ctx.translate(videoCanvas.width - webcamWidth - margin, videoCanvas.height - webcamHeight - margin);
            ctx.scale(-1, 1);
            ctx.drawImage(webcamEl, 0, 0, -webcamWidth, webcamHeight);
            ctx.restore();
        }

        animationFrameId = requestAnimationFrame(() => drawToCanvas(screenEl, webcamEl));
    }

    // --- Recording Process ---

    function startRecording(stream) {
        recordedChunks = [];
        videoCanvas.classList.remove('hidden');
        finalVideo.classList.add('hidden');
        webcamPreview.classList.add('hidden'); // FIX: Hide the separate preview element

        const options = { mimeType: 'video/webm; codecs=vp9,opus' };
        mediaRecorder = new MediaRecorder(stream, options);

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };
        mediaRecorder.onstop = processVideo;
        mediaRecorder.start();

        status.textContent = "Optagelse i gang... Klik på 'Stop' for at afslutte.";
        startButton.classList.add('hidden');
        stopButton.classList.remove('hidden');
    }

    async function processVideo() {
        // FIX: Better user feedback during processing
        status.textContent = "Stopper optagelse og forbereder fil...";
        stopAllStreams(false);

        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        
        if (!ffmpeg.isLoaded()) {
            status.textContent = "Indlæser videokonverter (FFmpeg)...";
            await ffmpeg.load();
        }
        
        status.textContent = "Overfører video til konverter...";
        ffmpeg.FS('writeFile', 'input.webm', await fetchFile(blob));
        
        status.textContent = "Konverterer til MP4... (dette kan tage lang tid)";
        await ffmpeg.run('-i', 'input.webm', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', 'output.mp4');
        
        const data = ffmpeg.FS('readFile', 'output.mp4');
        const finalBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const finalUrl = URL.createObjectURL(finalBlob);

        finalVideo.src = finalUrl;
        downloadLink.href = finalUrl;
        downloadLink.download = `optagelse-${new Date().toISOString()}.mp4`;

        ffmpeg.FS('unlink', 'input.webm');
        ffmpeg.FS('unlink', 'output.mp4');

        status.textContent = "Din video er klar!";
        videoCanvas.classList.add('hidden');
        finalVideo.classList.remove('hidden');
        downloadShareContainer.classList.remove('hidden');
    }

    // --- Utility Functions ---

    function resetUI() {
        finalVideo.classList.add('hidden');
        videoCanvas.classList.add('hidden');
        downloadShareContainer.classList.add('hidden');
        recordedChunks = [];
         if (!webcamOption.classList.contains('active')) {
            webcamPreview.classList.add('hidden');
        }
    }

    function stopAllStreams(fullReset = true) {
        if (screenStream) screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;

        if (fullReset) {
            if (webcamStream) webcamStream.getTracks().forEach(track => track.stop());
            webcamStream = null;
            webcamPreview.srcObject = null;
            webcamPreview.classList.add('hidden');
            webcamOption.classList.remove('active');

            if (micStream) micStream.getTracks().forEach(track => track.stop());
            micStream = null;
            micOption.classList.remove('active');
        }

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
});