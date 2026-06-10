const WebSocket = require("ws");
const fs = require("fs");

const { runInNewContext } = require("node:vm");
const { setFlagsFromString } = require("node:v8");
setFlagsFromString("--expose_gc");
const gc = runInNewContext("gc");

const wss = new WebSocket.Server({ port: 8100, maxPayload: 65536 });

const clients = {};
let socketServerPassword = "#okxJ-,5fFwNQJ=^Zm6^wOHf}Hv.ec#XQX6SezPx8KP7zZZy3G";
let clientId = 0;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const encode = (e) => {
    try {
        return encoder.encode(e);
    } catch { };
}
const decode = (e) => {
    try {
        return decoder.decode(e);
    } catch { };
}

wss.on("connection", (ws) => {
    ws.clientId = ++clientId;
    ws.actualId = ws.clientId;
    if (!clients[ws.clientId]) {
        clients[ws.clientId] = {};
        setTimeout(() => {
            if (!ws.verified) {
                ws.close();
            }
        }, 15000);
    }
    if (!clients[ws.clientId].modules) {
        clients[ws.clientId].modules = {};
    }
    ws.sendMessage = (m) => {
        try {
            if (ws.readyState === 1) {
                ws.send(encode(m));
            }
        } catch { };
    }
    ws.sendMessage(`clientId ${ws.clientId}`);
    ws.on("message", (m) => {
        const msg = decode(m);
        if (msg) {
            switch (msg.split(" ")[0].replaceAll(" ", "")) {
                case "clientId":
                    const clientId = msg.split(" ")[1];
                    const password = msg.split(" ")[2];
                    if (password === socketServerPassword) {
                        if (ws.clientId != clientId && clients[clientId]) {
                            ws.actualId = clientId;
                            if (!clients[ws.actualId].isActive) {
                                clients[ws.actualId].isActive = true;
                            }
                        }
                        ws.verified = true;
                    }
                    break;
                case "createModule":
                    if (!ws.verified) return;
                    const moduleId = msg.split(" ")[1];
                    clients[ws.actualId].modules[moduleId] = wasmmodule();
                    break;
                case "decodeOpcode5":
                    const opcode5id = msg.split(" ")[1];
                    const opcode5data = `[${msg.split(" ")[2]}]`;
                    const hostname = msg.split(" ")[3];
                    if (clients[ws.actualId].modules[opcode5id]) {
                        clients[ws.actualId].modules[opcode5id].onDecodeOpcode5(new Uint8Array(JSON.parse(opcode5data)), hostname, decodedopcode5 => {
                            ws.sendMessage(`opcode4 ${opcode5id} ${new Uint8Array(decodedopcode5[5])} ${decodedopcode5[6]}`);
                        });
                    }
                    break;
                case "decodeOpcode10":
                    const opcode10id = msg.split(" ")[1];
                    const opcode10data = `[${msg.split(" ")[2]}]`;
                    if (clients[ws.actualId].modules[opcode10id]) {
                        const module = clients[ws.actualId].modules[opcode10id].finalizeOpcode10(new Uint8Array(JSON.parse(opcode10data)));
                        ws.sendMessage(`opcode10 ${opcode10id} ${module}`);
                    }
                    break;
                case "altClosed":
                    const altId = msg.split(" ")[1];
                    if (clients[ws.actualId].modules[altId]) {
                        delete clients[ws.actualId].modules[altId];
                    }
                    gc();
                    break;
                case "changePassword":
                    if (!ws.verified) return;
                    const pswd = msg.split(" ")[1];
                    if (pswd && pswd.length <= 50 && socketServerPassword !== pswd) {
                        socketServerPassword = pswd;
                        console.log(`New socket server password: ${socketServerPassword}`);
                    }
                    break;
            }
        }
    });
    ws.onclose = () => {
        clients[ws.actualId].isActive = false;
        setTimeout(() => {
            if (!clients[ws.clientId].isActive) {
                for (let i in clients[ws.clientId].modules) {
                    delete clients[ws.clientId].modules[i];
                }
                delete clients[ws.clientId];
                gc();
            }
            if (clients[ws.actualId] && !clients[ws.actualId].isActive) {
                for (let i in clients[ws.actualId].modules) {
                    delete clients[ws.actualId].modules[i];
                }
                delete clients[ws.actualId];
                gc();
            }
        }, 15000);
    }
});

const wasmbuffers = fs.readFileSync("zombs_wasm.wasm");

