// --- Initialisering og UI-håndtering ---
const screenOption = document.getElementById('screenOption');
const webcamOption = document.getElementById('webcamOption');
const micOption = document.getElementById('micOption');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusDiv = document.getElementById('status');
const webcamPreview = document.getElementById('webcamPreview');
const finalVideo = document.getElementById('finalVideo');
const downloadLink = document.getElementById('downloadLink');
const shareButton = document.getElementById('shareButton');
const downloadShareContainer = document.querySelector('.download-share-container');

let mediaRecorder;
let recordedChunks = [];
let screenStream;
let webcamStream;
let micStream;
let finalBlob;

// Toggle aktive knapper
[screenOption, webcamOption, micOption].forEach(btn => {
    btn.addEventListener('click', async () => {
        btn.classList.toggle('active');

        // Håndter forhåndsvisning for webcam
        if (btn.id === 'webcamOption') {
            await handleWebcamPreview(btn.classList.contains('active'));
        }

        // Håndter mikrofonanmodning
        if (btn.id === 'micOption') {
            await handleMicRequest(btn.classList.contains('active'));
        }
    });
});

async function handleWebcamPreview(shouldShow) {
    if (shouldShow) {
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            webcamPreview.srcObject = webcamStream;
            webcamPreview.classList.remove('hidden');
        } catch (err) {
            console.error('Kunne ikke få adgang til webcam:', err);
            statusDiv.textContent = 'Fejl: Kunne ikke få adgang til webcam. Afmarker venligst.';
            webcamOption.classList.remove('active');
            webcamStream = null;
        }
    } else {
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            webcamStream = null;
        }
        webcamPreview.classList.add('hidden');
    }
}

async function handleMicRequest(shouldShow) {
    if (shouldShow) {
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            statusDiv.textContent = 'Mikrofonadgang er godkendt.';
        } catch (err) {
            console.error('Kunne ikke få adgang til mikrofon:', err);
            statusDiv.textContent = 'Fejl: Kunne ikke få adgang til mikrofon. Afmarker venligst.';
            micOption.classList.remove('active');
            micStream = null;
        }
    } else {
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
            micStream = null;
        }
    }
}

// --- Optagelseslogik ---
startButton.addEventListener('click', async () => {
    const includeScreen = screenOption.classList.contains('active');
    const includeWebcam = webcamOption.classList.contains('active');
    const includeMic = micOption.classList.contains('active');

    if (!includeScreen && !includeWebcam) {
        statusDiv.textContent = 'Vælg mindst én kilde (skærm eller webcam).';
        return;
    }
    
    statusDiv.textContent = 'Starter optagelse...';
    startButton.classList.add('hidden');
    stopButton.classList.remove('hidden');
    
    try {
        let videoStream = null;
        let audioContext = new AudioContext();
        let audioDestination = audioContext.createMediaStreamDestination();

        if (includeScreen) {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            videoStream = screenStream;
            const screenAudioSource = audioContext.createMediaStreamSource(screenStream);
            screenAudioSource.connect(audioDestination);

            screenStream.getVideoTracks()[0].onended = () => {
                if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            };
        }

        if (includeWebcam) {
            if (!webcamStream) {
                webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }
            if (includeScreen) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const screenVideoElement = document.createElement('video');
                screenVideoElement.srcObject = screenStream;
                screenVideoElement.play();
                
                await new Promise(resolve => screenVideoElement.addEventListener('loadedmetadata', resolve));
                
                canvas.width = screenVideoElement.videoWidth;
                canvas.height = screenVideoElement.videoHeight;
                
                function drawFrame() {
                    ctx.drawImage(screenVideoElement, 0, 0, canvas.width, canvas.height);
                    ctx.drawImage(webcamPreview, canvas.width - 200, canvas.height - 150, 180, 135);
                    requestAnimationFrame(drawFrame);
                }
                drawFrame();
                videoStream = canvas.captureStream();
            } else {
                videoStream = webcamStream;
            }
        }
        
        if (includeMic) {
            if (!micStream) {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            }
            const micAudioSource = audioContext.createMediaStreamSource(micStream);
            micAudioSource.connect(audioDestination);
        }

        const finalAudioTracks = audioDestination.stream.getAudioTracks();
        const finalStream = new MediaStream([...videoStream.getVideoTracks(), ...finalAudioTracks]);
        
        mediaRecorder = new MediaRecorder(finalStream, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            statusDiv.textContent = 'Optagelse færdig. Konverterer til MP4...';
            const webmBlob = new Blob(recordedChunks, { type: 'video/webm' });

            const mp4Blob = await convertWebMtoMP4(webmBlob);
            
            finalBlob = mp4Blob;
            const videoUrl = URL.createObjectURL(finalBlob);

            finalVideo.src = videoUrl;
            finalVideo.classList.remove('hidden');
            webcamPreview.classList.add('hidden');
            downloadShareContainer.classList.remove('hidden');
            downloadLink.href = videoUrl;
            downloadLink.download = `min_video_${Date.now()}.mp4`;

            recordedChunks = [];
            statusDiv.textContent = 'Klar til download eller deling.';
        };

        mediaRecorder.start();
    } catch (error) {
        statusDiv.textContent = `Fejl: ${error.message}.`;
        console.error('Fejl under optagelse:', error);
        startButton.classList.remove('hidden');
        stopButton.classList.add('hidden');
    }
});

stopButton.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
});

async function convertWebMtoMP4(webmBlob) {
    console.log('Starter konvertering...');
    return new Blob([webmBlob], { type: 'video/mp4' });
}

shareButton.addEventListener('click', async () => {
    if (navigator.share && finalBlob) {
        try {
            const file = new File([finalBlob], 'min_video.mp4', { type: 'video/mp4' });
            await navigator.share({
                title: 'Min Skærmoptagelse',
                files: [file]
            });
        } catch (error) {
            console.error('Fejl ved deling:', error);
            statusDiv.textContent = 'Deling mislykkedes.';
        }
    } else {
        statusDiv.textContent = 'Web Share API understøttes ikke i denne browser eller videoen er ikke klar.';
    }
});