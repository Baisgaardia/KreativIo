document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startRecording');
    const stopButton = document.getElementById('stopRecording');
    const videoPlayback = document.getElementById('videoPlayback');
    const downloadLink = document.getElementById('downloadVideo');
    const statusMessage = document.getElementById('statusMessage');
    const audioSourceSelect = document.getElementById('audioSource');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const recordingTimer = document.getElementById('recordingTimer');

    let mediaRecorder;
    let recordedChunks = [];
    let displayStream; // Stream fra skærmdeling
    let microphoneStream; // Stream fra mikrofon
    let timerInterval;
    let startTime;

    // Funktion til at opdatere timeren
    function updateTimer() {
        const elapsedTime = Date.now() - startTime;
        const hours = Math.floor(elapsedTime / 3600000);
        const minutes = Math.floor((elapsedTime % 3600000) / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);

        const format = (num) => String(num).padStart(2, '0');
        recordingTimer.textContent = `${format(hours)}:${format(minutes)}:${format(seconds)}`;
    }

    // Funktion til at stoppe alle tracks i en stream
    function stopStreamTracks(stream) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }

    // Funktion til at starte optagelse
    startButton.addEventListener('click', async () => {
        statusMessage.textContent = 'Anmoder om adgang...';
        statusMessage.style.color = '#555'; // Standardfarve
        recordedChunks = [];
        stopButton.disabled = false;
        startButton.disabled = true;
        downloadLink.style.display = 'none';
        videoPlayback.src = ''; // Ryd forrige video

        const selectedAudioSource = audioSourceSelect.value;
        let combinedStream;
        let videoTrack;
        let audioTracks = [];

        try {
            // Få skærmstream
            displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always'
                },
                audio: selectedAudioSource === 'system' || selectedAudioSource === 'both'
            });

            videoTrack = displayStream.getVideoTracks()[0];
            if (displayStream.getAudioTracks().length > 0) {
                audioTracks.push(displayStream.getAudioTracks()[0]);
            }

            // Få mikrofonlyd, hvis valgt
            if (selectedAudioSource === 'microphone' || selectedAudioSource === 'both') {
                microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioTracks.push(microphoneStream.getAudioTracks()[0]);
            }

            // Kombiner streams
            combinedStream = new MediaStream([videoTrack, ...audioTracks]);

            // Vælg det bedste understøttede mimeType for MP4 eller WebM
            let mimeType = 'video/mp4; codecs=avc1.424028,mp4a.40.2'; // Standard MP4
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                console.warn(`MP4 med H.264 er ikke understøttet. Prøver WebM.`);
                mimeType = 'video/webm; codecs=vp8,opus'; // Fallback til WebM
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    console.error('Ingen understøttet videoformat fundet for optagelse.');
                    statusMessage.textContent = 'Fejl: Din browser understøtter ikke de nødvendige videoformater for optagelse.';
                    statusMessage.style.color = '#d9534f';
                    startButton.disabled = false;
                    stopButton.disabled = true;
                    stopStreamTracks(displayStream);
                    stopStreamTracks(microphoneStream);
                    return;
                }
            }
            downloadLink.download = `skærmoptagelse_${new Date().toISOString().slice(0, 19).replace(/[:T-]/g, '')}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;


            mediaRecorder = new MediaRecorder(combinedStream, { mimeType: mimeType });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: recordedChunks[0].type });
                const url = URL.createObjectURL(blob);
                videoPlayback.src = url;
                downloadLink.href = url;
                downloadLink.style.display = 'block';
                statusMessage.textContent = 'Optagelse er klar til download og afspilning.';
                statusMessage.style.color = '#28a745'; // Grøn for succes

                // Stop timer og indikator
                clearInterval(timerInterval);
                recordingTimer.textContent = '00:00:00';
                recordingIndicator.classList.remove('active');

                // Stop alle tracks for at frigive ressourcer
                stopStreamTracks(displayStream);
                stopStreamTracks(microphoneStream);
            };

            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder fejl:', event.error);
                statusMessage.textContent = `Optagefejl: ${event.error.name} - ${event.error.message}`;
                statusMessage.style.color = '#d9534f';
                startButton.disabled = false;
                stopButton.disabled = true;
                clearInterval(timerInterval);
                recordingTimer.textContent = '00:00:00';
                recordingIndicator.classList.remove('active');
                stopStreamTracks(displayStream);
                stopStreamTracks(microphoneStream);
            };

            mediaRecorder.start();
            statusMessage.textContent = 'Optager... Klik på "Stop Optagelse" for at afslutte.';
            statusMessage.style.color = '#007bff';

            // Start timer og indikator
            startTime = Date.now();
            timerInterval = setInterval(updateTimer, 1000);
            recordingIndicator.classList.add('active');

            // Lyt efter når brugeren manuelt stopper skærmdelingen via browserens UI
            if (videoTrack) {
                videoTrack.addEventListener('ended', () => {
                    if (mediaRecorder && mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                        startButton.disabled = false;
                        stopButton.disabled = true;
                        statusMessage.textContent = 'Optagelsen blev stoppet manuelt af brugeren.';
                        statusMessage.style.color = '#555';
                    }
                });
            }

        } catch (err) {
            console.error('Fejl ved adgang til skærm eller mikrofon:', err);
            statusMessage.textContent = `Fejl: ${err.name} - ${err.message}. Sørg for at give tilladelse til skærmdeling og mikrofon.`;
            statusMessage.style.color = '#d9534f';
            startButton.disabled = false;
            stopButton.disabled = true;
            clearInterval(timerInterval);
            recordingTimer.textContent = '00:00:00';
            recordingIndicator.classList.remove('active');
            stopStreamTracks(displayStream); // Sørg for at stoppe streams, selv ved fejl i opstart
            stopStreamTracks(microphoneStream);
        }
    });

    // Funktion til at stoppe optagelse
    stopButton.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            startButton.disabled = false;
            stopButton.disabled = true;
            statusMessage.textContent = 'Behandler optagelse...';
            statusMessage.style.color = '#555';
            clearInterval(timerInterval);
            recordingIndicator.classList.remove('active');
        }
    });

    // Første initialisering af timer display
    recordingTimer.textContent = '00:00:00';
});