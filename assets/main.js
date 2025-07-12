// Kamera inicializálása

const video = document.getElementById('video');

const canvas = document.getElementById('canvas');

const ctx = canvas.getContext('2d');

const captureBtn = document.getElementById('capture-btn');

const retakeBtn = document.getElementById('retake-btn');

const downloadBtn = document.getElementById('download-btn');

const resultDiv = document.getElementById('result');

const cameraSelect = document.getElementById('camera-select');

const switchCameraBtn = document.getElementById('switch-camera');

// ICAO szabvány méretei (35×45 mm @300dpi = 413×531 px)

const icaoWidth = 413;

const icaoHeight = 531;

const icaoAspectRatio = 35/45; // 0.777...

canvas.width = icaoWidth;

canvas.height = icaoHeight;

let currentStream = null;

let cameras = [];

let currentCameraIndex = 0;

let captureDateTime = null;

// Frissített CEWE méretek definiálása (méret cm-ben, elrendezés)

const ceweSizes = [

    { 

        name: '4db', 

        cols: 2, 

        rows: 2, 

        printWidth: 10,  // cm (frissítve)

        printHeight: 15  // cm (frissítve)

    },

    { 

        name: '8db', 

        cols: 2, 

        rows: 4, 

        printWidth: 13,  // cm (frissítve)

        printHeight: 18  // cm (frissítve)

    },

    { 

        name: '12db', 

        cols: 3, 

        rows: 4, 

        printWidth: 15,  // cm (frissítve)

        printHeight: 20  // cm (frissítve)

    }

];

// Elérhető kamerák listázása

async function getCameraDevices() {

    try {

        const devices = await navigator.mediaDevices.enumerateDevices();

        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        

        cameraSelect.innerHTML = '<option value="">Kamera kiválasztása...</option>';

        videoDevices.forEach((device, index) => {

            const label = device.label || `Kamera ${index + 1}`;

            cameraSelect.innerHTML += `<option value="${device.deviceId}">${label}</option>`;

        });

        

        cameras = videoDevices;

        return videoDevices;

    } catch (err) {

        console.error("Hiba a kamerák listázásánál:", err);

        return [];

    }

}

// Kamera elindítása

async function startCamera(deviceId = null) {

    if (currentStream) {

        currentStream.getTracks().forEach(track => track.stop());

    }

    

    const constraints = {

        video: {

            width: { ideal: icaoWidth },

            height: { ideal: icaoHeight },

            aspectRatio: icaoAspectRatio

        },

        audio: false

    };

    

    if (deviceId) {

        constraints.video.deviceId = { exact: deviceId };

    } else {

        constraints.video.facingMode = 'user';

    }

    

    try {

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        video.srcObject = stream;

        currentStream = stream;

        

        if (!deviceId) {

            await getCameraDevices();

            if (currentStream) {

                const tracks = currentStream.getVideoTracks();

                if (tracks.length > 0) {

                    const settings = tracks[0].getSettings();

                    if (settings.deviceId) {

                        cameraSelect.value = settings.deviceId;

                    }

                }

            }

        }

        

    } catch (err) {

        console.error("Hiba a kamera elérésénél:", err);

        resultDiv.innerHTML = `<p style="color:red;">Hiba: ${err.message}</p>`;

    }

}

// Kamera váltása

async function switchCamera() {

    if (cameras.length < 2) return;

    

    currentCameraIndex = (currentCameraIndex + 1) % cameras.length;

    const deviceId = cameras[currentCameraIndex].deviceId;

    await startCamera(deviceId);

    cameraSelect.value = deviceId;

}

// Dátum formázása

function formatDateTime(date) {

    const pad = num => num.toString().padStart(2, '0');

    return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

}

// CEWE gombok létrehozása

function createCeweButtons() {

    const ceweContainer = document.createElement('div');

    ceweContainer.className = 'cewe-container';

    ceweContainer.innerHTML = '<h4>CEWE fotó letöltése:</h4>';

    

    ceweSizes.forEach(size => {

        const btn = document.createElement('button');

        btn.className = 'control-btn cewe-btn';

        btn.textContent = `${size.name} (${size.printWidth}×${size.printHeight} cm)`;

        btn.onclick = () => downloadCewePhoto(size);

        ceweContainer.appendChild(btn);

    });

    

    resultDiv.appendChild(ceweContainer);

}

// CEWE fotó létrehozása pontos ICAO méretekkel

