const express = require("express");
const http = require("http");

// Criar servidor HTTP unificado
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 10000;

// Servir arquivos estáticos
app.use(express.static("public"));

// Rota principal
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/client.html");
});

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/client.html");
});

// ADICIONE ESTA LINHA:
app.get('/zombs_wasm.wasm', (req, res) => {
    res.sendFile(__dirname + '/zombs_wasm.wasm');
});

const WebSocket = require("ws");
const ByteBuffer = require("bytebuffer");
const fs = require("fs");
const { performance } = require("perf_hooks");

const { runInNewContext } = require("node:vm");
const { setFlagsFromString } = require("node:v8");
setFlagsFromString("--expose_gc");
const gc = runInNewContext("gc");

// ADICIONAR ISSO:
const wss = new WebSocket.Server({ server, path: '/ws', maxPayload: 65536 });

let connectionCounts = 0;
let sessionCounts = 0;
const connections = new Map();
const sessions = {};
const sessionsNames = {};
const sessions_1 = {};
const serversSessions = {};
const keys = {};

const itemCosts = {
    Pickaxe: { 2: 1000, 3: 3000, 4: 6000, 5: 8000, 6: 24000, 7: 90000 },
    Spear: { 1: 1400, 2: 2800, 3: 5600, 4: 11200, 5: 22500, 6: 45000, 7: 90000 },
    Bow: { 1: 100, 2: 400, 3: 2000, 4: 7000, 5: 24000, 6: 30000, 7: 90000 },
    Bomb: { 1: 100, 2: 400, 3: 3000, 4: 5000, 5: 24000, 6: 30000, 7: 90000 },
    ZombieShield: { 1: 1000, 2: 3000, 3: 7000, 4: 14000, 5: 18000, 6: 22000, 7: 24000, 8: 30000, 9: 45000, 10: 70000 }
}

const healTowerSet = new Set(["ArrowTower", "CannonTower", "BombTower", "MagicTower", "MeleeTower"]);
const wbSkipSet = new Set(["Door", "SlowTrap", "GoldStash"]);
const doorWallSlowSet = new Set(["Wall", "Door", "SlowTrap"]);
const wbYawSlipSet = new Set([44, 135, 225, 314]);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const encode = (e) => encoder.encode(e);
const decode = (e) => decoder.decode(e);

const sendSessions = () => {
    try {
        connections.forEach((e) => {
            if (e.type === "user") {
                e.send(encode(`sessions,  ;${JSON.stringify(sessionsNames)}`));
            }
        });
    } catch { };
}

const getSessionStatePayload = (session) => {
    const scripts = session && session.scripts ? session.scripts : {};
    const states = { ...scripts };
    const aliases = {
        autopetrevive: "petrevive",
        autopetevolve: "petevolve",
        autopetheal: "petheal",
        reverseplayertrick: "reversetrick",
        bossreverseplayertrick: "bossreverse",
        tokenreverseplayertrick: "tokenreverse",
        revert: "reverttowers"
    }
    for (const key in aliases) {
        states[aliases[key]] = !!scripts[key];
    }
    return states;
}

const sendSessionStates = (ws, session) => {
    try {
        if (!ws || ws.readyState !== 1 || !session || !sessions[session.userId]) return;
        ws.send(encode(`sessionstates,  ;${JSON.stringify(getSessionStatePayload(session))}`));
    } catch { };
}

let lastCpuUsage = process.cpuUsage();
let lastCpuCheck = process.hrtime.bigint();
let lastCpuPercent = 0;

const getCpuPercent = () => {
    const now = process.hrtime.bigint();
    const usage = process.cpuUsage();
    const elapsedMicros = Number(now - lastCpuCheck) / 1000;
    if (elapsedMicros < 250000) {
        return lastCpuPercent;
    }
    const usedMicros = (usage.user - lastCpuUsage.user) + (usage.system - lastCpuUsage.system);
    lastCpuUsage = usage;
    lastCpuCheck = now;
    lastCpuPercent = elapsedMicros > 0 ? Math.max(0, Math.min(100, usedMicros / elapsedMicros * 100)) : lastCpuPercent;
    return lastCpuPercent;
}

const getSessionStats = (session) => {
    const memory = process.memoryUsage();
    return {
        cpuPercent: Math.round(getCpuPercent() * 10) / 10,
        memoryMb: Math.round(memory.rss / 104857.6) / 10,
        heapUsedMb: Math.round(memory.heapUsed / 104857.6) / 10,
        heapTotalMb: Math.round(memory.heapTotal / 104857.6) / 10,
        processUptimeSeconds: Math.round(process.uptime()),
        sessionUptimeMs: session && session.uptime ? Date.now() - session.uptime : null,
        zombsPingMs: session && session.lastPingMs !== undefined ? session.lastPingMs : null,
        serverId: session ? session.serverId : null,
        sessionsCount: Object.keys(sessions_1).length,
        connected: !!(session && session.ws && session.ws.readyState === 1)
    }
}

const sendSessionStats = (ws, session, probePing = true) => {
    try {
        if (!ws || ws.readyState !== 1) return;
        ws.send(encode(`sessionstats,  ;${JSON.stringify(getSessionStats(session))}`));
    } catch { };
    try {
        if (probePing && session && !session.pingTest && session.ws && session.ws.readyState === 1) {
            session.pingTest = true;
            session.pingNotify = false;
            session.time = performance.now();
            session.sendPacket(9, { name: "MakeBuilding", x: -9, y: -9, type: "GoldStash", yaw: 0 });
        }
    } catch { };
}

let salt = "=vo}+NpP,!zAsZT]NzXM1X,73Of'Jiff-K[o921DYFjoeF3ICv";