const wasmmodule = () => {
    let uid = 0;
    function setHeaps() {
        const buffer = exportG.buffer;
        exports.HEAPU8 = HEAPU8 = new Uint8Array(buffer);
    }
    function instantiate(methods, callback) {
        WebAssembly.instantiate(wasmbuffers, methods).then((e) => {
            callback(e);
        });
    }
    function initializeInstance() {
        function asmInstanceCallback(asm) {
            exports.asm = asm.exports;
            exportG = exports.asm.g;
            exports.asm.h();
            exports.asm.i();
            setHeaps();
            Module.ready = true;
            if (Module.opcode5Callback) {
                Module.onDecodeOpcode5(Module.blended, Module.hostname, Module.opcode5Callback);
            }
            return exports.asm;
        }
        instantiate({ a: methods }, (asm) => {
            asmInstanceCallback(asm.instance);
        });
    }
    let exportG;
    let HEAPU8;
    const exports = {};
    const intCalc = function (heapu8, int) {
        for (var n = int; heapu8[n] && !(n >= NaN);) ++n;
        if (n - int > 0x10 && heapu8.buffer && decoder) return decoder.decode(heapu8.subarray(int, n));
        for (let finalInt = ""; int < n;) {
            let e = heapu8[int++];
            if (0x80 & e) {
                const j = 0x3f & heapu8[int++];
                if (0xc0 != (0xe0 & e)) {
                    const k = 0x3f & heapu8[int++];
                    if (e = 0xe0 == (0xf0 & e) ? (0xf & e) << 0xc | j << 0x6 | k : (0x7 & e) << 0x12 | j << 0xc | k << 0x6 | 0x3f & heapu8[int++], e < 0x10000) {
                        finalInt += String.fromCharCode(e);
                    } else {
                        const diff = e - 0x10000;
                        finalInt += String.fromCharCode(0xd800 | diff >> 0xa, 0xdc00 | 0x3ff & diff);
                    }
                } else {
                    finalInt += String.fromCharCode((0x1f & e) << 0x6 | j);
                }
            } else {
                finalInt += String.fromCharCode(e);
            }
        }
        return finalInt;
    }
    const intToStr = function (int) {
        return intCalc(HEAPU8, int);
    }
    const repeater = function (int) {
        return 0 | cstr(intToStr(int));
    }
    const getBufferDifference = function (ipAddress, buffer, bufferSize, undf) {
        if (!(undf > 0)) {
            return 0;
        }
        const byteSize = bufferSize;
        const int = bufferSize + undf - 1;
        for (let i = 0; i < ipAddress.length; ++i) {
            let charCode = ipAddress.charCodeAt(i);
            if (charCode >= 0xd800 && charCode <= 0xdfff) {
                const _charCode = ipAddress.charCodeAt(++i);
                charCode = 0x10000 + ((0x3ff & charCode) << 0xa) | 0x3ff & _charCode;
            }
            if (charCode <= 0x7f) {
                if (bufferSize >= int) break;
                buffer[bufferSize++] = charCode;
            } else {
                if (charCode <= 0x7ff) {
                    if (bufferSize + 0x1 >= int) break;
                    buffer[bufferSize++] = 0xc0 | charCode >> 0x6,
                    buffer[bufferSize++] = 0x80 | 0x3f & charCode;
                } else {
                    if (charCode <= 0xffff) {
                        if (bufferSize + 0x2 >= int) break;
                        buffer[bufferSize++] = 0xe0 | charCode >> 0xc,
                        buffer[bufferSize++] = 0x80 | charCode >> 0x6 & 0x3f,
                        buffer[bufferSize++] = 0x80 | 0x3f & charCode;
                    } else {
                        if (bufferSize + 0x3 >= int) break;
                        buffer[bufferSize++] = 0xf0 | charCode >> 0x12,
                        buffer[bufferSize++] = 0x80 | charCode >> 0xc & 0x3f,
                        buffer[bufferSize++] = 0x80 | charCode >> 0x6 & 0x3f,
                        buffer[bufferSize++] = 0x80 | 0x3f & charCode;
                    }
                }
            }
        }
        buffer[bufferSize] = 0;
        return bufferSize - byteSize;
    }
    const cstr = (str) => {
        if (str.startsWith('typeof window === "undefined" ? 1 : 0')) return 0;
        if (str.startsWith("typeof process !== 'undefined' ? 1 : 0")) return 0;
        if (str.startsWith("Game.currentGame.network.connected ? 1 : 0")) return 1;
        if (str.startsWith("Game.currentGame.network.connectionOptions.ipAddress")) return Module.hostname;
        if (str.startsWith("Game.currentGame.world.myUid === null ? 0 : Game.currentGame.world.myUid")) return ((uid++) ? 0 : 1);
        if (str.startsWith('document.getElementById("hud").children.length')) return 24;
    }
    const importB = function aFunction(int) {
        let ipAddress = cstr(intToStr(int));
        if (null == ipAddress) {
            return 0;
        }
        ipAddress += "";
        const func = aFunction;
        func.bufferSize = ipAddress.length + 1;
        func.buffer = asmL(func.bufferSize);
        getBufferDifference(ipAddress, HEAPU8, func.buffer, func.bufferSize);
        return func.buffer;
    }
    const methods = {
        "d": () => { },
        "f": () => { },
        "c": repeater,
        "e": () => { },
        "b": importB,
        "a": () => { }
    }
    initializeInstance();
    let asmL = function () {
        return (asmL = exports.asm.l).apply(null, arguments);
    }
    const Module = exports;
    Module.decodeBlendInternal = (blended) => {
        Module.asm.j(24, 132);
        const pos = Module.asm.j(228, 132);
        const extra = new Uint8Array(blended);
        for (let i = 0; i < 132; i++) {
            Module.HEAPU8[pos + i] = extra[i + 1];
        }
        Module.asm.j(172, 36);
        const index = Module.asm.j(4, 152);
        const arraybuffer = new ArrayBuffer(64);
        const list = new Uint8Array(arraybuffer);
        for (let i = 0; i < 64; i++) {
            list[i] = Module.HEAPU8[index + i];
        }
        return arraybuffer;
    }
    Module.onDecodeOpcode5 = (blended, hostname, callback) => {
        Module.blended = blended;
        Module.hostname = hostname;
        if (!Module.ready) {
            return (Module.opcode5Callback = callback);
        }
        Module.asm.j(255, 140);
        const decoded = Module.decodeBlendInternal(blended);
        const mcs = Module.asm.j(187, 22);
        const opcode6Data = [6];
        for (let i = 0; i < 16; i++) {
            opcode6Data.push(Module.HEAPU8[mcs + i]);
        }
        callback({ 5: decoded, 6: new Uint8Array(opcode6Data) });
    }
    Module.finalizeOpcode10 = (blended) => {
        const decoded = Module.decodeBlendInternal(blended);
        const list = new Uint8Array(decoded);
        const data = [10];
        for (let i = 0; i < decoded.byteLength; i++) {
            data.push(list[i]);
        }
        return new Uint8Array(data);
    }
    return Module;
}