function downloadCewePhoto(size) {

    if (!captureDateTime) captureDateTime = new Date();

    

    const dpi = 300;

    const mmToInch = 1/25.4;

    const cmToPx = cm => Math.round(cm * 10 * mmToInch * dpi);

    

    // Papír méret pixelben (300 DPI)

    const paperWidthPx = cmToPx(size.printWidth);

    const paperHeightPx = cmToPx(size.printHeight);

    

    // ICAO kép mérete pixelben (35×45 mm @300dpi)

    const icaoWidthPx = cmToPx(3.5);  // 35 mm = 3.5 cm

    const icaoHeightPx = cmToPx(4.5); // 45 mm = 4.5 cm

    

    // Maximális elhelyezhető képek számítása

    const maxCols = Math.floor((paperWidthPx - icaoWidthPx) / (icaoWidthPx + 20)) + 1;

    const maxRows = Math.floor((paperHeightPx - icaoHeightPx) / (icaoHeightPx + 20)) + 1;

    

    // Ténylegesen elhelyezett képek (nem haladja meg a kért darabszámot)

    const actualCols = Math.min(size.cols, maxCols);

    const actualRows = Math.min(size.rows, maxRows);

    

    // Szükséges margók számítása

    const horizontalGap = (paperWidthPx - (actualCols * icaoWidthPx)) / (actualCols + 1);

    const verticalGap = (paperHeightPx - (actualRows * icaoHeightPx)) / (actualRows + 1);

    

    // Canvas létrehozása

    const ceweCanvas = document.createElement('canvas');

    ceweCanvas.width = paperWidthPx;

    ceweCanvas.height = paperHeightPx;

    const ceweCtx = ceweCanvas.getContext('2d');

    

    // Fehér háttér

    ceweCtx.fillStyle = 'white';

    ceweCtx.fillRect(0, 0, paperWidthPx, paperHeightPx);

    

    // Képek elhelyezése pontos ICAO méretekkel

    for (let row = 0; row < actualRows; row++) {

        for (let col = 0; col < actualCols; col++) {

            const x = horizontalGap + col * (icaoWidthPx + horizontalGap);

            const y = verticalGap + row * (icaoHeightPx + verticalGap);

            

            // Eredeti ICAO kép másolása (pontos méretben)

            ceweCtx.drawImage(

                canvas,

                0, 0, icaoWidth, icaoHeight,

                x, y, icaoWidthPx, icaoHeightPx

            );

        }

    }

    

    // Letöltés

    const formattedDateTime = formatDateTime(captureDateTime);

    const filename = `cewe_icao_${size.name}_${formattedDateTime}.jpg`;

    const link = document.createElement('a');

    link.download = filename;

    link.href = ceweCanvas.toDataURL('image/jpeg', 0.92);

    link.click();

}

// Fotó készítése

captureBtn.addEventListener('click', () => {

    captureDateTime = new Date();

    

    // Kép méretezése és középre igazítása

    const videoAspect = video.videoWidth / video.videoHeight;

    

    ctx.save();

    ctx.scale(-1, 1);

    ctx.drawImage(

        video,

        video.videoWidth/2 - (video.videoHeight * icaoAspectRatio)/2,

        0,

        video.videoHeight * icaoAspectRatio,

        video.videoHeight,

        -icaoWidth,

        0,

        icaoWidth,

        icaoHeight

    );

    ctx.restore();

    

    // Háttér homogenizálása

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {

        if (data[i] > 200 && data[i+1] > 200 && data[i+2] > 200) {

            data[i] = data[i+1] = data[i+2] = 230; // világosszürke

        }

    }

    ctx.putImageData(imageData, 0, 0);

    

    // Eredmény megjelenítése

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    resultDiv.innerHTML = `

        <h3>Az Ön ICAO portréja:</h3>

        <img src="${dataUrl}" style="max-width: 100%; border: 1px solid #ddd;"/>

        <p>Méret: ${icaoWidth}×${icaoHeight} px (35×45 mm 300 DPI-nél)</p>

        <p>Készült: ${captureDateTime.toLocaleString()}</p>

    `;

    

    // Gombok állapotának frissítése

    captureBtn.style.display = 'none';

    retakeBtn.style.display = 'inline-block';

    downloadBtn.style.display = 'inline-block';

    createCeweButtons();

    

    // Kamera leállítása

    if (currentStream) currentStream.getTracks().forEach(track => track.stop());

});

// Újrafelvétel

retakeBtn.addEventListener('click', () => {

    resultDiv.innerHTML = '';

    captureBtn.style.display = 'inline-block';

    retakeBtn.style.display = 'none';

    downloadBtn.style.display = 'none';

    captureDateTime = null;

    startCamera(cameraSelect.value || undefined);

});

// Alapértelmezett kép letöltése

downloadBtn.addEventListener('click', () => {

    if (!captureDateTime) captureDateTime = new Date();

    const filename = `icao_portre_${formatDateTime(captureDateTime)}.jpg`;

    const link = document.createElement('a');

    link.download = filename;

    link.href = canvas.toDataURL('image/jpeg', 0.92);

    link.click();

});

// Eseménykezelők

switchCameraBtn.addEventListener('click', switchCamera);

cameraSelect.addEventListener('change', () => {

    if (cameraSelect.value) startCamera(cameraSelect.value);

});

// Oldal betöltésekor

window.addEventListener('load', async () => {

    await startCamera();

    await getCameraDevices();

    if (cameras.length > 1) switchCameraBtn.style.display = 'inline-block';

});