wss.on("connection", (ws) => {
    let hasAccess = false;
    ws.sendMessage = (m) => {
        try {
            if (ws.readyState === 1) {
                ws.send(encode(m));
            }
        } catch { };
    }
    ws.on("close", () => {
        if (ws.id) connections.delete(ws.id);
    });
    ws.on("message", (m) => {
        try {
            let x = new Uint8Array(m);
            if (!hasAccess && x.length > 0) {
                const msg = decode(m);
                if (!msg) {
                    ws.close();
                    return;
                }
                const args = msg.split(",  ;");
                if (args[0] === "salt" && args[1] === salt) {
                    hasAccess = true;
                    ws.id = ++connectionCounts;
                    connections.set(ws.id, ws);
                    ws.sendMessage("accesssuccess");
                    ws.sendMessage(`prfpsks,  ;${Object.keys(keys)}`);
                    return;
                }
                ws.close();
                return;
            }
            if (!hasAccess) return;
            const session = sessions_1[ws.sessionConnectedToId];
            const session_ = sessions[ws.sessionConnectedToId];
            if (x[0] === 1 && ws.isVerified && session) {
                x = x.slice(1);
                const opcode = x[0];
                if (opcode === 9) {
                    const data = session.codec.decode(x);
                    if (data.name === "BuyItem" && data.response.tier === 1) {
                        if (data.response.itemName === "PetCARL" || data.response.itemName === "PetMiner") return;
                        if (data.response.itemName === "Pickaxe" && session.inventory.Pickaxe) return;
                        if (data.response.itemName === "Spear" && session.inventory.Spear) return;
                        if (data.response.itemName === "Bow" && session.inventory.Bow) return;
                        if (data.response.itemName === "Bomb" && session.inventory.Bomb) return;
                    }
                    if (data.name === "SetPartyName" && !(encode(data.response.partyName).length <= 49)) return;
                    if (data.name === "SendChatMessage" && !(encode(data.response.message).length <= 249)) return;
                }
                session.ws.send(x);
                return;
            }
            if (x[0] === 2 && ws.isVerified) {
                if (!session) return;
                if (session.ws.readyState === 1) {
                    session.ws.send(x.slice(1));
                }
                return;
            }
            const msg = decode(m);
            if (msg) {
                const args = msg.split(",  ;");
                switch (msg.split(" ")[0].replaceAll(",", "")) {
                    case "user":
                        ws.sendMessage(`id,  ;${ws.id}`);
                        ws.sendMessage(`sessions,  ;${JSON.stringify(sessionsNames)}`);
                        ws.type = "user";
                        break;
                    case "getsessions":
                        ws.sendMessage(`sessions,  ;${JSON.stringify(sessionsNames)}`);
                        break;
                    case "getsessionstates":
                        if (!session) return;
                        sendSessionStates(ws, session);
                        break;
                    case "getsessionstats":
                        if (!session) return;
                        sendSessionStats(ws, session);
                        break;
                    case "changehasaccess":
                        if (!args[1]) return;
                        if (args[1].length <= 50 && salt !== args[1]) {
                            salt = args[1];
                            console.log(`New session saver password: ${salt}`);
                        }
                        break;
                    case "esrf":
                        if (!args[1]) return;
                        serverMap.get(args[1]).filler = true;
                        break;
                    case "dsrf":
                        if (!args[1]) return;
                        serverMap.get(args[1]).filler = false;
                        break;
                    case "earc":
                        if (!args[1]) return;
                        serverMap.get(args[1]).autoReconnect = true;
                        break;
                    case "darc":
                        if (!args[1]) return;
                        serverMap.get(args[1]).autoReconnect = false;
                        clearReconnectState(args[1]);
                        break;
                    case "eabi":
                        if (!args[1] || !args[2] || !args[3] || !args[4]) return;
                        serverMap.get(args[1]).autoBreakIn = true;
                        serverMap.get(args[1]).abiSessionName = args[2];
                        serverMap.get(args[1]).abiName = args[3];
                        serverMap.get(args[1]).abiPsk = args[4];
                        break;
                    case "dabi":
                        if (!args[1]) return;
                        serverMap.get(args[1]).autoBreakIn = false;
                        break;
                    case "eafr":
                        if (!args[1]) return;
                        serverMap.get(args[1]).autoFarm = true;
                        break;
                    case "dafr":
                        if (!args[1]) return;
                        serverMap.get(args[1]).autoFarm = false;
                        break;
                    case "eafp":
                        if (!args[1]) return;
                        serverMap.get(args[1]).partyFiller = true;
                        break;
                    case "dafp":
                        if (!args[1]) return;
                        serverMap.get(args[1]).partyFiller = false;
                        break;
                    case "addafpsk":
                        if (!args[1] || !args[2] || args[1].length !== 20) return;
                        serverMap.get(args[2]).keys[args[1]] = true;
                        keys[`${args[2]}/${args[1]}`] = true;
                        break;
                    case "removeafpsk":
                        if (!args[1] || !args[2]) return;
                        delete serverMap.get(args[2]).keys[args[1]];
                        delete keys[`${args[2]}/${args[1]}`];
                        break;
                }
                if (ws.type === "user") {
                    switch (msg.split(" ")[0].replaceAll(",", "")) {
                        case "verify":
                            const sid = parseInt(args[1]);
                            if (!sessions[sid]) return;
                            if (session_ && session_[ws.id]) {
                                delete session_[ws.id];
                            }
                            ws.sessionConnectedToId = sid;
                            ws.isVerified = false;
                            sessions[sid][ws.id] = ws.id;
                            sendSessions();
                            if (!sessions[sid]) return;
                            for (let i in sessions[sid]) {
                                const ws = connections.get(sessions[sid][i]);
                                if (!ws.isVerified) {
                                    ws.send(encode(`verifydata,  ;${JSON.stringify(sessions_1[sid].getSyncNeeds())}`));
                                    ws.isVerified = true;
                                    sendSessionStates(ws, sessions_1[sid]);
                                    sendSessionStats(ws, sessions_1[sid]);
                                }
                            }
                            break;
                    }
                    if (ws.isVerified) {
                        switch (msg.split(" ")[0].replaceAll(",", "")) {
                            case "packet":
                                const args = msg.split(",  ;");
                                if (!session) return;
                                const opcode = parseInt(args[1]);
                                const data = JSON.parse(args.slice(2).join(",  ;"));
                                if (opcode === 9) {
                                    if (data.name === "BuyItem" && data.tier === 1) {
                                        if (data.itemName === "PetCARL" || data.itemName === "PetMiner") return;
                                        if (data.itemName === "Pickaxe" && session.inventory.Pickaxe) return;
                                        if (data.itemName === "Spear" && session.inventory.Spear) return;
                                        if (data.itemName === "Bow" && session.inventory.Bow) return;
                                        if (data.itemName === "Bomb" && session.inventory.Bomb) return;
                                    }
                                    if (data.name === "SetPartyName" && !(encode(data.partyName).length <= 49)) return;
                                    if (data.name === "SendChatMessage" && !(encode(data.message).length <= 249)) return;
                                }
                                session.sendPacket(opcode, data);
                                break;
                            case "buffer":
                                if (!session || session.ws.readyState !== 1) return;
                                session.ws.send(new Uint8Array(JSON.parse(args[1])));
                                break;
                        }
                    }
                    switch (msg.split(" ")[0].replaceAll(",", "")) {
                        case "createsession":
                            const sessionName = args[1] ? args[1].slice(0, 20) : null;
                            const name = args[2] || "";
                            const sid = args[3];
                            const psk = args[4];
                            new Bot(sessionName, name, sid, psk, false);
                            break;
                        case "eab":
                            if (!session || !session.gs) return;
                            session.scripts.autobuild = true;
                            session.inactiveRebuilder.forEach((e, t) => session.inactiveRebuilder.delete(t));
                            session.rebuilder.forEach((e, t) => session.rebuilder.delete(t));
                            for (const b of session.buildings.values()) {
                                session.rebuilder.set((b.x - session.gs.x) / 24 + (b.y - session.gs.y) / 24 * 1000, [(b.x - session.gs.x) / 24, (b.y - session.gs.y) / 24, b.type, (session.entities.get(b.uid) ? session.entities.get(b.uid).targetTick.yaw : 0)]);
                            }
                            break;
                        case "dab":
                            if (!session) return;
                            session.scripts.autobuild = false;
                            session.inactiveRebuilder.forEach((e, t) => session.inactiveRebuilder.delete(t));
                            session.rebuilder.forEach((e, t) => session.rebuilder.delete(t));
                            break;
                        case "eau":
                            if (!session || !session.gs) return;
                            session.scripts.autoupgrade = true;
                            session.inactiveReupgrader.forEach((e, t) => session.inactiveReupgrader.delete(t));
                            session.reupgrader.forEach((e, t) => session.reupgrader.delete(t));
                            for (const b of session.buildings.values()) {
                                session.reupgrader.set((b.x - session.gs.x) / 24 + (b.y - session.gs.y) / 24 * 1000, [(b.x - session.gs.x) / 24, (b.y - session.gs.y) / 24, b.tier]);
                            }
                            break;
                        case "dau":
                            if (!session) return;
                            session.scripts.autoupgrade = false;
                            session.inactiveReupgrader.forEach((e, t) => session.inactiveReupgrader.delete(t));
                            session.reupgrader.forEach((e, t) => session.reupgrader.delete(t));
                            break;
                        case "eatb":
                            if (!session) return;
                            session.scripts.autobow = true;
                            break;
                        case "datb":
                            if (!session) return;
                            session.scripts.autobow = false;
                            break;
                        case "eaa":
                            if (!session) return;
                            session.scripts.autoaim = true;
                            break;
                        case "daa":
                            if (!session) return;
                            session.scripts.autoaim = false;
                            break;
                        case "eapr":
                            if (!session) return;
                            session.scripts.autopetrevive = true;
                            break;
                        case "dapr":
                            if (!session) return;
                            session.scripts.autopetrevive = false;
                            break;
                        case "eape":
                            if (!session) return;
                            session.scripts.autopetevolve = true;
                            break;
                        case "dape":
                            if (!session) return;
                            session.scripts.autopetevolve = false;
                            break;
                        case "eaph":
                            if (!session) return;
                            session.scripts.autopetheal = true;
                            break;
                        case "daph":
                            if (!session) return;
                            session.scripts.autopetheal = false;
                            break;
                        case "eaaz":
                            if (!session) return;
                            session.scripts.autoaimzombies = true;
                            break;
                        case "daaz":
                            if (!session) return;
                            session.scripts.autoaimzombies = false;
                            break;
                        case "eaad":
                            if (!session) return;
                            session.scripts.autoaimdemons = true;
                            break;
                        case "daad":
                            if (!session) return;
                            session.scripts.autoaimdemons = false;
                            break;
                        case "ept":
                            if (!session) return;
                            session.scripts.playertrick = true;
                            session.playerTrickPsk = session.psk;
                            break;
                        case "dpt":
                            if (!session) return;
                            session.scripts.playertrick = false;
                            break;
                        case "erpt":
                            if (!session) return;
                            session.scripts.reverseplayertrick = true;
                            session.playerTrickPsk = session.psk;
                            break;
                        case "drpt":
                            if (!session) return;
                            session.scripts.reverseplayertrick = false;
                            break;
                        case "ebrpt":
                            if (!session) return;
                            session.scripts.bossreverseplayertrick = true;
                            session.playerTrickPsk = session.psk;
                            break;
                        case "dbrpt":
                            if (!session) return;
                            session.scripts.bossreverseplayertrick = false;
                            break;
                        case "etrpt":
                            if (!session) return;
                            session.scripts.tokenreverseplayertrick = true;
                            session.playerTrickPsk = session.psk;
                            break;
                        case "dtrpt":
                            if (!session) return;
                            session.scripts.tokenreverseplayertrick = false;
                            break;
                        case "eahrc":
                            if (!session) return;
                            session.scripts.ahrc = true;
                            break;
                        case "dahrc":
                            if (!session) return;
                            session.scripts.ahrc = false;
                            break;
                        case "eua":
                            if (!session) return;
                            session.scripts.upgradeall = true;
                            break;
                        case "dua":
                            if (!session) return;
                            session.scripts.upgradeall = false;
                            break;
                        case "esa":
                            if (!session) return;
                            session.scripts.sellall = true;
                            break;
                        case "dsa":
                            if (!session) return;
                            session.scripts.sellall = false;
                            break;
                        case "euth":
                            if (!session) return;
                            session.scripts.upgradetowerhealth = true;
                            break;
                        case "duth":
                            if (!session) return;
                            session.scripts.upgradetowerhealth = false;
                            break;
                        case "eth":
                            if (!session) return;
                            session.scripts.towerheal = true;
                            break;
                        case "dth":
                            if (!session) return;
                            session.scripts.towerheal = false;
                            break;
                        case "eat":
                            if (!session) return;
                            session.scripts.autotimeout = true;
                            break;
                        case "dat":
                            if (!session) return;
                            session.scripts.autotimeout = false;
                            break;
                        case "epl":
                            if (!session) return;
                            session.scripts.positionlock = true;
                            break;
                        case "dpl":
                            if (!session) return;
                            session.scripts.positionlock = false;
                            break;
                        case "lock":
                            if (!session) return;
                            session.lockPos = { x: session.myPlayer ? session.myPlayer.position.x : 12000, y: session.myPlayer ? session.myPlayer.position.y : 12000 };
                            break;
                        case "epf":
                            if (!session) return;
                            session.scripts.autofollow = true;
                            session.shouldFollow = true;
                            break;
                        case "dpf":
                            if (!session) return;
                            session.scripts.autofollow = false;
                            break;
                        case "eaar":
                            if (!session || !session.gs) return;
                            session.scripts.antiarrow = true;
                            session.antiArrowBuildings = {};
                            let antiArrowCounter = 0;
                            for (const e of session.buildings.values()) {
                                session.antiArrowBuildings[antiArrowCounter++] = { x: e.x, y: e.y, type: e.type };
                            }
                            break;
                        case "daar":
                            if (!session) return;
                            session.scripts.antiarrow = false;
                            session.antiArrowBuildings = {};
                            break;
                        case "erev":
                            if (!session || !session.gs) return;
                            session.scripts.revert = true;
                            session.revertBuildings = {};
                            let revertCounter = 0;
                            for (const e of session.buildings.values()) {
                                if (e.type !== "GoldStash" && e.tier < session.gs.tier) {
                                    session.revertBuildings[revertCounter++] = { x: e.x, y: e.y, tier: e.tier, nearestEnemy: null, nearestEnemyDistance: Infinity };
                                }
                            }
                            break;
                        case "drev":
                            if (!session) return;
                            session.scripts.revert = false;
                            session.revertBuildings = {};
                            break;
                        case "erit":
                            if (!session) return;
                            session.scripts.returnitems = true;
                            session.maxPickTier = null;
                            session.maxSpearTier = null;
                            session.maxBowTier = null;
                            session.maxBombTier = null;
                            session.maxShieldTier = null;
                            break;
                        case "drit":
                            if (!session) return;
                            session.scripts.returnitems = false;
                            break;
                        case "eaws":
                            if (!session) return;
                            session.scripts.autoweaponswitch = true;
                            break;
                        case "daws":
                            if (!session) return;
                            session.scripts.autoweaponswitch = false;
                            break;
                        case "2lock":
                            if (!session) return;
                            session.secondLockPos = { x: session.myPlayer ? session.myPlayer.position.x : 12000, y: session.myPlayer ? session.myPlayer.position.y : 12000 };
                            break;
                        case "eatm":
                            if (!session) return;
                            session.scripts.automove = true;
                            break;
                        case "datm":
                            if (!session) return;
                            session.scripts.automove = false;
                            break;
                        case "alock":
                            if (!session) return;
                            session.aimLock = session.myPlayer ? session.myPlayer.aimingYaw : 90;
                            break;
                        case "eal":
                            if (!session) return;
                            session.scripts.aimlock = true;
                            break;
                        case "dal":
                            if (!session) return;
                            session.scripts.aimlock = false;
                            break;
                        case "esp":
                            if (!session) return;
                            session.scripts.chatspam = true;
                            break;
                        case "dsp":
                            if (!session) return;
                            session.scripts.chatspam = false;
                            break;
                        case "hor":
                            if (!session) return;
                            session.xAxis = "y";
                            session.yAxis = "x";
                            break;
                        case "ver":
                            if (!session) return;
                            session.xAxis = "x";
                            session.yAxis = "y";
                            break;
                        case "wlock1":
                            if (!session || !session.gs) return;
                            for (const e of session.buildings.values()) {
                                if (session.myPlayer && Math.hypot(e.x - session.myPlayer.position.x, e.y - session.myPlayer.position.y) < 24) {
                                    session.position1 = { x: e.x, y: e.y };
                                }
                            }
                            break;
                        case "wlock2":
                            if (!session || !session.gs) return;
                            for (const e of session.buildings.values()) {
                                if (session.myPlayer && Math.hypot(e.x - session.myPlayer.position.x, e.y - session.myPlayer.position.y) < 24) {
                                    session.position2 = { x: e.x, y: e.y };
                                }
                            }
                            break;
                        case "ewb":
                            if (!session) return;
                            session.scripts.wallbounce = true;
                            break;
                        case "dwb":
                            if (!session) return;
                            session.scripts.wallbounce = false;
                            break;
                        case "eacz":
                            if (!session) return;
                            session.scripts.autoclearzombies = true;
                            session.getBow = false;
                            session.getSpear = false;
                            session.getMaxBow = false;
                            break;
                        case "dacz":
                            if (!session) return;
                            session.scripts.autoclearzombies = false;
                            break;
                        case "easl":
                            if (!session) return;
                            session.scripts.autosell = true;
                            break;
                        case "dasl":
                            if (!session) return;
                            session.scripts.autosell = false;
                            break;
                        case "uptime":
                            if (!session || !session.uptime) return;
                            ws.sendMessage(`uptime,  ;${session.uptime}`);
                            break;
                        case "ping":
                            if (!session) return;
                            session.pingTest = true;
                            session.pingNotify = false;
                            session.time = performance.now();
                            session.sendPacket(9, { name: "MakeBuilding", x: -9, y: -9, type: "GoldStash", yaw: 0 });
                            break;
                        case "closesession":
                            if (!sessions_1[args[1]]) return;
                            sessions_1[args[1]].isClosed = true;
                            sessions_1[args[1]].ws.send(0);
                            break;
                        case "changesessionname":
                            if (!sessionsNames[args[1]]) return;
                            sessionsNames[args[1]].sessionName = (args[2] && args[2].slice(0, 20)) || "Session";
                            sendSessions();
                            break;
                        case "changesessionid":
                            if (!sessionsNames[args[1]]) return;
                            sessionsNames[args[1]].sessionUserId = parseInt(args[2]);
                            sendSessions();
                            break;
                    }
                }
            }
        } catch { };
    });
    ws.on("error", () => { });
    ws.on("close", () => {
        if (!hasAccess) return;
        const session_ = sessions[ws.sessionConnectedToId];
        connections.delete(ws.id);
        if (!session_ || !session_[ws.id]) return;
        delete session_[ws.id];
    });
});

wss.on("error", () => { });

class Scripts {
    constructor() {
        this.autobuild = false;
        this.autoupgrade = false;
        this.autobow = false;
        this.autoaim = false;
        this.autopetrevive = false;
        this.autopetevolve = false;
        this.autopetheal = false;
        this.autoaimzombies = false;
        this.autoaimdemons = false;
        this.playertrick = false;
        this.reverseplayertrick = false;
        this.bossreverseplayertrick = false;
        this.tokenreverseplayertrick = false;
        this.ahrc = false;
        this.upgradeall = false;
        this.sellall = false;
        this.upgradetowerhealth = false;
        this.towerheal = false;
        this.autotimeout = false;
        this.positionlock = false;
        this.autofollow = false;
        this.antiarrow = false;
        this.revert = false;
        this.returnitems = false;
        this.autoweaponswitch = false;
        this.automove = false;
        this.aimlock = false;
        this.chatspam = false;
        this.wallbounce = false;
        this.autoclearzombies = false;
        this.autosell = false;
    }
}

