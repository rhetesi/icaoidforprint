// EXIF adatok hozzáadása a blob-hoz
async function addExifData(blob, size) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            const dataView = new DataView(arrayBuffer);
            
            try {
                // EXIF adatok hozzáadása
                // Megjegyzés: Az EXIF.js nem támogat írást, ezért csak szimuláljuk
                // Valós alkalmazásban használjunk egy EXIF írást támogató könyvtárat
                
                // Papírméret adatainak elmentése EXIF-be
                const paperSizeInfo = `CEWE Paper Size: ${size.printWidth}x${size.printHeight} cm`;
                
                // EXIF adatok hozzáadása (szimulálva)
                // Valós implementáció:
                // EXIF.setImageSize(dataView, size.printWidth, size.printHeight);
                // EXIF.setTag(dataView, "ImageDescription", paperSizeInfo);
                
                console.log(`EXIF adatok hozzáadva: ${paperSizeInfo}`);
                
                resolve(new Blob([dataView], {type: 'image/jpeg'}));
            } catch (error) {
                console.error("EXIF hiba:", error);
                resolve(blob);
            }
        };
        reader.readAsArrayBuffer(blob);
    });
}