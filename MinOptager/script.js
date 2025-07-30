document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startRecording');
    const stopButton = document.getElementById('stopRecording');
    const videoPlayback = document.getElementById('videoPlayback');
    const downloadLink = document.getElementById('downloadVideo');
    const statusMessage = document.getElementById('statusMessage');
    const audioSourceSelect = document.getElementById('audioSource');
    const videoQualitySelect = document.getElementById('videoQuality'); // Ny reference
    const recordingIndicator = document.getElementById('recordingIndicator');
    const recordingTimer = document.getElementById('recordingTimer');

    let mediaRecorder;
    let recordedChunks = [];
    let displayStream;
    let microphoneStream;
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
        statusMessage.style.color = '#555';
        recordedChunks = [];
        stopButton.disabled = false;
        startButton.disabled = true;
        downloadLink.style.display = 'none';
        videoPlayback.src = '';

        const selectedAudioSource = audioSourceSelect.value;
        const selectedVideoQuality = videoQualitySelect.value; // Hent valgt kvalitet

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

            // Vælg mimeType og bitrate baseret på kvalitet
            let mimeType = 'video/mp4; codecs=avc1.424028,mp4a.40.2'; // Standard MP4
            let videoBitsPerSecond;

            // Indstil bitrate baseret på valgt kvalitet
            switch (selectedVideoQuality) {
                case 'high':
                    // Eksempel: 4 Mbps (4,000,000 bits per sekund) - god til detaljerede skærmoptagelser
                    videoBitsPerSecond = 4000000;
                    break;
                case 'medium':
                    // Eksempel: 2 Mbps (2,000,000 bits per sekund) - et godt kompromis
                    videoBitsPerSecond = 2000000;
                    break;
                case 'low':
                    // Eksempel: 800 Kbps (800,000 bits per sekund) - mindre fil, lavere kvalitet
                    videoBitsPerSecond = 800000;
                    break;
                default:
                    videoBitsPerSecond = 2000000; // Standard til medium
            }

            // Tjek understøttelse og fallback
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                console.warn(`${mimeType} er ikke understøttet. Prøver WebM.`);
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

            // Opret MediaRecorder med den valgte bitrate
            mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: mimeType,
                videoBitsPerSecond: videoBitsPerSecond // Anvend den valgte bitrate
            });

            downloadLink.download = `skærmoptagelse_${new Date().toISOString().slice(0, 19).replace(/[:T-]/g, '')}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;


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
                statusMessage.style.color = '#28a745';

                clearInterval(timerInterval);
                recordingTimer.textContent = '00:00:00';
                recordingIndicator.classList.remove('active');

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

            startTime = Date.now();
            timerInterval = setInterval(updateTimer, 1000);
            recordingIndicator.classList.add('active');

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
            stopStreamTracks(displayStream);
            stopStreamTracks(microphoneStream);
        }
    });

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

    recordingTimer.textContent = '00:00:00';
});