class Bot {
    constructor(sessionName = null, name = "", sid = "", psk = "", pt = false) {
        if (!sid || !serverMap.get(sid)) return;
        if ((serversSessions[sid]?.size ?? 0) >= RECONNECT_MAX_WS) return;
        if (serversSessions[sid]) {
            serversSessions[sid].forEach((ws) => {
                if (ws.readyState === 2 || ws.readyState === 3) {
                    ws.close();
                    serversSessions[sid].delete(ws);
                }
            });
        }
        this.ws = new WebSocket(`wss://${serverMap.get(sid).host}`, { headers: { "Origin": "", "User-Agent": "" } });
        this.ws.binaryType = "arraybuffer";
        this.ws.onclose = () => {
            if (serversSessions[this.serverId]) {
                serversSessions[this.serverId].delete(this.ws);
                if (serversSessions[this.serverId].size === 0) {
                    delete serversSessions[this.serverId];
                }
            }
            const srv = serverMap.get(this.serverId);
            const autoRc = !!(srv && srv.autoReconnect);
            if (this.Module) {
                delete this.Module;
            }
            if (this.hasVerified && sessions_1[this.userId] === this) {
                delete sessions[this.userId];
                delete sessions_1[this.userId];
                delete sessionsNames[this.userId];
                gc();
                sendSessions();
            }
            if (!this.isClosed && this.hasVerified && autoRc) {
                enqueueReconnect(this);
            }
        }
        this.ws.onerror = () => { };
        this.ws.onmessage = this.onMessage.bind(this);
        this.serverId = sid;
        if (!serversSessions[this.serverId]) {
            serversSessions[this.serverId] = new Set();
        }
        serversSessions[this.serverId].add(this.ws);
        this.uid = 0;
        this.psk = psk;
        this.playerTrickPsk = pt ? psk : null;
        this.hasFarmed = false;
        this.tick = 0;
        this.name = name;
        this.messages = [];
        this.buildings = new Map();
        this.buildingsByIndex = new Map();
        this.inventory = {};
        this.upgradeTicks = 0;
        this.bounceTicks = 0;
        this.followTicks = 0;
        this.antiArrowTicks = 0;
        this.bowTicks = 0;
        this.bombTicks = 0;
        this.spearTicks = 0;
        this.buildingUids_1 = {};
        this.antiArrowBuildings = {};
        this.revertBuildings = {};
        this.position1 = {};
        this.position2 = {};
        this.entities = new Map();
        this.rebuilder = new Map();
        this.harvesters = new Map();
        this.reupgrader = new Map();
        this.positions = new Map();
        this.codec = new BinCodec();
        this.scripts = new Scripts();
        this.scripts.playertrick = pt;
        this.sessionName = sessionName;
        this.inactiveRebuilder = new Map();
        this.inactiveReupgrader = new Map();
        this.dayCycle = { cycleStartTick: 100, nightEndTick: 0, dayEndTick: 1300, isDay: 1 };
        this.spamMessage = "W".repeat(249);
        this.harvesterTicks = [
            { tick: 0, resetTick: 31, deposit: 0.4, tier: 1 },
            { tick: 0, resetTick: 29, deposit: 0.6, tier: 2 },
            { tick: 0, resetTick: 27, deposit: 0.7, tier: 3 },
            { tick: 0, resetTick: 24, deposit: 1, tier: 4 },
            { tick: 0, resetTick: 22, deposit: 1.2, tier: 5 },
            { tick: 0, resetTick: 20, deposit: 1.2, tier: 6 },
            { tick: 0, resetTick: 18, deposit: 2.4, tier: 7 },
            { tick: 0, resetTick: 16, deposit: 3, tier: 8 }
        ]
    }
    sendPacket(event, data) {
        if (this.ws.readyState === 1) {
            this.ws.send(this.codec.encode(event, data));
        }
    }
    sendData(data) {
        if (!sessions[this.userId]) return;
        for (let i in sessions[this.userId]) {
            const ws = connections.get(sessions[this.userId][i]);
            if (!ws.isVerified || ws.readyState !== 1) return;
            ws.send(data);
        }
    }
    onMessage(msg) {
        const m = new Uint8Array(msg.data);
        const opcode = m[0];
        let data;
        try {
            data = this.codec.decode(msg.data);
        } catch { };
        switch (opcode) {
            case 0:
                this.onEntitiesUpdateHandler(data);
                this.sendData(msg.data);
                if (this.hasVerified) return;
                this.userId = ++sessionCounts;
                sessions[this.userId] = {};
                sessionsNames[this.userId] = { sessionName: this.sessionName || "Session", sessionUserId: this.userId, actualUserId: this.userId };
                sessions_1[this.userId] = this;
                sendSessions();
                this.hasVerified = true;
                break;
            case 4:
                this.onEnterWorldHandler(data);
                break;
            case 5:
                if (!this.Module) this.Module = wasmmodule();
                if (!this.Module) return;
                this.Module.onDecodeOpcode5(m, serverMap.get(this.serverId).hostname, decodedOpcode5 => {
                    this.sendPacket(4, { displayName: this.name, extra: decodedOpcode5[5] });
                    this.enterworld2 = decodedOpcode5[6];
                });
                break;
            case 9:
                this.onRpcUpdateHandler(data);
                this.sendData(msg.data);
                break;
            case 10:
                if (!this.Module) return;
                this.ws.send(this.Module.finalizeOpcode10(m));
                break;
        }
    }
    onEntitiesUpdateHandler(data) {
        this.tick = data.tick;
        for (let i = 0; i < data.removedEntitiesArr.length; i++) {
            this.entities.delete(data.removedEntitiesArr[i]);
        }
        for (let i = 0; i < data.entities.length; i++) {
            const entity = data.entities[i];
            let entity_1 = this.entities.get(entity.uid);
            if (!entity_1) {
                entity_1 = { uid: entity.uid, targetTick: { uid: entity.uid }, model: null };
                this.entities.set(entity.uid, entity_1);
            }
            for (let j = 0; j < entity.updates.length; j += 2) {
                entity_1.targetTick[entity.updates[j]] = entity.updates[j + 1];
            }
            if (entity_1.targetTick.model) entity_1.model = entity_1.targetTick.model;
        }
        this.myPlayer = this.entities.get(this.uid) && this.entities.get(this.uid).targetTick;
        this.myPet = this.myPlayer && this.entities.get(this.myPlayer.petUid) && this.entities.get(this.myPlayer.petUid).targetTick;
        this.nearestPlayer = null;
        this.nearestZombie = null;
        this.nearestDemon = null;
        this.nearestEnemy = null;
        this.nearestPlayerDistance = Infinity;
        this.nearestZombieDistance = Infinity;
        this.nearestDemonDistance = Infinity;
        this.nearestEnemyDistance = Infinity;
        this.upgradeTicks = ++this.upgradeTicks % 10;
        for (let i in this.revertBuildings) {
            const e = this.revertBuildings[i];
            e.nearestEnemy = null;
            e.nearestEnemyDistance = Infinity;
        }
        this.entities.forEach((entity, uid) => {
            if (this.myPlayer && !this.hasFarmed && !this.gs) {
                if (!this.scripts.autopetrevive) {
                    this.scripts.autopetrevive = true;
                }
                if (!this.petActivated) {
                    this.sendPacket(9, { name: "EquipItem", itemName: "PetMiner", tier: 1 });
                }
                if (entity.targetTick.model && ["Tree", "Stone"].includes(entity.targetTick.model) && this.petActivated) {
                    const pos = entity.targetTick.position;
                    if (pos) {
                        const entityX = pos.x;
                        const entityY = pos.y;
                        const aim = Math.floor((Math.atan2(entityY - this.myPlayer.position.y, entityX - this.myPlayer.position.x) * 180 / Math.PI + 450) % 360) || 0;
                        this.lockPos = { x: entityX, y: entityY };
                        if (!this.scripts.positionlock) {
                            this.scripts.positionlock = true;
                        }
                        if (Math.hypot(entityX - this.myPlayer.position.x, entityY - this.myPlayer.position.y) < (uid <= 400 ? 120 : 96)) {
                            this.sendPacket(3, { mouseDown: aim });
                        }
                        if (this.myPlayer.wood > 0 || this.myPlayer.stone > 0) {
                            this.scripts.positionlock = false;
                            this.scripts.autopetrevive = false;
                            this.lockPos = undefined;
                            this.hasFarmed = true;
                            this.sendPacket(3, { up: 0, left: 0, down: 0, right: 0 });
                            this.sendPacket(3, { mouseUp: 1 });
                        }
                    }
                }
            }
            if (this.scripts.autoaim || this.scripts.autofollow || this.scripts.autoweaponswitch) {
                if (entity.targetTick.model === "GamePlayer" && entity.targetTick.uid !== this.myPlayer.uid && entity.targetTick.partyId !== this.myPlayer.partyId && !entity.targetTick.dead) {
                    const distance = Math.hypot(entity.targetTick.position.x - this.myPlayer.position.x, entity.targetTick.position.y - this.myPlayer.position.y);
                    if (this.nearestPlayerDistance > distance) {
                        this.nearestPlayerDistance = distance;
                        this.nearestPlayer = { x: entity.targetTick.position.x, y: entity.targetTick.position.y, yaw: entity.targetTick.yaw };
                    }
                }
            }
            if (this.scripts.autoaimzombies) {
                if (entity.targetTick.model.startsWith("Zombie") && !entity.targetTick.dead) {
                    const distance = Math.hypot(entity.targetTick.position.x - this.myPlayer.position.x, entity.targetTick.position.y - this.myPlayer.position.y);
                    if (this.nearestZombieDistance > distance) {
                        this.nearestZombieDistance = distance;
                        this.nearestZombie = { x: entity.targetTick.position.x, y: entity.targetTick.position.y };
                    }
                }
            }
            if (this.scripts.autoaimdemons) {
                if (entity.targetTick.model.startsWith("NeutralTier") && !entity.targetTick.dead) {
                    const distance = Math.hypot(entity.targetTick.position.x - this.myPlayer.position.x, entity.targetTick.position.y - this.myPlayer.position.y);
                    if (this.nearestDemonDistance > distance) {
                        this.nearestDemonDistance = distance;
                        this.nearestDemon = { x: entity.targetTick.position.x, y: entity.targetTick.position.y };
                    }
                }
            }
            if (this.scripts.antiarrow || this.scripts.revert) {
                if (["GamePlayer", "PetCARL", "PetMiner", "NeutralTier1"].includes(entity.targetTick.model) && entity.targetTick.uid !== this.myPlayer.uid && entity.targetTick.partyId !== this.myPlayer.partyId && !entity.targetTick.dead) {
                    if (this.scripts.antiarrow) {
                        const distance = Math.hypot(entity.targetTick.position.x - this.myPlayer.position.x, entity.targetTick.position.y - this.myPlayer.position.y);
                        if (this.nearestEnemyDistance > distance) {
                            this.nearestEnemyDistance = distance;
                            this.nearestEnemy = { x: entity.targetTick.position.x, y: entity.targetTick.position.y };
                        }
                    }
                    if (this.scripts.revert) {
                        for (let i in this.revertBuildings) {
                            const e = this.revertBuildings[i];
                            const distance = Math.hypot(entity.targetTick.position.x - e.x, entity.targetTick.position.y - e.y);
                            if (e.nearestEnemyDistance > distance) {
                                e.nearestEnemyDistance = distance;
                                e.nearestEnemy = { x: entity.targetTick.position.x, y: entity.targetTick.position.y };
                            }
                        }
                    }
                }
            }
        });
        const userCount = !!Object.keys(sessions[this.userId] || {}).length;
        if (!userCount && this.myPlayer) {
            if ((this.gs || !this.hasFarmed) && this.myPlayer.dead) {
                this.sendPacket(3, { respawn: 1 });
            }
            if (this.myPlayer.health > 0 && this.myPlayer.health / 5 <= 20) {
                if (!this.healTimeout_1 && this.inventory.HealthPotion) {
                    this.healTimeout_1 = true;
                    this.sendPacket(9, { name: "EquipItem", itemName: "HealthPotion", tier: 1 });
                    this.sendPacket(9, { name: "BuyItem", itemName: "HealthPotion", tier: 1 });
                }
            } else {
                if (this.healTimeout_1) {
                    this.healTimeout_1 = false;
                }
            }
        }
        if (!userCount && !this.inventory.HealthPotion) {
            this.sendPacket(9, { name: "BuyItem", itemName: "HealthPotion", tier: 1 });
        }
        if ((!userCount || this.scripts.autopetheal) && this.myPet) {
            if ((this.myPet.health / this.myPet.maxHealth) * 100 <= 70) {
                this.sendPacket(9, { name: "BuyItem", itemName: "PetHealthPotion", tier: 1 });
                this.sendPacket(9, { name: "EquipItem", itemName: "PetHealthPotion", tier: 1 });
            }
        }
        if (this.myPet && !this.petActivated) {
            this.petActivated = true;
        }
        if (this.scripts.autobow) {
            if (this.hasStopped) {
                this.hasStopped = false;
            }
            if (this.scripts.antiarrow) {
                if (this.nearestEnemy) {
                    ++this.antiArrowTicks;
                    if (this.antiArrowTicks >= 10) {
                        if ((this.scripts.autoaim && this.nearestPlayer) || (this.scripts.autoaimzombies && this.nearestZombie) || (this.scripts.autoaimdemons && this.nearestDemon)) {
                            if (this.scripts.autoaim && this.nearestPlayer) {
                                const aim = Math.floor((Math.atan2(this.nearestPlayer.y - this.myPlayer.position.y, this.nearestPlayer.x - this.myPlayer.position.x) * 180 / Math.PI + 450) % 360) || 0;
                                if (this.myPlayer.weaponName !== "Bow") {
                                    this.sendPacket(3, { mouseDown: aim });
                                } else {
                                    this.sendPacket(3, { mouseMoved: aim });
                                    this.sendPacket(3, { space: 0 });
                                    this.sendPacket(3, { space: 1 });
                                }
                            }
                            if (this.scripts.autoaimzombies && this.nearestZombie) {
                                const aim = Math.floor((Math.atan2(this.nearestZombie.y - this.myPlayer.position.y, this.nearestZombie.x - this.myPlayer.position.x) * 180 / Math.PI + 450) % 360) || 0;
                                if (this.myPlayer.weaponName !== "Bow") {
                                    this.sendPacket(3, { mouseDown: aim });
                                } else {
                                    this.sendPacket(3, { mouseMoved: aim });
                                    this.sendPacket(3, { space: 0 });
                                    this.sendPacket(3, { space: 1 });
                                }
                            }
                            if (this.scripts.autoaimdemons && this.nearestDemon) {
                                const aim = Math.floor((Math.atan2(this.nearestDemon.y - this.myPlayer.position.y, this.nearestDemon.x - this.myPlayer.position.x) * 180 / Math.PI + 450) % 360) || 0;
                                if (this.myPlayer.weaponName !== "Bow") {
                                    this.sendPacket(3, { mouseDown: aim });
                                } else {
                                    this.sendPacket(3, { mouseMoved: aim });
                                    this.sendPacket(3, { space: 0 });
                                    this.sendPacket(3, { space: 1 });
                                }
                            }
                        } else {
                            if (this.myPlayer.weaponName !== "Bow") {
                                this.sendPacket(3, { mouseDown: this.myPlayer.aimingYaw });
                            } else {
                                this.sendPacket(3, { space: 0 });
                                this.sendPacket(3, { space: 1 });
                            }
                        }
                    }
                }
            } else {
                if ((this.scripts.autoaim && this.nearestPlayer) || (this.scripts.autoaimzombies && this.nearestZombie) || (this.scripts.autoaimdemons && this.nearestDemon)) {
                    if (this.scripts.autoaim && this.nearestPlayer) {
                        const aim = Math.floor((Math.atan2(this.nearestPlayer.y - this.myPlayer.position.y, this.nearestPlayer.x - this.myPlayer.position.x) * 180 / Math.PI + 450) % 360) || 0;
                        if (this.myPlayer.weaponName !== "Bow") {
                            this.sendPacket(3, { mouseDown: aim });
                        } else {
                            this.sendPacket(3, { mouseMoved: aim });
                            this.sendPacket(3, { space: 0 });
                            this.sendPacket(3, { space: 1 });
                        }
                    }
                    if (this.scripts.autoaimzombies && this.nearestZombie) {
                        const aim = Math.floor((Math.atan2(this.nearestZombie.y - this.myPlayer.position.y, this.nearestZombie.x - this.myPlayer.position.x) * 180 / Math.PI + 450) % 360) || 0;
                        if (this.myPlayer.weaponName !== "Bow") {
                            this.sendPacket(3, { mouseDown: aim });
                        } else {
                            this.sendPacket(3, { mouseMoved: aim });
                            this.sendPacket(3, { space: 0 });
                            this.sendPacket(3, { space: 1 });
                        }
                    }
                    if (this.scripts.autoaimdemons && this.nearestDemon) {
                        const aim = Math.floor((Math.atan2(this.nearestDemon.y - this.myPlayer.position.y, this.nearestDemon.x - this.myPlayer.position.x) * 180 / Math.PI + 450) % 360) || 0;
                        if (this.myPlayer.weaponName !== "Bow") {
                            this.sendPacket(3, { mouseDown: aim });
                        } else {
                            this.sendPacket(3, { mouseMoved: aim });
                            this.sendPacket(3, { space: 0 });
                            this.sendPacket(3, { space: 1 });
                        }
                    }
                } else {
                    if (this.myPlayer.weaponName !== "Bow") {
                        this.sendPacket(3, { mouseDown: this.myPlayer.aimingYaw });
                    } else {
                        this.sendPacket(3, { space: 0 });
                        this.sendPacket(3, { space: 1 });
                    }
                }
            }
        } else {
            if (!this.hasStopped) {
                this.hasStopped = true;
                this.sendPacket(3, { mouseUp: 1 });
            }
        }
        if (this.scripts.autopetrevive && this.petActivated) {
            this.sendPacket(9, { name: "BuyItem", itemName: "PetRevive", tier: 1 });
            this.sendPacket(9, { name: "EquipItem", itemName: "PetRevive", tier: 1 });
        }
        if (this.scripts.playertrick || this.scripts.reverseplayertrick || this.scripts.bossreverseplayertrick || this.scripts.tokenreverseplayertrick || this.scripts.autoclearzombies) {
            const daySeconds = (this.tick * 50 / 1000 + 60) % 120;
            let minSeconds = 19;
            if (this.scripts.bossreverseplayertrick && !this.scripts.tokenreverseplayertrick) {
                minSeconds = 1;
            } else if (!this.scripts.bossreverseplayertrick && this.scripts.tokenreverseplayertrick) {
                minSeconds = 0;
            }
            if (!this.leaveOnce && daySeconds >= minSeconds && this.playerTrickPsk && !this.scripts.autoclearzombies) {
                this.leaveOnce = true;
                if (this.scripts.reverseplayertrick || this.scripts.bossreverseplayertrick || this.scripts.tokenreverseplayertrick) {
                    if (this.scripts.bossreverseplayertrick || this.scripts.tokenreverseplayertrick) {
                        if (this.lastWave && [9, 17, 25, 33, 41, 49, 57, 65, 73, 81, 89, 97, 105, 121].includes(this.lastWave + 1)) {
                            this.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: this.playerTrickPsk });
                        }
                    } else {
                        this.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: this.playerTrickPsk });
                    }
                } else {
                    this.sendPacket(9, { name: "LeaveParty" });
                }
            }
            if (!this.joinOnce && daySeconds >= 119 && this.playerTrickPsk && !this.scripts.autoclearzombies) {
                this.joinOnce = true;
                if (this.scripts.reverseplayertrick || this.scripts.bossreverseplayertrick || this.scripts.tokenreverseplayertrick) {
                    if (this.scripts.bossreverseplayertrick || this.scripts.tokenreverseplayertrick) {
                        if ([8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 120].includes(this.myPlayer.wave)) {
                            this.lastWave = this.myPlayer.wave;
                            this.sendPacket(9, { name: "LeaveParty" });
                        }
                    } else {
                        this.sendPacket(9, { name: "LeaveParty" });
                    }
                } else {
                    this.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: this.playerTrickPsk });
                }
            }
            if (this.scripts.autoclearzombies && this.aimLock && this.inventory.Spear && this.inventory.Bow) {
                if (!this.scripts.playertrick) {
                    if ((daySeconds < 20 || (daySeconds >= 90 && daySeconds < 100)) && !this.getSpear) {
                        if (daySeconds < 20) {
                            this.getBow = false;
                            this.scripts.aimlock = true;
                            this.scripts.autoaimzombies = false;
                        }
                        this.getSpear = true;
                        this.sendPacket(9, { name: "EquipItem", itemName: "Spear", tier: 5 });
                    } else if (daySeconds >= 20 && daySeconds < 90 && this.getSpear) {
                        this.getSpear = false;
                        this.sendPacket(9, { name: "EquipItem", itemName: "Spear", tier: 7 });
                    } else if (daySeconds >= 100 && !this.getBow) {
                        this.getBow = true;
                        this.getSpear = false;
                        this.scripts.autoaimzombies = true;
                        this.scripts.aimlock = false;
                        this.sendPacket(9, { name: "EquipItem", itemName: "Bow", tier: 1 });
                    }
                } else {
                    if (daySeconds < 20 && !this.getMaxBow) {
                        this.getMaxBow = true;
                        this.sendPacket(9, { name: "EquipItem", itemName: "Bow", tier: 7 });
                    } else if (daySeconds >= 20 && this.getMaxBow) {
                        this.getMaxBow = false;
                        this.sendPacket(9, { name: "EquipItem", itemName: "Bow", tier: 6 });
                    }
                }
            }
        }
        if (this.scripts.ahrc) {
            this.harvesterTicks.forEach((e) => {
                e.tick++;
                if (e.tick >= e.resetTick) {
                    e.tick = 0;
                    this.depositAhrc(e);
                }
                if (e.tick === 1) {
                    this.collectAhrc(e);
                }
            });
        }
        if (this.myPlayer && (this.scripts.positionlock || this.gs || !this.hasFarmed)) {
            const px = this.myPlayer.position.x;
            const py = this.myPlayer.position.y;
            const bounceBuildings = new Set();
            let wbMove = null;
            let wbFar = false;
            let wbSlip = 0;
            if (this.scripts.wallbounce && this.position1 && this.position2 && this.xAxis && this.yAxis) {
                const da = this.position1[this.xAxis] - this.myPlayer.position[this.xAxis];
                wbFar = da * da >= 576;
                if (wbFar) {
                    const ang = (Math.round(((Math.atan2(this.position1.y - py, this.position1.x - px) * 180 / Math.PI + 450) % 360) / 45) * 45) % 360;
                    wbMove = { up: (ang === 0 || ang === 45 || ang === 315) ? 1 : 0, down: (ang === 135 || ang === 180 || ang === 225) ? 1 : 0, right: (ang === 45 || ang === 90 || ang === 135) ? 1 : 0, left: (ang === 225 || ang === 270 || ang === 315) ? 1 : 0 };
                    wbSlip = wbYawSlipSet.has(this.myPlayer.yaw) ? 4 : 0;
                    this.sendPacket(3, wbMove);
                }
            }
            for (const e of this.buildings.values()) {
                if (this.scripts.upgradeall && this.upgradeTicks === 0 && e.tier < 8) {
                    const dx = px - e.x;
                    const dy = py - e.y;
                    if (dx * dx + dy * dy <= 768 * 768) {
                        this.sendPacket(9, { name: "UpgradeBuilding", uid: e.uid });
                    }
                }
                if (this.scripts.sellall && e.type !== "GoldStash" && Math.abs(px - e.x) <= 1152 && Math.abs(py - e.y) <= 1152) {
                    this.sendPacket(9, { name: "DeleteBuilding", uid: e.uid });
                }
                if (this.scripts.upgradetowerhealth) {
                    const x = this.entities.get(e.uid);
                    if (x) {
                        const dx = px - e.x;
                        const dy = py - e.y;
                        if ((x.targetTick.health / x.targetTick.maxHealth * 100) <= 30 && dx * dx + dy * dy <= 768 * 768 && e.tier < (e.type === "GoldStash" ? 8 : this.gs.tier)) {
                            if (e.nextTier !== e.tier + 1) {
                                e.nextTier = e.tier + 1;
                                this.sendPacket(9, { name: "UpgradeBuilding", uid: e.uid });
                            }
                        }
                    }
                }
                if (this.scripts.towerheal && healTowerSet.has(e.type)) {
                    const x = this.entities.get(e.uid);
                    if (x) {
                        const dx = px - e.x;
                        const dy = py - e.y;
                        if ((x.targetTick.health / x.targetTick.maxHealth * 100) <= 30 && dx * dx + dy * dy <= 1000 * 1000) {
                            this.sendPacket(9, { name: "CastSpell", spell: "HealTowersSpell", x: e.x, y: e.y, tier: 1 });
                        }
                    }
                }
                if (wbMove && wbFar && !wbSkipSet.has(e.type)) {
                    const offset = e.type === "Wall" ? 36.7 : 60.7;
                    const lim = offset + wbSlip;
                    if (Math.abs(e.x - px) < lim && Math.abs(e.y - py) < lim) {
                        bounceBuildings.add(e.uid);
                    }
                }
            }
            if (this.scripts.autobuild) {
                this.inactiveRebuilder.forEach((e) => {
                    const x = e[0] * 24 + this.gs.x;
                    const y = e[1] * 24 + this.gs.y;
                    if (Math.abs(this.myPlayer.position.x - x) <= 576 && Math.abs(this.myPlayer.position.y - y) <= 576) {
                        this.sendPacket(9, { name: "MakeBuilding", x: x, y: y, type: e[2], yaw: e[3] });
                    }
                });
            }
            if (this.scripts.autoupgrade) {
                this.inactiveReupgrader.forEach((e) => {
                    const x = e[0] * 24 + this.gs.x;
                    const y = e[1] * 24 + this.gs.y;
                    if (Math.hypot((this.myPlayer.position.x - x), (this.myPlayer.position.y - y)) <= 768) {
                        if (e[5] - this.tick <= 0) {
                            e[5] = this.tick + 7;
                            this.sendPacket(9, { name: "UpgradeBuilding", uid: e[4] });
                        }
                    }
                });
            }
            if (this.scripts.autotimeout && !this.myPlayer.isPaused && this.myPlayer.gold >= 10000) {
                this.sendPacket(9, { name: "BuyItem", itemName: "Pause", tier: 1 });
            }
            if (this.scripts.positionlock && this.lockPos) {
                const x = (Math.round(((Math.atan2(this.lockPos.y - this.myPlayer.position.y, this.lockPos.x - this.myPlayer.position.x) * 180 / Math.PI + 450) % 360) / 45) * 45) % 360;
                let movementPacket = null;
                if (!this.scatter) {
                    movementPacket = { up: (x === 0 || x === 45 || x === 315) ? 1 : 0, down: (x === 135 || x === 180 || x === 225) ? 1 : 0, right: (x === 45 || x === 90 || x === 135) ? 1 : 0, left: (x === 225 || x === 270 || x === 315) ? 1 : 0 };
                } else {
                    movementPacket = { up: 1, down: 0, right: 0, left: 1 };
                }
                let offset = 96;
                if (this.scripts.playertrick) offset = 60;
                if (this.scripts.autopetevolve) offset = 24;
                if (this.scatter > 0 && this.scatter <= 7) {
                    this.scatter += 1;
                } else {
                    if (this.scatter > 0) {
                        this.scatter = 0;
                    }
                }
                if (Math.hypot(this.lockPos.y - this.myPlayer.position.y, this.lockPos.x - this.myPlayer.position.x) > offset) {
                    this.sendPacket(3, movementPacket);
                    this.positionRest = x;
                    if (this.myPlayer && this.myPlayer.petUid) {
                        this.sendPacket(9, { name: "DeleteBuilding", uid: this.myPlayer.petUid });
                    }
                } else {
                    if (this.positionRest !== 999) {
                        this.positionRest = 999;
                        this.sendPacket(3, { up: 0, down: 0, right: 0, left: 0 });
                    }
                }
                if (this.scripts.autofollow && this.nearestPlayer && this.myPlayer.health / 5 > 50 && Math.abs(this.nearestPlayer.x - this.gs.x) <= 384 && Math.abs(this.nearestPlayer.y - this.gs.y) <= 384) {
                    this.followTicks = ++this.followTicks % 10;
                    if (this.followTicks === 0) {
                        this.shouldFollow = true;
                    }
                } else {
                    if (this.followTicks > 0) {
                        this.followTicks = 0;
                    }
                    this.shouldFollow = false;
                }
            }
            if (this.scripts.antiarrow && this.nearestEnemy) {
                let numberOfBuildings = 0;
                for (let i in this.antiArrowBuildings) {
                    const e = this.antiArrowBuildings[i];
                    let radius = -1;
                    if (doorWallSlowSet.has(e.type)) {
                        radius = 24;
                    } else {
                        radius = 48;
                    }
                    if (Math.abs(e.x - this.nearestEnemy.x) <= radius && Math.abs(e.y - this.nearestEnemy.y) <= radius) {
                        numberOfBuildings += 1;
                    }
                }
                if (numberOfBuildings >= 1) {
                    if (!this.scripts.autobow) {
                        this.scripts.autobow = true;
                        this.antiArrowTicks = 0;
                    }
                } else {
                    if (this.scripts.autobow) {
                        this.scripts.autobow = false;
                        this.antiArrowTicks = 0;
                    }
                }
            }
            if (this.scripts.revert) {
                for (let i in this.revertBuildings) {
                    const e = this.revertBuildings[i];
                    if (e.nearestEnemy) {
                        const index = e.x + "," + e.y;
                        const building = this.buildingsByIndex.get(index);
                        if (building && building.tier > e.tier) {
                            let radius = -1;
                            if (doorWallSlowSet.has(building.type)) {
                                radius = 120;
                            } else {
                                radius = 144;
                            }
                            if (Math.abs(e.nearestEnemy.x - building.x) > radius || Math.abs(e.nearestEnemy.y - building.y) > radius) {
                                if (this.scripts.automove && this.lockPos && this.secondLockPos) {
                                    if (Math.hypot(this.lockPos.y - this.myPlayer.position.y, this.lockPos.x - this.myPlayer.position.x) <= 96) {
                                        if (Math.abs(this.myPlayer.position.x - building.x) <= 1152 && Math.abs(this.myPlayer.position.y - building.y) <= 1152 && this.partyInfo && this.partyInfo.length === 4) {
                                            this.sendPacket(9, { name: "DeleteBuilding", uid: building.uid });
                                        }
                                    }
                                } else {
                                    if (Math.abs(this.myPlayer.position.x - building.x) <= 1152 && Math.abs(this.myPlayer.position.y - building.y) <= 1152 && this.partyInfo && this.partyInfo.length === 4) {
                                        this.sendPacket(9, { name: "DeleteBuilding", uid: building.uid });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (this.scripts.returnitems && !this.myPlayer.dead) {
                if (!this.maxPickTier) this.maxPickTier = this.inventory.Pickaxe.tier;
                if (this.inventory.Pickaxe.tier < this.maxPickTier && this.myPlayer.gold >= itemCosts.Pickaxe[this.inventory.Pickaxe.tier + 1]) {
                    this.sendPacket(9, { name: "BuyItem", itemName: "Pickaxe", tier: this.inventory.Pickaxe.tier + 1 });
                }
                if (!this.inventory.Spear) {
                    this.sendPacket(9, { name: "BuyItem", itemName: "Spear", tier: 1 });
                } else {
                    if (!this.maxSpearTier) this.maxSpearTier = this.inventory.Spear.tier;
                    if (this.inventory.Spear.tier < this.maxSpearTier && this.myPlayer.gold >= itemCosts.Spear[this.inventory.Spear.tier + 1]) {
                        this.sendPacket(9, { name: "BuyItem", itemName: "Spear", tier: this.inventory.Spear.tier + 1 });
                    }
                }
                if (!this.inventory.Bow) {
                    this.sendPacket(9, { name: "BuyItem", itemName: "Bow", tier: 1 });
                } else {
                    if (!this.maxBowTier) this.maxBowTier = this.inventory.Bow.tier;
                    if (this.inventory.Bow.tier < this.maxBowTier && this.myPlayer.gold >= itemCosts.Bow[this.inventory.Bow.tier + 1]) {
                        this.sendPacket(9, { name: "BuyItem", itemName: "Bow", tier: this.inventory.Bow.tier + 1 });
                    }
                }
                if (!this.inventory.Bomb) {
                    this.sendPacket(9, { name: "BuyItem", itemName: "Bomb", tier: 1 });
                } else {
                    if (!this.maxBombTier) this.maxBombTier = this.inventory.Bomb.tier;
                    if (this.inventory.Bomb.tier < this.maxBombTier && this.myPlayer.gold >= itemCosts.Bomb[this.inventory.Bomb.tier + 1]) {
                        this.sendPacket(9, { name: "BuyItem", itemName: "Bomb", tier: this.inventory.Bomb.tier + 1 });
                    }
                }
                if (!this.inventory.ZombieShield) {
                    this.sendPacket(9, { name: "BuyItem", itemName: "ZombieShield", tier: 1 });
                } else {
                    if (!this.maxShieldTier) this.maxShieldTier = this.inventory.ZombieShield.tier;
                    if (this.inventory.ZombieShield.tier < this.maxShieldTier && this.myPlayer.gold >= itemCosts.ZombieShield[this.inventory.ZombieShield.tier + 1]) {
                        this.sendPacket(9, { name: "BuyItem", itemName: "ZombieShield", tier: this.inventory.ZombieShield.tier + 1 });
                    }
                }
            }
            if (this.scripts.automove && this.secondLockPos) {
                if (this.myPlayer.health / 5 <= 50) {
                    if (this.scripts.positionlock) {
                        this.scripts.positionlock = false;
                    }
                    if (Math.hypot(this.secondLockPos.x - this.myPlayer.position.x, this.secondLockPos.y - this.myPlayer.position.y) > 100) {
                        const x = (Math.round(((Math.atan2(this.secondLockPos.y - this.myPlayer.position.y, this.secondLockPos.x - this.myPlayer.position.x) * 180 / Math.PI + 450) % 360) / 45) * 45) % 360;
                        const movementPacket = { up: (x === 0 || x === 45 || x === 315) ? 1 : 0, down: (x === 135 || x === 180 || x === 225) ? 1 : 0, right: (x === 45 || x === 90 || x === 135) ? 1 : 0, left: (x === 225 || x === 270 || x === 315) ? 1 : 0 };
                        this.sendPacket(3, movementPacket);
                        if (this.stopMoving) {
                            this.stopMoving = false;
                        }
                    } else {
                        if (!this.stopMoving) {
                            this.stopMoving = true;
                            this.sendPacket(3, { up: 0, left: 0, down: 0, right: 0 });
                        }
                    }
                } else {
                    if (!this.scripts.positionlock) {
                        this.scripts.positionlock = true;
                    }
                }
            }
            if (this.scripts.wallbounce && this.position1 && this.position2 && this.xAxis && this.yAxis) {
                const wbNear = this.position1[this.xAxis] - this.myPlayer.position[this.xAxis];
                if (wbNear * wbNear < 24 * 24) {
                    if (!this.stopDiagonally) {
                        this.stopDiagonally = true;
                        this.sendPacket(3, this.xAxis === "x" ? (this.yAxis === "y" ? { left: 0, right: 0 } : { left: 0, down: 0 }) : (this.yAxis === "y" ? { up: 0, right: 0 } : { up: 0, down: 0 }));
                    }
                    if (this.myPlayer.position[this.yAxis] <= this.position1[this.yAxis] + 24) {
                        this.sendPacket(3, this.xAxis === "x" ? (this.yAxis === "y" ? { up: 0, down: 1 } : { up: 0, right: 1 }) : (this.yAxis === "y" ? { left: 0, down: 1 } : { left: 0, right: 1 }));
                    }
                    if (this.myPlayer.position[this.yAxis] >= this.position2[this.yAxis] - 24) {
                        this.sendPacket(3, this.xAxis === "x" ? (this.yAxis === "y" ? { down: 0, up: 1 } : { down: 0, left: 1 }) : (this.yAxis === "y" ? { right: 0, up: 1 } : { right: 0, left: 1 }));
                    }
                } else {
                    if (this.stopDiagonally) {
                        this.stopDiagonally = false;
                    }
                    if (bounceBuildings.size > 0) {
                        for (const uid of bounceBuildings) {
                            this.bounceTicks = ++this.bounceTicks % 20;
                            if (this.bounceTicks === 0) {
                                this.sendPacket(9, { name: "DeleteBuilding", uid: uid });
                            }
                        }
                    } else {
                        if (this.bounceTicks > 0) {
                            this.bounceTicks = 0;
                        }
                    }
                }
            }
            if (this.scripts.autofollow && this.nearestPlayer && this.shouldFollow) {
                if (Math.hypot(this.nearestPlayer.x - this.myPlayer.position.x, this.nearestPlayer.y - this.myPlayer.position.y) > 60) {
                    const x = (Math.round(((Math.atan2(this.nearestPlayer.y - this.myPlayer.position.y, this.nearestPlayer.x - this.myPlayer.position.x) * 180 / Math.PI + 450) % 360) / 45) * 45) % 360;
                    const movementPacket = { up: (x === 0 || x === 45 || x === 315) ? 1 : 0, down: (x === 135 || x === 180 || x === 225) ? 1 : 0, right: (x === 45 || x === 90 || x === 135) ? 1 : 0, left: (x === 225 || x === 270 || x === 315) ? 1 : 0 };
                    this.sendPacket(3, movementPacket);
                } else {
                    const yaw = this.nearestPlayer.yaw;
                    const movementPacket = { up: (yaw === 44 || yaw === 314 || yaw === 359) ? 1 : 0, right: (yaw === 90 || yaw === 44 || yaw === 135) ? 1 : 0, left: (yaw === 225 || yaw === 314 || yaw === 270) ? 1 : 0, down: (yaw === 225 || yaw === 135 || yaw === 180) ? 1 : 0 };
                    this.sendPacket(3, movementPacket);
                }
            }
        }
        if (this.partyInfo && this.partyInfo[0].playerUid === this.uid) {
            for (let i in this.partyInfo) {
                if (!this.scripts.autosell) {
                    for (let e in sessions_1) {
                        if (this.partyInfo[i].playerUid === sessions_1[e].uid && !this.partyInfo[i].canSell) {
                            this.sendPacket(9, { name: "SetPartyMemberCanSell", uid: this.partyInfo[i].playerUid, canSell: 1 });
                        }
                    }
                } else {
                    if (!this.partyInfo[i].canSell) {
                        this.sendPacket(9, { name: "SetPartyMemberCanSell", uid: this.partyInfo[i].playerUid, canSell: 1 });
                    }                    
                }
            }
        }
        const server = serverMap.get(this.serverId);
        if (server.filler && this.tick > server.tick && this.players !== 40) {
            server.tick = this.tick + 300;
            new Bot(this.sessionName, this.name, this.serverId, "", false);
        }
        if (server.partyFiller && !this.scripts.playertrick && !this.scripts.reverseplayertrick && !this.scripts.bossreverseplayertrick && !this.scripts.tokenreverseplayertrick && !this.gs) {
            if (!Object.keys(server.keys).length) return;
            if (!Object.keys(server.keys).includes(this.psk)) {
                this.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: Object.keys(server.keys)[Math.floor(Math.random() * Object.keys(server.keys).length)] });
            }
        }
        if (this.scripts.autoweaponswitch && this.nearestPlayer) {
            if (Math.hypot(this.nearestPlayer.x - this.myPlayer.position.x, this.nearestPlayer.y - this.myPlayer.position.y) > 300 && this.myPlayer.weaponName !== "Bow" && this.inventory.Bow) {
                if (!this.equipBow) {
                    this.equipBow = true;
                    this.sendPacket(9, { name: "EquipItem", itemName: "Bow", tier: this.inventory.Bow.tier });
                } else {
                    this.bowTicks = ++this.bowTicks % 10;
                    if (this.bowTicks === 0) {
                        this.equipBow = false;
                    }
                }
            } else {
                if (this.bowTicks > 0) {
                    this.bowTicks = 0;
                }
            }
            if (Math.hypot(this.nearestPlayer.x - this.myPlayer.position.x, this.nearestPlayer.y - this.myPlayer.position.y) > 100 && this.myPlayer.weaponName !== "Bomb" && Math.hypot(this.nearestPlayer.x - this.myPlayer.position.x, this.nearestPlayer.y - this.myPlayer.position.y) <= 300 && this.inventory.Bomb) {
                if (!this.equipBomb) {
                    this.equipBomb = true;
                    this.sendPacket(9, { name: "EquipItem", itemName: "Bomb", tier: this.inventory.Bomb.tier });
                } else {
                    this.bombTicks = ++this.bombTicks % 10;
                    if (this.bombTicks === 0) {
                        this.equipBomb = false;
                    }
                }
            } else {
                if (this.bombTicks > 0) {
                    this.bombTicks = 0;
                }
            }
            if (Math.hypot(this.nearestPlayer.x - this.myPlayer.position.x, this.nearestPlayer.y - this.myPlayer.position.y) <= 100 && this.myPlayer.weaponName !== "Spear" && this.inventory.Spear) {
                if (!this.equipSpear) {
                    this.equipSpear = true;
                    this.sendPacket(9, { name: "EquipItem", itemName: "Spear", tier: this.inventory.Spear.tier });
                } else {
                    this.spearTicks = ++this.spearTicks % 10;
                    if (this.spearTicks === 0) {
                        this.equipSpear = false;
                    }
                }
            } else {
                if (this.spearTicks > 0) {
                    this.spearTicks = 0;
                }
            }
        }
        if (this.scripts.aimlock && this.aimLock !== undefined) {
            const aim = parseInt(this.aimLock);
            if (aim >= 0 && aim <= 359 && this.myPlayer.aimingYaw !== aim) {
                this.sendPacket(3, { mouseMoved: aim });
            }
        }
        if (this.scripts.chatspam) {
            this.sendPacket(9, { name: "SendChatMessage", channel: "Local", message: this.spamMessage });
        }
        for (let i in this.buildingUids_1) {
            this.buildingUids_1[i] += 1;
            if (this.buildingUids_1[i] > 10) {
                delete this.buildingUids_1[i];
            }
        }
    }
    onEnterWorldHandler(data) {
        if (data.allowed) {
            this.uid = data.uid;
            if (this.enterworld2) {
                this.ws.send(this.enterworld2);
            }
            if (!serverMap.get(this.serverId).autoFarm) {
                this.hasFarmed = true;
            }
            this.uptime = Date.now();
            serverMap.get(this.serverId).autoBreakIn = false;
            this.sendPacket(3, { mouseMoved: 15 });
            this.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: this.psk });
            this.sendPacket(9, { name: "BuyItem", itemName: "HatHorns", tier: 1 });
            this.sendPacket(9, { name: "BuyItem", itemName: "PetCARL", tier: 1 });
            this.sendPacket(9, { name: "BuyItem", itemName: "PetMiner", tier: 1 });
            this.sendPacket(9, { name: "EquipItem", itemName: "PetCARL", tier: 1 });
            this.sendPacket(9, { name: "EquipItem", itemName: "PetMiner", tier: 1 });
            for (let i = 0; i < 26; i++) {
                this.sendPacket(3, { up: 1 });
            }
            this.sendPacket(7, {});
            this.sendPacket(9, {
                name: "Metrics",
                minFps: 21.74,
                maxFps: 70.2,
                currentFps: 60.34,
                averageFps: 59.7,
                framesRendered: 7442,
                framesInterpolated: 7442,
                framesExtrapolated: 0,
                allocatedNetworkEntities: 200,
                currentClientLag: 203,
                minClientLag: 99,
                maxClientLag: 398,
                currentPing: 101.5,
                minPing: 91,
                maxPing: 113,
                averagePing: 96.85,
                longFrames: 1,
                stutters: 142,
                group: 0,
                isMobile: 0,
                timeResets: 1,
                maxExtrapolationTime: 0,
                extrapolationIncidents: 0,
                totalExtrapolationTime: 0,
                differenceInClientTime: 16.7
            });
        } else {
            this.ws.send(0);
        }
    }
    onRpcUpdateHandler(data) {
        switch (data.name) {
            case "LocalBuilding":
                data.response.forEach((e) => {
                    if (this.buildingUids_1[e.uid]) return;
                    if (e.dead && !this.buildingUids_1[e.uid]) {
                        this.buildingUids_1[e.uid] = 1;
                    }
                    if (e.type === "GoldStash") {
                        this.gs = e;
                    }
                    if (e.type === "GoldStash" && e.dead) {
                        if (this.scripts.autobuild) {
                            this.rebuilder.forEach((e) => {
                                if (e[2] !== "Harvester") return;
                                this.inactiveRebuilder.set(e[0] + e[1] * 1000, e);
                            });
                        }
                        this.gs = null;
                    }
                    if (e.dead) {
                        const index = e.x + "," + e.y;
                        const at = this.buildingsByIndex.get(index);
                        if (at && at.uid === e.uid) {
                            this.buildingsByIndex.delete(index);
                        }
                        this.buildings.delete(e.uid);
                    } else {
                        const prev = this.buildings.get(e.uid);
                        if (prev && (prev.x !== e.x || prev.y !== e.y)) {
                            const index = prev.x + "," + prev.y;
                            if (this.buildingsByIndex.get(index) === prev) {
                                this.buildingsByIndex.delete(index);
                            }
                        }
                        this.buildings.set(e.uid, e);
                        const index = e.x + "," + e.y;
                        this.buildingsByIndex.set(index, e);
                    }
                    if (e.type === "Harvester") {
                        this.harvesters.set(e.uid, e);
                    }
                    if (e.type === "Harvester" && e.dead) {
                        this.harvesters.delete(e.uid);
                    }
                    if (this.gs) {
                        if (this.scripts.autobuild && this.rebuilder.get((e.x - this.gs.x) / 24 + (e.y - this.gs.y) / 24 * 1000)) {
                            const index = (e.x - this.gs.x) / 24 + (e.y - this.gs.y) / 24 * 1000;
                            const _rebuilder = this.rebuilder.get(index);
                            if (e.dead) {
                                this.inactiveRebuilder.set(index, _rebuilder);
                            } else {
                                this.inactiveRebuilder.delete(index);
                            }
                        }
                        if (this.scripts.autoupgrade && this.reupgrader.get((e.x - this.gs.x) / 24 + (e.y - this.gs.y) / 24 * 1000)) {
                            const index = (e.x - this.gs.x) / 24 + (e.y - this.gs.y) / 24 * 1000;
                            const _reupgrader = this.reupgrader.get(index);
                            if (e.dead) {
                                this.inactiveReupgrader.delete(index);
                            } else {
                                if (e.tier < _reupgrader[2]) {
                                    if (this.inactiveReupgrader.get(index)) return;
                                    this.inactiveReupgrader.set(index, [_reupgrader[0], _reupgrader[1], _reupgrader[2], e.tier, e.uid, this.tick]);
                                } else {
                                    this.inactiveReupgrader.delete(index);
                                }
                            }
                        }
                    }
                });
                break;
            case "PartyShareKey":
                this.psk = data.response.partyShareKey;
                break;
            case "SetItem":
                this.inventory[data.response.itemName] = data.response;
                if (this.inventory[data.response.itemName].stacks) return;
                delete this.inventory[data.response.itemName];
                break;
            case "PartyInfo":
                this.partyInfo = data.response;
                break;
            case "SetPartyList":
                this.parties = {};
                this.players = 0;
                data.response.forEach((e) => {
                    this.parties[e.partyId] = e;
                    this.players += e.memberCount;
                });
                break;
            case "DayCycle":
                this.dayCycle = data.response;
                if (data.response.isDay) return;
                this.leaveOnce = false;
                this.joinOnce = false;
                if (this.scripts.autopetevolve && this.myPlayer && this.myPet && this.myPet.tier < 8) {
                    const petLevel = this.myPet.experience / 100 + 1;
                    if (petLevel >= 9 && this.myPet.tier < 2 && this.myPlayer.token >= 100) {
                        this.sendPacket(9, { name: "BuyItem", itemName: this.myPet.model, tier: 2 });
                    } else if (petLevel >= 17 && this.myPet.tier < 3 && this.myPlayer.token >= 100) {
                        this.sendPacket(9, { name: "BuyItem", itemName: this.myPet.model, tier: 3 });
                    } else if (petLevel >= 25 && this.myPet.tier < 4 && this.myPlayer.token >= 100) {
                        this.sendPacket(9, { name: "BuyItem", itemName: this.myPet.model, tier: 4 });
                    } else if (petLevel >= 33 && this.myPet.tier < 5 && this.myPlayer.token >= 100) {
                        this.sendPacket(9, { name: "BuyItem", itemName: this.myPet.model, tier: 5 });
                    } else if (petLevel >= 49 && this.myPet.tier < 6 && this.myPlayer.token >= 200) {
                        this.sendPacket(9, { name: "BuyItem", itemName: this.myPet.model, tier: 6 });
                    } else if (petLevel >= 65 && this.myPet.tier < 7 && this.myPlayer.token >= 200) {
                        this.sendPacket(9, { name: "BuyItem", itemName: this.myPet.model, tier: 7 });
                    } else if (petLevel >= 97 && this.myPet.tier < 8 && this.myPlayer.token >= 300) {
                        this.sendPacket(9, { name: "BuyItem", itemName: this.myPet.model, tier: 8 });
                    }
                }
                break;
            case "Leaderboard":
                this.leaderboard = data.response;
                break;
            case "ReceiveChatMessage":
                this.messages.push(data.response);
                const messages = [];
                if (this.messages.length <= 50) return;
                for (let i = this.messages.length - 50; i < this.messages.length; i++) {
                    messages.push(this.messages[i]);
                }
                this.messages = messages;
                break;
            case "Shutdown":
                for (let i in sessions_1) {
                    sessions_1[i].isClosed = true;
                    serverMap.get(sessions_1[i].serverId).partyFiller = false;
                    serverMap.get(sessions_1[i].serverId).filler = false;
                }
                setTimeout(() => {
                    for (let i in sessions_1) {
                        sessions_1[i].ws.send(0);
                    }
                }, 1000);
                break;
            case "Failure":
                if (data.response.x === 2 ** 32 - 9 && data.response.y === 2 ** 32 - 9 && this.pingTest) {
                    this.pingTest = false;
                    this.lastPingMs = (performance.now() - this.time) / 2;
                    const shouldNotifyPing = !!this.pingNotify;
                    this.pingNotify = false;
                    if (!sessions[this.userId]) return;
                    for (let i in sessions[this.userId]) {
                        const ws = connections.get(sessions[this.userId][i]);
                        if (!ws || !ws.isVerified || ws.readyState !== 1) continue;
                        if (shouldNotifyPing) {
                            ws.sendMessage(`ping,  ;${this.lastPingMs}`);
                        }
                        sendSessionStats(ws, this, false);
                    }
                }
                break;
            case "Dead":
                const server = serverMap.get(this.serverId);
                if (data.response.stashDied) {
                    if (server.partyFiller && server.keys[this.psk] && keys[`${server.id}/${this.psk}`]) {
                        delete server.keys[this.psk];
                        delete keys[`${server.id}/${this.psk}`];
                    }
                } else {
                    if (this.scripts.positionlock && this.gs) {
                        this.scatter = 1;
                    }
                }
                break;
        }
    }
    getSyncNeeds() {
        const syncNeeds = [];
        syncNeeds.push({ allowed: 1, uid: this.uid, startingTick: this.tick, tickRate: 20, effectiveTickRate: 20, players: 1, maxPlayers: 40, chatChannel: 0, effectiveDisplayName: this.entities.get(this.uid) ? this.entities.get(this.uid).targetTick.name : this.name, x1: 0, y1: 0, x2: 24000, y2: 24000, opcode: 4 });
        syncNeeds.push({ name: "PartyInfo", response: this.partyInfo, opcode: 9 });
        syncNeeds.push({ name: "PartyShareKey", response: { partyShareKey: this.psk }, opcode: 9 });
        syncNeeds.push({ name: "DayCycle", response: this.dayCycle, opcode: 9 });
        syncNeeds.push({ name: "Leaderboard", response: this.leaderboard, opcode: 9 });
        syncNeeds.push({ name: "SetPartyList", response: Object.values(this.parties), opcode: 9 });
        const localBuildings = [];
        this.buildings.forEach((e) => {
            localBuildings.push(e);
        });
        const entities = [];
        this.entities.forEach((e) => {
            entities.push([e.uid, e.targetTick]);
        });
        const sortedUidsByType = {};
        for (const entityType in this.codec.sortedUidsByType) {
            const table = this.codec.sortedUidsByType[entityType];
            sortedUidsByType[entityType] = Array.from(table.data.subarray(0, table.length));
        }
        return { tick: this.tick, entities: entities, byteSize: 654, opcode: 0, syncNeeds: syncNeeds, localBuildings: localBuildings, inventory: this.inventory, messages: this.messages, serverId: this.serverId, useRequiredEquipment: true, petActivated: !!this.petActivated, isPaused: this.myPlayer ? this.myPlayer.isPaused : 0, sortedUidsByType: sortedUidsByType, removedEntitiesObj: this.codec.removedEntitiesObj, absentEntitiesFlags: Array.from(this.codec.absentEntitiesFlags.subarray(0, this.codec.absentEntitiesFlagsUsed)), updatedEntityFlags: Array.from(this.codec.updatedEntityFlags.subarray(0, this.codec.updatedEntityFlagsUsed)) };
    }
    depositAhrc(tick) {
        this.harvesters.forEach((e) => {
            if (e.tier !== tick.tier) return;
            this.sendPacket(9, { name: "AddDepositToHarvester", uid: e.uid, deposit: tick.deposit });
        });
    }
    collectAhrc(tick) {
        this.harvesters.forEach((e) => {
            if (e.tier !== tick.tier) return;
            this.sendPacket(9, { name: "CollectHarvester", uid: e.uid });
        });
    }
}

const serverArr = [["v1001", "45.76.4.28", "zombs-2d4c041c-0.eggs.gg"], ["v1002", "45.77.203.204", "zombs-2d4dcbcc-0.eggs.gg"], ["v1003", "45.77.200.150", "zombs-2d4dc896-0.eggs.gg"], ["v1004", "104.156.225.133", "zombs-689ce185-0.eggs.gg"], ["v1005", "45.77.149.224", "zombs-2d4d95e0-0.eggs.gg"], ["v1006", "173.199.123.77", "zombs-adc77b4d-0.eggs.gg"], ["v1007", "45.76.166.32", "zombs-2d4ca620-0.eggs.gg"], ["v1008", "149.28.58.193", "zombs-951c3ac1-0.eggs.gg"], ["v2001", "149.28.87.132", "zombs-951c5784-0.eggs.gg"], ["v2002", "45.76.68.210", "zombs-2d4c44d2-0.eggs.gg"], ["v2003", "108.61.219.244", "zombs-6c3ddbf4-0.eggs.gg"], ["v5001", "80.240.19.5", "zombs-50f01305-0.eggs.gg"], ["v5002", "45.77.53.65", "zombs-2d4d3541-0.eggs.gg"], ["v5003", "95.179.167.12", "zombs-5fb3a70c-0.eggs.gg"], ["v5004", "95.179.163.97", "zombs-5fb3a361-0.eggs.gg"], ["v5005", "136.244.83.44", "zombs-88f4532c-0.eggs.gg"], ["v5006", "45.32.158.210", "zombs-2d209ed2-0.eggs.gg"], ["v5007", "95.179.169.17", "zombs-5fb3a911-0.eggs.gg"], ["v3001", "45.77.249.75", "zombs-2d4df94b-0.eggs.gg"], ["v4001", "149.28.182.161", "zombs-951cb6a1-0.eggs.gg"], ["v4002", "149.28.165.199", "zombs-951ca5c7-0.eggs.gg"]].map((e) => ({ id: e[0], hostname: e[1], host: e[2], filler: false, partyFiller: false, keys: {}, autoBreakIn: false, autoFarm: false, autoReconnect: true, abiSessionName: "Session", abiName: "Player", abiPsk: "putpartysharekeyhere", tick: 0 }));
const serverMap = new Map(serverArr.map((e) => [e.id, e]));

const RECONNECT_TICK_MS = 5000;
const RECONNECT_BURST_MS = 7000;
const RECONNECT_BURST_MAX = 5;
const RECONNECT_MAX_WS = 9;

const reconnectQ = new Map();
const reconnectPending = new Map();
const reconnectBurst = new Map();

function clearReconnectState(sid) {
    reconnectQ.delete(sid);
    reconnectPending.delete(sid);
    reconnectBurst.delete(sid);
}

function enqueueReconnect(bot) {
    const sid = bot.serverId;
    const pt = bot.scripts.playertrick;
    if (!sid || !serverMap.get(sid)?.autoReconnect) return;
    const empty = !!(bot.scripts.reverseplayertrick || bot.scripts.bossreverseplayertrick || bot.scripts.tokenreverseplayertrick);
    const key = `${bot.sessionName || ""}\0${bot.name}\0${empty ? "1" : "0"}\0${empty ? "" : bot.psk || ""}`;
    const pend = reconnectPending.get(sid) || reconnectPending.set(sid, new Set()).get(sid);
    if (pend.has(key)) return;
    (reconnectQ.get(sid) || reconnectQ.set(sid, []).get(sid)).push({ key, sessionName: bot.sessionName, name: bot.name, useEmptyPsk: empty, psk: pt ? bot.playerTrickPsk : bot.psk, pt: pt});
    pend.add(key);
}

setInterval(() => {
    const t = performance.now();
    for (const sid of [...reconnectQ.keys()]) {
        const q = reconnectQ.get(sid);
        if (!serverMap.get(sid)?.autoReconnect || !q?.length) continue;
        let b = reconnectBurst.get(sid);
        if (!b) reconnectBurst.set(sid, b = { n: 0, t0: t });
        if (t - b.t0 >= RECONNECT_BURST_MS) b.n = 0, b.t0 = t;
        if (b.n >= RECONNECT_BURST_MAX || (serversSessions[sid]?.size ?? 0) >= RECONNECT_MAX_WS) continue;
        const item = q.shift();
        if (!item) continue;
        reconnectPending.get(sid)?.delete(item.key);
        const n0 = serversSessions[sid]?.size ?? 0;
        if (item.useEmptyPsk) {
            new Bot(item.sessionName, item.name, sid, "", false);
        } else {
            new Bot(item.sessionName, item.name, sid, item.psk || "", item.pt);
        }
        if ((serversSessions[sid]?.size ?? 0) <= n0) {
            q.unshift(item);
            reconnectPending.get(sid)?.add(item.key);
            continue;
        }
        if (++b.n === 1) b.t0 = t;
        if (!q.length) reconnectQ.delete(sid);
    }
}, RECONNECT_TICK_MS);

class Uint32Vector {
    constructor(capacity = 16) {
        this.data = new Uint32Array(capacity);
        this.length = 0;
    }
    static fromArray(arr) {
        const vec = new Uint32Vector(arr.length || 16);
        if (arr.length) {
            vec.data.set(arr);
            vec.length = arr.length;
        }
        return vec;
    }
    ensureCapacity(need) {
        if (need <= this.data.length) return;
        let capacity = this.data.length || 16;
        while (capacity < need) capacity *= 2;
        const next = new Uint32Array(capacity);
        next.set(this.data.subarray(0, this.length));
        this.data = next;
    }
    push(value) {
        const index = this.length;
        this.ensureCapacity(index + 1);
        this.data[index] = value >>> 0;
        this.length = index + 1;
    }
    sort() {
        if (this.length > 1) {
            this.data.subarray(0, this.length).sort();
        }
    }
}

const packetIds = { 0: "PACKET_ENTITY_UPDATE", 1: "PACKET_PLAYER_COUNTER_UPDATE", 2: "PACKET_SET_WORLD_DIMENSIONS", 3: "PACKET_INPUT", 4: "PACKET_ENTER_WORLD", 5: "PACKET_PRE_ENTER_WORLD", 6: "PACKET_ENTER_WORLD2", 7: "PACKET_PING", 9: "PACKET_RPC", PACKET_PRE_ENTER_WORLD: 5, PACKET_ENTER_WORLD: 4, PACKET_ENTER_WORLD2: 6, PACKET_ENTITY_UPDATE: 0, PACKET_INPUT: 3, PACKET_PING: 7, PACKET_PLAYER_COUNTER_UPDATE: 1, PACKET_RPC: 9, PACKET_SET_WORLD_DIMENSIONS: 2 };
const attributeTypes = { 0: "Uninitialized", 1: "Uint32", 2: "Int32", 3: "Float", 4: "String", 5: "Vector2", 6: "EntityType", 7: "ArrayVector2", 8: "ArrayUint32", 9: "Uint16", 10: "Uint8", 11: "Int16", 12: "Int8", 13: "Uint64", 14: "Int64", 15: "Double", Uninitialized: 0, Uint32: 1, Int32: 2, Float: 3, String: 4, Vector2: 5, EntityType: 6, ArrayVector2: 7, ArrayUint32: 8, Uint16: 9, Uint8: 10, Int16: 11, Int8: 12, Uint64: 13, Int64: 14, Double: 15 };
const parameterTypes = { 0: "Uint32", 1: "Int32", 2: "Float", 3: "String", 4: "Uint64", 5: "Int64", Uint32: 0, Int32: 1, Float: 2, String: 3, Uint64: 4, Int64: 5 };

class BinCodec {
    constructor() {
        this.attributeMaps = {};
        this.entityTypeNames = {};
        this.rpcMaps = [];
        this.rpcMapsByName = {};
        this.sortedUidsByType = {};
        this.removedEntitiesObj = {};
        this.changedEntityTypes = {};
        this.entityUpdates = [];
        this.removedEntitiesArr = [];
        this.entityUpdateData = { tick: 0, entities: this.entityUpdates, removedEntitiesArr: this.removedEntitiesArr, byteSize: 0 };
        this.absentEntitiesFlags = new Uint8Array(64);
        this.absentEntitiesFlagsUsed = 0;
        this.updatedEntityFlags = new Uint8Array(64);
        this.updatedEntityFlagsUsed = 0;
        this.entityTypeKeyList = null;
    }
    encode(name, item) {
        const buffer = new ByteBuffer(100, true);
        switch (name) {
            case packetIds.PACKET_ENTER_WORLD:
                buffer.writeUint8(packetIds.PACKET_ENTER_WORLD);
                this.encodeEnterWorld(buffer, item);
                break;
            case packetIds.PACKET_INPUT:
                buffer.writeUint8(packetIds.PACKET_INPUT);
                this.encodeInput(buffer, item);
                break;
            case packetIds.PACKET_PING:
                buffer.writeUint8(packetIds.PACKET_PING);
                this.encodePing(buffer, item);
                break;
            case packetIds.PACKET_RPC:
                buffer.writeUint8(packetIds.PACKET_RPC);
                this.encodeRpc(buffer, item);
                break;
        }
        buffer.flip();
        buffer.compact();
        return buffer.toArrayBuffer(false);
    }
    decode(data) {
        const buffer = ByteBuffer.wrap(data);
        buffer.littleEndian = true;
        const opcode = buffer.readUint8();
        let decoded = {};
        switch (opcode) {
            case packetIds.PACKET_ENTER_WORLD:
                decoded = this.decodeEnterWorldResponse(buffer);
                break;
            case packetIds.PACKET_ENTITY_UPDATE:
                decoded = this.decodeEntityUpdate(buffer);
                break;
            case packetIds.PACKET_PING:
                decoded = this.decodePing(buffer);
                break;
            case packetIds.PACKET_RPC:
                decoded = this.decodeRpc(buffer);
                break;
        }
        opcode && (decoded.opcode = opcode);
        return decoded;
    }
    safeReadVString(buffer) {
        let offset = buffer.offset;
        const len = buffer.readVarint32(offset);
        try {
            const func = buffer.readUTF8String.bind(buffer);
            const str = func(len.value, "b", offset += len.length);
            offset += str.length;
            buffer.offset = offset;
            return str.string;
        }
        catch (e) {
            offset += len.value;
            buffer.offset = offset;
            return "?";
        }
    }
    decodeEnterWorldResponse(buffer) {
        const allowed = buffer.readUint32();
        const uid = buffer.readUint32();
        const startingTick = buffer.readUint32();
        const ret = {
            allowed: allowed,
            uid: uid,
            startingTick: startingTick,
            tickRate: buffer.readUint32(),
            effectiveTickRate: buffer.readUint32(),
            players: buffer.readUint32(),
            maxPlayers: buffer.readUint32(),
            chatChannel: buffer.readUint32(),
            effectiveDisplayName: this.safeReadVString(buffer),
            x1: buffer.readInt32(),
            y1: buffer.readInt32(),
            x2: buffer.readInt32(),
            y2: buffer.readInt32()
        }
        const attributeMapCount = buffer.readUint32();
        this.attributeMaps = {};
        this.entityTypeNames = {};
        this.sortedUidsByType = {};
        for (let i = 0; i < attributeMapCount; i++) {
            const attributeMap = [];
            const entityType = buffer.readUint32();
            const entityTypeString = buffer.readVString();
            const attributeCount = buffer.readUint32();
            for (let j = 0; j < attributeCount; j++) {
                const name_1 = buffer.readVString();
                const type = buffer.readUint32();
                attributeMap.push({ name: name_1, type: type });
            }
            this.attributeMaps[entityType] = attributeMap;
            this.entityTypeNames[entityType] = entityTypeString;
            this.sortedUidsByType[entityType] = new Uint32Vector();
        }
        const rpcCount = buffer.readUint32();
        this.rpcMaps = [];
        this.rpcMapsByName = {};
        for (let i = 0; i < rpcCount; i++) {
            const rpcName = buffer.readVString();
            const paramCount = buffer.readUint8();
            const isArray = buffer.readUint8() != 0;
            const parameters = [];
            for (let j = 0; j < paramCount; j++) {
                const paramName = buffer.readVString();
                const paramType = buffer.readUint8();
                parameters.push({ name: paramName, type: paramType });
            }
            const rpc = {
                name: rpcName,
                parameters: parameters,
                isArray: isArray,
                index: this.rpcMaps.length
            }
            this.rpcMaps.push(rpc);
            this.rpcMapsByName[rpcName] = rpc;
        }
        this.entityTypeKeyList = Object.keys(this.sortedUidsByType);
        return ret;
    }
    decodeEntityUpdate(buffer) {
        const tick = buffer.readUint32();
        const removedEntityCount = buffer.readVarint32();
        const entityUpdateData = this.entityUpdateData;
        entityUpdateData.tick = tick;
        this.entityUpdates.length = 0;
        this.removedEntitiesArr.length = 0;
        this.removedEntitiesObj = {};
        for (let i = 0; i < removedEntityCount; i++) {
            const uid = buffer.readUint32();
            this.removedEntitiesObj[uid] = 1;
            this.removedEntitiesArr.push(uid);
        }
        const brandNewEntityTypeCount = buffer.readVarint32();
        for (let i = 0; i < brandNewEntityTypeCount; i++) {
            const brandNewEntityCountForThisType = buffer.readVarint32();
            const brandNewEntityType = buffer.readUint32();
            const table = this.sortedUidsByType[brandNewEntityType];
            for (let j = 0; j < brandNewEntityCountForThisType; j++) {
                const brandNewEntityUid = buffer.readUint32();
                table.push(brandNewEntityUid);
            }
            this.changedEntityTypes[brandNewEntityType] = 1;
        }
        const SUBT = this.entityTypeKeyList || Object.keys(this.sortedUidsByType);
        for (let i = 0; i < SUBT.length; i++) {
            const entityType = SUBT[i];
            const table = this.sortedUidsByType[entityType];
            if (removedEntityCount > 0) {
                let index = 0;
                for (let j = 0; j < table.length; j++) {
                    const uid = table.data[j];
                    if (!(uid in this.removedEntitiesObj)) {
                        table.data[index++] = uid;
                    }
                }
                table.length = index;
            }
            if (entityType in this.changedEntityTypes) {
                table.sort();
                delete this.changedEntityTypes[entityType];
            }
        }
        while (buffer.remaining()) {
            const entityType = buffer.readUint32();
            if (!(entityType in this.attributeMaps)) {
                throw new Error(`Entity type is not in attribute map: ${entityType}`);
            }
            const absentEntitiesFlagsLength = Math.floor((this.sortedUidsByType[entityType].length + 7) / 8);
            this.absentEntitiesFlags.length < absentEntitiesFlagsLength && (this.absentEntitiesFlags = new Uint8Array(absentEntitiesFlagsLength < 64 ? 64 : absentEntitiesFlagsLength << 1));
            for (let i = 0; i < absentEntitiesFlagsLength; i++) {
                this.absentEntitiesFlags[i] = buffer.readUint8();
            }
            this.absentEntitiesFlagsUsed = absentEntitiesFlagsLength;
            const attributeMap = this.attributeMaps[entityType];
            const uidTable = this.sortedUidsByType[entityType];
            for (let tableIndex = 0; tableIndex < uidTable.length; tableIndex++) {
                const uid = uidTable.data[tableIndex];
                if ((this.absentEntitiesFlags[(tableIndex / 8) | 0] & (1 << (tableIndex % 8))) !== 0) {
                    continue;
                }
                const player = { uid: uid, updates: [] };
                const updatedEntityFlagsLength = Math.ceil(attributeMap.length / 8);
                this.updatedEntityFlags.length < updatedEntityFlagsLength && (this.updatedEntityFlags = new Uint8Array(updatedEntityFlagsLength < 32 ? 32 : updatedEntityFlagsLength << 1));
                for (let j = 0; j < updatedEntityFlagsLength; j++) {
                    this.updatedEntityFlags[j] = buffer.readUint8();
                }
                this.updatedEntityFlagsUsed = updatedEntityFlagsLength;
                for (let j = 0; j < attributeMap.length; j++) {
                    const attribute = attributeMap[j];
                    const flagIndex = (j / 8) | 0;
                    const bitIndex = j % 8;
                    let count;
                    if (this.updatedEntityFlags[flagIndex] & (1 << bitIndex)) {
                        let value;
                        switch (attribute.type) {
                            case attributeTypes.Uint32:
                                value = buffer.readUint32();
                                break;
                            case attributeTypes.Int32:
                                value = buffer.readInt32();
                                break;
                            case attributeTypes.Float:
                                value = buffer.readInt32() / 100;
                                break;
                            case attributeTypes.String:
                                value = this.safeReadVString(buffer);
                                break;
                            case attributeTypes.Vector2:
                                const x = buffer.readInt32() / 100;
                                const y = buffer.readInt32() / 100;
                                value = { x: x, y: y };
                                break;
                            case attributeTypes.ArrayVector2:
                                count = buffer.readInt32();
                                const pts = [];
                                for (let i = 0; i < count; i++) {
                                    const x_1 = buffer.readInt32() / 100;
                                    const y_1 = buffer.readInt32() / 100;
                                    pts.push({ x: x_1, y: y_1 });
                                }
                                value = pts;
                                break;
                            case attributeTypes.ArrayUint32:
                                count = buffer.readInt32();
                                const u32 = [];
                                for (let i = 0; i < count; i++) {
                                    const element = buffer.readInt32();
                                    u32.push(element);
                                }
                                value = u32;
                                break;
                            case attributeTypes.Uint16:
                                value = buffer.readUint16();
                                break;
                            case attributeTypes.Uint8:
                                value = buffer.readUint8();
                                break;
                            case attributeTypes.Int16:
                                value = buffer.readInt16();
                                break;
                            case attributeTypes.Int8:
                                value = buffer.readInt8();
                                break;
                            case attributeTypes.Uint64:
                                value = buffer.readUint32() + buffer.readUint32() * 4294967296;
                                break;
                            case attributeTypes.Int64:
                                let s64 = buffer.readUint32();
                                const s642 = buffer.readInt32();
                                if (s642 < 0) {
                                    s64 *= -1;
                                }
                                s64 += s642 * 4294967296;
                                value = s64;
                                break;
                            case attributeTypes.Double:
                                let s64d = buffer.readUint32();
                                const s64d2 = buffer.readInt32();
                                if (s64d2 < 0) {
                                    s64d *= -1;
                                }
                                s64d += s64d2 * 4294967296;
                                s64d = s64d / 100;
                                value = s64d;
                                break;
                            default:
                                throw new Error(`Unsupported attribute type: ${attribute.type}`);
                                break;
                        }
                        player.updates.push(attribute.name, value);
                    }
                }
                this.entityUpdates.push(player);
            }
        }
        entityUpdateData.byteSize = buffer.capacity();
        return entityUpdateData;
    }
    decodePing() {
        return {};
    }
    encodeRpc(buffer, item) {
        if (!(item.name in this.rpcMapsByName)) {
            throw new Error(`RPC not in map: ${item.name}`);
        }
        const rpc = this.rpcMapsByName[item.name];
        buffer.writeUint32(rpc.index);
        for (let i = 0; i < rpc.parameters.length; i++) {
            const param = item[rpc.parameters[i].name];
            switch (rpc.parameters[i].type) {
                case parameterTypes.Float:
                    buffer.writeInt32(Math.floor(param * 100));
                    break;
                case parameterTypes.Int32:
                    buffer.writeInt32(param);
                    break;
                case parameterTypes.String:
                    buffer.writeVString(param);
                    break;
                case parameterTypes.Uint32:
                    buffer.writeUint32(param);
                    break;
            }
        }
    }
    decodeRpcObject(buffer, parameters) {
        const result = {};
        for (let i = 0; i < parameters.length; i++) {
            switch (parameters[i].type) {
                case parameterTypes.Uint32:
                    result[parameters[i].name] = buffer.readUint32();
                    break;
                case parameterTypes.Int32:
                    result[parameters[i].name] = buffer.readInt32();
                    break;
                case parameterTypes.Float:
                    result[parameters[i].name] = buffer.readInt32() / 100;
                    break;
                case parameterTypes.String:
                    result[parameters[i].name] = this.safeReadVString(buffer);
                    break;
                case parameterTypes.Uint64:
                    result[parameters[i].name] = buffer.readUint32() + buffer.readUint32() * 4294967296;
                    break;
            }
        }
        return result;
    }
    decodeRpc(buffer) {
        const rpcIndex = buffer.readUint32();
        const rpc = this.rpcMaps[rpcIndex];
        const result = { name: rpc.name, response: null };
        if (!rpc.isArray) {
            result.response = this.decodeRpcObject(buffer, rpc.parameters);
        } else {
            const response = [];
            const count = buffer.readUint16();
            for (let i = 0; i < count; i++) {
                response.push(this.decodeRpcObject(buffer, rpc.parameters));
            }
            result.response = response;
        }
        return result;
    }
    encodeEnterWorld(buffer, item) {
        buffer.writeVString(item.displayName);
        for (let e = new Uint8Array(item.extra), i = 0; i < item.extra.byteLength; i++) {
            buffer.writeUint8(e[i]);
        }
    }
    encodeInput(buffer, item) {
        buffer.writeVString(JSON.stringify(item));
    }
    encodePing(buffer) {
        buffer.writeUint8(0);
    }
}

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

// ADICIONAR ISSO NO FINAL DO ARQUIVO:
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🔌 WebSocket disponível em: ws://localhost:${PORT}/ws`);
    console.log(`🌐 Interface web: http://localhost:${PORT}`);
});

setInterval(() => {
    serverMap.forEach((e) => {
        if (e.autoBreakIn) {
            new Bot(e.abiSessionName, e.abiName, e.id, e.abiPsk, false);
        }
    });
}, 15000);
