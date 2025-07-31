async function startRecording() {
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
