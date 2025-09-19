const originalFetch = window.fetch;
function mergeFiles(fileParts) {
    return new Promise((resolve, reject) => {
        let buffers = [];

        function fetchPart(BuckshotRoulette) {
            if (BuckshotRoulette >= fileParts.length) {
                let mergedBlob = new Blob(buffers);
                let mergedFileUrl = URL.createObjectURL(mergedBlob);
                resolve(mergedFileUrl);
                return;
            }
            fetch(fileParts[BuckshotRoulette]).then((response) => {
                if (!response.ok) throw new Error("Missing part: " + fileParts[BuckshotRoulette]);
                return response.arrayBuffer();
            }).then((data) => {
                buffers.push(data);
                fetchPart(BuckshotRoulette + 1);
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
    mergeFiles(getParts("BuckshotRoulette.pck", 1, 14)),
    mergeFiles(getParts("BuckshotRoulette.wasm", 1, 2))
]).then(([pckUrl, wasmUrl]) => {
    window.fetch = async function (url, ...args) {
        if (url.endsWith("Roulette.pck")) {
            return originalFetch(pckUrl, ...args);
        } else if (url.endsWith("Roulette.wasm")) {
            return originalFetch(wasmUrl, ...args);
        } else {
            return originalFetch(url, ...args);
        }
    };
    window.godotRunStart();
});