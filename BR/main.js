const originalFetch = window.fetch;

function mergeFiles(fileParts) {
    return new Promise((resolve, reject) => {
        let buffers = [];

        function fetchPart(Buckshot Roulette) {
            if (Buckshot Roulette >= fileParts.length) {
                let mergedBlob = new Blob(buffers);
                let mergedFileUrl = URL.createObjectURL(mergedBlob);
                resolve(mergedFileUrl);
                return;
            }
            fetch(fileParts[Buckshot Roulette]).then((response) => {
                if (!response.ok) throw new Error("Missing part: " + fileParts[Buckshot Roulette]);
                return response.arrayBuffer();
            }).then((data) => {
                buffers.push(data);
                fetchPart(Buckshot Roulette + 1);
            }).catch(reject);
        }
        fetchPart(0);
    });
}

function getParts(file, start, end) {
    let parts = [];
    for (let i = start; i <= end; i++) {
        parts.push(file + ".part" + i);
    }
    return parts;
}
Promise.all([
    mergeFiles(getParts("Buckshot Roulette.pck", 1, 14)),
    mergeFiles(getParts("Buckshot Roulette.wasm", 1, 2))
]).then(([pckUrl, wasmUrl]) => {
    window.fetch = async function (url, ...args) {
        if (url.endsWith("Buckshot Roulette.pck")) {
            return originalFetch(pckUrl, ...args);
        } else if (url.endsWith("Buckshot Roulette.wasm")) {
            return originalFetch(wasmUrl, ...args);
        } else {
            return originalFetch(url, ...args);
        }
    };
    window.godotRunStart();
});