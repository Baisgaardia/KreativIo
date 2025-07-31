document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementer og State ---
    const dom = {
        screen: document.getElementById('screenOption'),
        webcam: document.getElementById('webcamOption'),
        mic: document.getElementById('micOption'),
        systemAudio: document.getElementById('systemAudioOption'),
        start: document.getElementById('startButton'),
        status: document.getElementById('status'),
        canvas: document.getElementById('videoCanvas'),
        finalVideo: document.getElementById('finalVideo'),
        downloadLink: document.getElementById('downloadLink'),
        downloadContainer: document.getElementById('download-share-container'),
        webcamPreview: document.getElementById('webcamPreview'),
        controlsContainer: document.getElementById('controls-container'),
    };
    const ctx = dom.canvas.getContext('2d');
    let state = {
        recorder: null,
        chunks: [],
        screenStream: null,
        webcamStream: null,
        micStream: null,
        animationFrameId: null,
        stopButton: null,
        ffmpegLoaded: false,
    };

    // --- FFmpeg Initialisering (til v0.11.0) ---
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({
        log: true,
    });


    // --- Event Listeners for Enhedsvalg ---
    dom.screen.addEventListener('click', () => dom.screen.classList.toggle('active'));
    dom.systemAudio.addEventListener('click', () => dom.systemAudio.classList.toggle('active'));

    dom.webcam.addEventListener('click', async () => {
        dom.webcam.classList.toggle('active');
        if (dom.webcam.classList.contains('active')) {
            try {
                dom.status.textContent = "Anmoder om adgang til webcam...";
                state.webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, frameRate: 30 }, audio: false });
                dom.webcamPreview.srcObject = state.webcamStream;
                dom.webcamPreview.classList.remove('hidden');
                dom.status.textContent = "Webcam er klar.";
            } catch (err) {
                dom.status.textContent = "Adgang til webcam nægtet.";
                dom.webcam.classList.remove('active');
            }
        } else if (state.webcamStream) {
            state.webcamStream.getTracks().forEach(track => track.stop());
            state.webcamStream = null;
            dom.webcamPreview.classList.add('hidden');
        }
    });

    dom.mic.addEventListener('click', async () => {
        dom.mic.classList.toggle('active');
        if (dom.mic.classList.contains('active')) {
            try {
                dom.status.textContent = "Anmoder om adgang til mikrofon...";
                state.micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
                dom.status.textContent = "Mikrofon er klar.";
            } catch (err) {
                dom.status.textContent = "Adgang til mikrofon nægtet.";
                dom.mic.classList.remove('active');
            }
        } else if (state.micStream) {
            state.micStream.getTracks().forEach(track => track.stop());
            state.micStream = null;
        }
    });

    // --- Hovedfunktionalitet: Start og Stop ---
    dom.start.addEventListener('click', startRecording);

    aasync function startRecording() {
    const isScreen = dom.screen.classList.contains('active');
    if (!isScreen && !state.webcamStream) {
        dom.status.textContent = "Vælg venligst en skærm eller aktiver webcam.";
        return;
    }

    resetUIForRecording();

    try {
        let mainVideoSource;
        if (isScreen) {
            state.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 30 },
                audio: dom.systemAudio.classList.contains('active'),
            });
            mainVideoSource = state.screenStream;
            mainVideoSource.getVideoTracks()[0].onended = () => stopRecording();
        } else {
            mainVideoSource = state.webcamStream;
            createManualStopButton();
        }

        const { width, height } = mainVideoSource.getVideoTracks()[0].getSettings();
        dom.canvas.width = width;
        dom.canvas.height = height;

        const videoElements = await setupVideoElementsForCanvas();
        drawToCanvas(videoElements);

        const canvasStream = dom.canvas.captureStream(30);
        
        // --- NYT: Korrekt lyd-mixing ---
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        let hasAudio = false;

        if (state.screenStream && dom.systemAudio.classList.contains('active') && state.screenStream.getAudioTracks().length > 0) {
            const systemSource = audioContext.createMediaStreamSource(state.screenStream);
            systemSource.connect(destination);
            hasAudio = true;
        }

        if (state.micStream && state.micStream.getAudioTracks().length > 0) {
            const micSource = audioContext.createMediaStreamSource(state.micStream);
            micSource.connect(destination);
            hasAudio = true;
        }
        // --- SLUT PÅ NY KODE ---

        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...(hasAudio ? destination.stream.getAudioTracks() : []) // Brug det mixede lydspor
        ]);

        state.chunks = [];
        // Vigtigt: Opdater mimeType for bedre kompatibilitet
        state.recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp8,opus' });
        state.recorder.ondataavailable = e => e.data.size > 0 && state.chunks.push(e.data);
        state.recorder.onstop = processVideo;
        state.recorder.start();

        dom.status.textContent = 'Optagelse i gang...';
        dom.canvas.classList.remove('hidden');
    } catch (error) {
        console.error("Fejl under start af optagelse:", error);
        dom.status.textContent = `Kunne ikke starte: ${error.message}`;
        cleanup();
    }
}

    function stopRecording() {
        if (state.recorder && state.recorder.state === "recording") {
            state.recorder.stop();
        }
    }

    async function processVideo() {
        dom.status.textContent = 'Behandler video... Vent venligst.';
        cleanup(); 

        try {
            if (!ffmpeg.isLoaded()) {
                await ffmpeg.load();
            }
            
            const blob = new Blob(state.chunks, { type: 'video/webm' });
            ffmpeg.FS('writeFile', 'input.webm', await fetchFile(blob)); 
            
            await ffmpeg.run('-i', 'input.webm', '-c', 'copy', 'output.mp4');
            
            const data = ffmpeg.FS('readFile', 'output.mp4');
            const finalUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

            dom.finalVideo.src = finalUrl;
            dom.downloadLink.href = finalUrl;
            dom.downloadLink.download = `optagelse-${new Date().toISOString()}.mp4`;

            ffmpeg.FS('unlink', 'input.webm');
            ffmpeg.FS('unlink', 'output.mp4');

            dom.status.textContent = 'Din video er klar!';
            dom.finalVideo.classList.remove('hidden');
            dom.downloadContainer.classList.remove('hidden');
        } catch (error) {
            console.error("FFmpeg fejl:", error);
            dom.status.textContent = `Fejl under konvertering af video: ${error.message}`;
        }
    }

    // --- Hjælpefunktioner ---
    function resetUIForRecording() {
        dom.start.classList.add('hidden');
        dom.webcamPreview.classList.add('hidden');
        dom.finalVideo.classList.add('hidden');
        dom.downloadContainer.classList.add('hidden');
    }

    function cleanup() {
        ['screenStream', 'webcamStream', 'micStream'].forEach(streamName => {
            if (state[streamName]) {
                state[streamName].getTracks().forEach(track => track.stop());
                state[streamName] = null;
            }
        });
        if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
        if (state.stopButton) state.stopButton.remove();
        
        dom.canvas.classList.add('hidden');
        dom.start.classList.remove('hidden');
    }
    
    function createManualStopButton() {
        state.stopButton = document.createElement('button');
        state.stopButton.id = 'stopButton';
        state.stopButton.textContent = 'Stop Optagelse';
        state.stopButton.className = 'action-btn';
        state.stopButton.onclick = stopRecording;
        dom.controlsContainer.appendChild(state.stopButton);
    }
    
    async function setupVideoElementsForCanvas() {
        const screenEl = document.createElement('video');
        const webcamEl = document.createElement('video');
        if (state.screenStream) {
            screenEl.srcObject = state.screenStream;
            await screenEl.play();
        }
        if (state.webcamStream) {
            webcamEl.srcObject = state.webcamStream;
            await webcamEl.play();
        }
        return { screenEl, webcamEl };
    }

    function drawToCanvas({ screenEl, webcamEl }) {
        const mainEl = state.screenStream ? screenEl : webcamEl;
        if (mainEl && mainEl.readyState >= 2) {
            if (!state.screenStream && dom.webcam.classList.contains('active')) {
                ctx.save();
                ctx.translate(dom.canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(mainEl, 0, 0, dom.canvas.width, dom.canvas.height);
                ctx.restore();
            } else {
                ctx.drawImage(mainEl, 0, 0, dom.canvas.width, dom.canvas.height);
            }
        }
        if (state.screenStream && state.webcamStream && webcamEl.readyState >= 2) {
            const w = dom.canvas.width * 0.25;
            const h = (w / 4) * 3;
            const m = 20;
            ctx.drawImage(webcamEl, dom.canvas.width - w - m, dom.canvas.height - h - m, w, h);
        }
        state.animationFrameId = requestAnimationFrame(() => drawToCanvas({ screenEl, webcamEl }));
    }
});
