window.sockets = {};
window.socketsByUid = {};
window.opcode5Ids = {};
window.allEntities = new Map();

const defaultPassword2 = "#okxJ-,5fFwNQJ=^Zm6^wOHf}Hv.ec#XQX6SezPx8KP7zZZy3G";

if (!localStorage.password) localStorage.password = defaultPassword2;

const socketServers = {
    0: { socket: new WebSocket(`ws://${location.hostname}:8100`), alts: {} }
}

const getElement = (Element) => document.getElementsByClassName(Element);

const getId = (Element) => document.getElementById(Element);

(function () {
    const NS = (window.__blockedCellsOverlay = window.__blockedCellsOverlay || {});
    NS.map = NS.map || new Map();
    if (typeof NS.enabled !== "boolean") NS.enabled = false;
    NS.lastAt = NS.lastAt || 0;
    const getEntityEntries = (entities) => {
        if (entities instanceof Map) return entities.entries();
        return Object.entries(entities || {});
    }
    const makeSprite = (w, h, tint) => {
        const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
        sprite.anchor.set(0.5);
        sprite.width = w;
        sprite.height = h;
        sprite.tint = tint;
        sprite.alpha = 0.25;
        return sprite;
    }
    const clearAll = () => {
        NS.map.forEach((node) => {
            if (node.parent) node.parent.removeChild(node);
            if (node.destroy) node.destroy({ texture: false, baseTexture: false });
        });
        NS.map.clear();
    }
    const tick = () => {
        if (!NS.enabled) return;
        const now = performance.now();
        if (now - NS.lastAt < 50 || document.hidden) return;
        NS.lastAt = now;
        if (typeof game === "undefined" || !game.world || !game.world.inWorld) return;
        if (!game.ui || !game.ui.buildingSchema) return;
        if (!game.renderer || !game.renderer.npcs || !game.renderer.npcs.node) return;
        const schema = game.ui.buildingSchema;
        const container = game.renderer.npcs.node;
        const seen = new Set();
        const entities = game.world.entities;
        if (!entities) return;
        for (const [key, e] of getEntityEntries(entities)) {
            const entity = e && e.targetTick;
            if (!entity || !entity.model || !e.isVisible || !entity.position) continue;
            const model = entity.model;
            const pos = entity.position;
            let w = 0;
            let h = 0;
            let px = 0;
            let py = 0;
            let tint = 0xc80000;
            if (model in schema) {
                if (model === "Harvester" || model === "SlowTrap") continue;
                w = schema[model].gridWidth * 48;
                h = schema[model].gridHeight * 48;
                px = pos.x + 24;
                py = pos.y + 24;
                if (model === "GoldStash") tint = 0xffd200;
            } else if (model === "Tree" || model === "Stone" || model === "NeutralCamp") {
                let minCx, maxCx, minCy, maxCy;
                if (model === "NeutralCamp") {
                    const cx = Math.floor(pos.x / 48);
                    const cy = Math.floor(pos.y / 48);
                    minCx = maxCx = cx;
                    minCy = maxCy = cy;
                } else {
                    const rad = model === "Tree" ? 70 : 50;
                    minCx = Math.floor((pos.x - rad) / 48);
                    maxCx = Math.floor((pos.x + rad) / 48);
                    minCy = Math.floor((pos.y - rad) / 48);
                    maxCy = Math.floor((pos.y + rad) / 48);
                }
                const minX = minCx * 48;
                const maxX = (maxCx + 1) * 48;
                const minY = minCy * 48;
                const maxY = (maxCy + 1) * 48;
                w = maxX - minX;
                h = maxY - minY;
                px = (minX + maxX) * 0.5 + 24;
                py = (minY + maxY) * 0.5 + 24;
            } else {
                continue;
            }
            const uid = e.uid ?? key;
            seen.add(uid);
            let node = NS.map.get(uid);
            if (!node) {
                node = makeSprite(w, h, tint);
                container.addChild(node);
                NS.map.set(uid, node);
            } else {
                if (node.width !== w) node.width = w;
                if (node.height !== h) node.height = h;
                node.tint = tint;
            }
            node.position.set(px, py);
        }
        NS.map.forEach((node, uid) => {
            if (seen.has(uid)) return;
            if (node.parent) node.parent.removeChild(node);
            if (node.destroy) node.destroy({ texture: false, baseTexture: false });
            NS.map.delete(uid);
        });
    }
    const ensureInit = () => {
        if (NS.init) return true;
        if (typeof game === "undefined" || !game.renderer || typeof game.renderer.addTickCallback !== "function") return false;
        NS.init = true;
        game.renderer.addTickCallback(tick);
        return true;
    }
    NS.on = () => {
        NS.enabled = true;
        ensureInit();
    }
    NS.off = () => {
        NS.enabled = false;
        clearAll();
    }
    NS.toggle = () => {
        NS.enabled ? NS.off() : NS.on();
    }
    window.zombsRenderActions = window.zombsRenderActions || {};
    window.zombsRenderActions["blocked-areas"] = {
        getLabel: () => "Show Blocked Areas",
        isActive: () => !!NS.enabled,
        toggle: () => NS.toggle()
    }
})();

class Scripts {
    constructor() {
        this.autoheal = true;
        this.autopetpotion = false;
        this.autopetheal = false;
        this.autorevivepets = false;
        this.autoevolvepets = false;
        this.autobow = false;
        this.autobuild = false;
        this.autoupgrade = false;
        this.ahrc = false;
        this.upgradeall = false;
        this.sellall = false;
        this.uth = false;
        this.towerheal = false;
        this.autotimeout = false;
        this.autofollow = false;
        this.autoaim = false;
        this.clearchat = false;
        this.showrss = false;
        this.mousemove = false;
        this.positionlock = false;
        this.wasd = false;
        this.autorespawn = true;
        this.autorefiller = false;
        this.autoreconnect = false;
        this.autoaltjoin = false;
        this.autospear = false;
        this.chatspam = false;
        this.xkey = false;
        this.playerfinder = false;
        this.autoshield = false;
        this.scorelogger = false;
        this.walls3x3 = false;
        this.walls5x5 = false;
        this.walls7x7 = false;
        this.walls9x9 = false;
        this.harvs4x4 = false;
        this.harvs8x8 = false;
        this.joindelay = false;
        this.sesswitcher = false;
        this.singlescorelogger = false;
    }
}

class Script {
    constructor() {
        game.network.addPacketHandler(4, (data) => {
            this.onEnterWorld(data);
        });
        game.network.addPacketHandler(9, (data) => {
            this.onRpc(data);
        });
        game.network.addPacketHandler(0, (data) => {
            this.onEntityUpdate(data);
        });
        document.addEventListener("keydown", (e) => {
            this.onKeyDown(e);
        });
        document.addEventListener("keyup", (e) => {
            this.onKeyUp(e);
        });
        document.addEventListener("mousedown", (e) => {
            this.onMouseDown(e);
        });
        document.addEventListener("mouseup", (e) => {
            this.onMouseUp(e);
        });
        game.network.sendRpc2 = game.network.sendRpc;
        game.network.sendRpc = (e) => {
            this.onSendRpc(e);
        }
        for (let num in socketServers) {
            socketServers[num].socket.binaryType = "arraybuffer";
            this.connect(num);
        }
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
        this.scripts = new Scripts();
        this.harvesters = new Map();
        this.rebuilder = new Map();
        this.reupgrader = new Map();
        this.inactiveRebuilder = new Map();
        this.inactiveReupgrader = new Map();
        this.upgradeTicks = 9;
        this.rssTicks = 1;
        this.arfTicks = 199;
        this.pingTicks = 9;
        this.staleTicks = 599;
        this.nearestPlayerDistance = Infinity;
        this.healHealth = 20;
        this.petHealHealth = 70;
        this.uthHealth = 30;
        this.towerHealHealth = 30;
        this.players = 0;
        this.dayFiller = true;
        this.nightFiller = true;
        this.counts = 0;
        this.goldCosts = [1400, 4200, 10000, 21000, 43500, 88500, 178500];
        this.xKeyWeapon = "Bomb";
        this.chatVisibility = "all";
        this.petToSpawn = "PetCARL";
        this.chatSpamMessage = "W".repeat(249);
        this.nearestAltCount = 1;
        this.spearTier = 1;
        this.requiredGold = 1400;
        this.mousePs = { x: 0, y: 0 };
        this.id = 0;
        this.num = 0;
        this.aspw = 0;
        this.hspw = 0;
        this.spws = [];
        this.allScores = [];
        this.currentId = 0;
        this.currentScore = 0;
        this.scoreLoggerRows = [];
        this.scoreLoggerBases = {};
        this.scoreLoggerCombinedSpws = [];
        this.scoreLoggerLogRows = [];
        this.scoreLoggerLogCount = 0;
        this.scoreLoggerSearch = "";
        this.scoreLoggerHighScore = null;
        this.scoreLoggerLowScore = null;
        this.scoreLoggerPrimed = false;
        this.scoreLoggerActivationCycleKey = null;
        this.scoreLoggerCurrentCycleKey = null;
        this.scoreLoggerCurrentIsDay = null;
        this.scoreLoggerLastNightKey = null;
        this.scoreLoggerLastCycleKey = null;
        this.scoreLoggerStatus = "Off";
        this.appliedRenderStates = new Set();
        this.messagesToSend = [];
        this.sessionScripts = {};
        this.zombsLeaderboardState = {
            category: localStorage.zombsLeaderboardCategory || "wave",
            time: localStorage.zombsLeaderboardTime || "24h",
            parties: [],
            loading: false,
            error: "",
            lastUpdated: 0
        }
        this.s = {};
        this.yaw = 0;
        this.round = 0;
        this.m = 0;
        this.automove = true;
        this.isReadyToScanSpots = false;
        this.stoppedmovingrightorleft = false;
        this.stoppedmovingupordown = false;
        this.hascompletedmovingfromtop = false;
        this.hascompletedmovingfrombottom = false;
        this.shouldMoveDown = false;
        this.shouldMoveUp = false;
        this.needsToCompleteTop = false;
        this.needsToCompleteBottom = false;
        this.createScriptMenu();
        this.enableDraggableSettingsMenu();
        this.enableResizableSettingsMenu();
        this.enableDraggableScoreLogsMenu();
        this.enableResizableScoreLogsMenu();
        this.enablePlacementMenuMode();
        this.createVpsSessionPanel();
        this.createZombsLeaderboardPanel();
        game.network.emitter.removeListener("PACKET_RPC", game.network.emitter._events.PACKET_RPC[1]);
        this.installScoreLoggerRpcHandlers();
    }
    createVpsSessionPanel() {
        const anchor = document.querySelector(".hud-top-right");
        const sourceDropdown = document.getElementsByClassName("dropdown")[0];
        if (document.querySelector(".hud-vps-session-panel")) return;
        if (!anchor || !sourceDropdown) {
            clearTimeout(this.vpsSessionPanelRetry);
            this.vpsSessionPanelRetry = setTimeout(() => this.createVpsSessionPanel(), 500);
            return;
        }
        const panel = document.createElement("div");
        panel.className = "hud-vps-session-panel";
        panel.style.display = "none";
        panel.innerHTML = `
            <div class="hud-vps-session-header">
                <div class="hud-vps-session-picker">
                    <select class="hud-vps-session-server" id="hud-vps-session-server" tabindex="-1" aria-hidden="true">${sourceDropdown.innerHTML}</select>
                    <button class="hud-vps-session-selected" type="button">Pick VPS</button>
                    <div class="hud-vps-session-menu"></div>
                </div>
                <button class="hud-vps-session-refresh" type="button">Refresh</button>
            </div>
            <div class="hud-vps-session-status">Pick a VPS</div>
            <div class="hud-vps-session-list"></div>
            <div class="hud-vps-session-resize-edge is-top" data-resize="n"></div>
            <div class="hud-vps-session-resize-edge is-right" data-resize="e"></div>
            <div class="hud-vps-session-resize-edge is-bottom" data-resize="s"></div>
            <div class="hud-vps-session-resize-edge is-left" data-resize="w"></div>
            <div class="hud-vps-session-resize-edge is-top-left" data-resize="nw"></div>
            <div class="hud-vps-session-resize-edge is-top-right" data-resize="ne"></div>
            <div class="hud-vps-session-resize-edge is-bottom-left" data-resize="sw"></div>
            <div class="hud-vps-session-resize-edge is-bottom-right" data-resize="se"></div>
        `;
        anchor.appendChild(panel);
        this.applyVpsSessionPanelGeometry(panel);
        this.enableVpsSessionPanelDragResize(panel);
        const serverSelect = panel.querySelector(".hud-vps-session-server");
        const serverPicker = panel.querySelector(".hud-vps-session-picker");
        const serverSelected = panel.querySelector(".hud-vps-session-selected");
        const serverMenu = panel.querySelector(".hud-vps-session-menu");
        const refreshButton = panel.querySelector(".hud-vps-session-refresh");
        const sessionList = panel.querySelector(".hud-vps-session-list");
        serverSelect.value = sourceDropdown.value;
        const updateServerPickerLabel = () => {
            if (!serverSelected) return;
            serverSelected.textContent = serverSelect.selectedOptions[0]?.textContent || serverSelect.value || "Pick VPS";
        }
        const renderServerMenu = () => {
            if (!serverMenu) return;
            const optionHtml = (option) => {
                const value = Sanitize(option.value);
                const label = Sanitize(option.textContent || option.value);
                const activeClass = option.value === serverSelect.value ? " is-active" : "";
                return `<button class="hud-vps-session-option${activeClass}" type="button" data-value="${value}">${label}</button>`;
            }
            let html = "";
            Array.from(serverSelect.children).forEach((child) => {
                if (child.tagName === "OPTGROUP") {
                    html += `<div class="hud-vps-session-option-group">${Sanitize(child.label || "")}</div>`;
                    Array.from(child.children).forEach((option) => {
                        if (option.tagName === "OPTION") html += optionHtml(option);
                    });
                } else if (child.tagName === "OPTION") {
                    html += optionHtml(child);
                }
            });
            serverMenu.innerHTML = html;
        }
        updateServerPickerLabel();
        renderServerMenu();
        const stopGameInput = (event) => event.stopPropagation();
        ["mousedown", "mouseup", "click", "dblclick", "wheel", "keydown", "keyup", "mousemove", "pointermove", "mouseover", "pointerover"].forEach((eventName) => {
            panel.addEventListener(eventName, stopGameInput);
        });
        if (sessionList) {
            sessionList.addEventListener("wheel", (event) => {
                if (sessionList.scrollHeight <= sessionList.clientHeight) return;
                event.preventDefault();
                event.stopPropagation();
                const maxScroll = sessionList.scrollHeight - sessionList.clientHeight;
                sessionList.scrollTop = Math.max(0, Math.min(maxScroll, sessionList.scrollTop + event.deltaY));
            }, { passive: false });
        }
        const requestSessionsAfterReconnect = (attempt = 0) => {
            if (typeof user === "undefined" || !user || !user.ws) return;
            if (user.ws.readyState === 1) {
                user.getSessions();
                this.updateVpsSessionPanel();
                return;
            }
            if (attempt < 20) {
                setTimeout(() => requestSessionsAfterReconnect(attempt + 1), 250);
            }
        }
        const reconnectToSelectedVps = () => {
            const selectedValue = serverSelect.value;
            sourceDropdown.value = selectedValue;
            if (typeof user === "undefined" || !user) return;
            user.activeSessions = {};
            user.connectedToId = null;
            updateServerPickerLabel();
            renderServerMenu();
            this.updateVpsSessionPanel("Connecting...");
            user.reconnect();
            setTimeout(() => requestSessionsAfterReconnect(), 300);
            setTimeout(() => requestSessionsAfterReconnect(), 1200);
        }
        serverSelect.addEventListener("change", reconnectToSelectedVps);
        serverSelected.addEventListener("click", () => {
            renderServerMenu();
            serverPicker.classList.toggle("is-open");
        });
        serverMenu.addEventListener("click", (event) => {
            const option = event.target.closest(".hud-vps-session-option");
            if (!option) return;
            serverSelect.value = option.dataset.value;
            serverPicker.classList.remove("is-open");
            reconnectToSelectedVps();
        });
        document.addEventListener("mousedown", (event) => {
            if (!panel.contains(event.target)) serverPicker.classList.remove("is-open");
        });
        refreshButton.addEventListener("click", () => {
            if (typeof user !== "undefined" && user && user.getSessions) {
                user.getSessions();
            }
            this.updateVpsSessionPanel("Refreshing...");
        });
        const warmSessionFromButton = (event) => {
            const sessionButton = event.target.closest(".hud-vps-session-item");
            if (!sessionButton || typeof user === "undefined" || !user) return;
            const id = parseInt(sessionButton.dataset.sessionId);
            if (!Number.isFinite(id)) return;
            if (user.showSessionPreview) {
                user.showSessionPreview(id);
                this.updateVpsSessionPanel(`Previewing Session #${id}...`);
                return;
            }
            if (user.prefetchSession && user.prefetchSession(id)) {
                this.updateVpsSessionPanel(`Warming Session #${id}...`);
            }
        };
        const stopSessionPreviewFromButton = (event) => {
            const sessionButton = event.target.closest(".hud-vps-session-item");
            if (!sessionButton || typeof user === "undefined" || !user || !user.stopSessionPreview) return;
            if (sessionButton.contains(event.relatedTarget)) return;
            user.stopSessionPreview(parseInt(sessionButton.dataset.sessionId));
        };
        panel.addEventListener("pointerover", warmSessionFromButton);
        panel.addEventListener("pointerout", stopSessionPreviewFromButton);
        panel.addEventListener("focusin", warmSessionFromButton);
        panel.addEventListener("focusout", stopSessionPreviewFromButton);
        panel.addEventListener("click", (event) => {
            const sessionButton = event.target.closest(".hud-vps-session-item");
            if (!sessionButton || typeof user === "undefined" || !user) return;
            const id = parseInt(sessionButton.dataset.sessionId);
            if (!Number.isFinite(id)) return;
            const sameVpsSwitch = !!user.connectedToId && serverSelect.value === sourceDropdown.value;
            user.verify(id, { skipLoadingAnimation: sameVpsSwitch });
            this.updateVpsSessionPanel(`Joined Session #${id}`);
        });
        this.vpsSessionStatus = "Ready";
        this.vpsSessionPanelInterval = setInterval(() => this.updateVpsSessionPanel(), 500);
        this.updateVpsSessionPanel();
    }
    getDefaultVpsSessionPanelGeometry(panel) {
        const leaderboard = document.querySelector("#hud-leaderboard");
        const width = panel.offsetWidth || 268;
        const height = panel.offsetHeight || 178;
        if (leaderboard) {
            const rect = leaderboard.getBoundingClientRect();
            return {
                left: rect.right - width,
                top: rect.bottom + 8,
                width,
                height
            }
        }
        return {
            left: window.innerWidth - width - 20,
            top: 258,
            width,
            height
        }
    }
    clampVpsSessionPanelGeometry(geometry) {
        const minWidth = 220;
        const minHeight = 118;
        const maxWidth = Math.max(minWidth, window.innerWidth - 8);
        const maxHeight = Math.max(minHeight, window.innerHeight - 8);
        const width = Math.max(minWidth, Math.min(maxWidth, Number(geometry.width) || minWidth));
        const height = Math.max(minHeight, Math.min(maxHeight, Number(geometry.height) || minHeight));
        const left = Math.max(4, Math.min(window.innerWidth - width - 4, Number(geometry.left) || 4));
        const top = Math.max(4, Math.min(window.innerHeight - height - 4, Number(geometry.top) || 4));
        return { left, top, width, height };
    }
    applyVpsSessionPanelGeometry(panel) {
        const storageKey = "vpsSessionPanelGeometry";
        let geometry = null;
        try {
            geometry = JSON.parse(localStorage.getItem(storageKey) || "null");
        } catch {
            geometry = null;
        }
        geometry = this.clampVpsSessionPanelGeometry(geometry || this.getDefaultVpsSessionPanelGeometry(panel));
        panel.style.left = `${geometry.left}px`;
        panel.style.top = `${geometry.top}px`;
        panel.style.width = `${geometry.width}px`;
        panel.style.height = `${geometry.height}px`;
    }
    saveVpsSessionPanelGeometry(panel) {
        const rect = panel.getBoundingClientRect();
        localStorage.setItem("vpsSessionPanelGeometry", JSON.stringify({
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        }));
    }
    enableVpsSessionPanelDragResize(panel) {
        if (!panel || panel.dataset.dragResize === "true") return;
        panel.dataset.dragResize = "true";
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const isInteractiveTarget = (target) => !!target.closest("select, option, button, input, textarea, a, .hud-vps-session-picker, .hud-vps-session-item, .hud-vps-session-resize-edge");
        let dragging = false;
        let resizing = false;
        let resizeDirection = "";
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        let startWidth = 0;
        let startHeight = 0;
        const onMove = (event) => {
            if (!dragging && !resizing) return;
            if (event.buttons === 0) {
                onUp();
                return;
            }
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            if (dragging) {
                const width = panel.offsetWidth;
                const height = panel.offsetHeight;
                panel.style.left = `${clamp(startLeft + dx, 4, window.innerWidth - width - 4)}px`;
                panel.style.top = `${clamp(startTop + dy, 4, window.innerHeight - height - 4)}px`;
            }
            if (resizing) {
                let nextLeft = startLeft;
                let nextTop = startTop;
                let nextWidth = startWidth;
                let nextHeight = startHeight;
                if (resizeDirection.includes("e")) {
                    nextWidth = clamp(startWidth + dx, 220, window.innerWidth - startLeft - 4);
                }
                if (resizeDirection.includes("s")) {
                    nextHeight = clamp(startHeight + dy, 118, window.innerHeight - startTop - 4);
                }
                if (resizeDirection.includes("w")) {
                    const maxLeft = startLeft + startWidth - 220;
                    nextLeft = clamp(startLeft + dx, 4, maxLeft);
                    nextWidth = startWidth + startLeft - nextLeft;
                }
                if (resizeDirection.includes("n")) {
                    const maxTop = startTop + startHeight - 118;
                    nextTop = clamp(startTop + dy, 4, maxTop);
                    nextHeight = startHeight + startTop - nextTop;
                }
                panel.style.left = `${nextLeft}px`;
                panel.style.top = `${nextTop}px`;
                panel.style.width = `${nextWidth}px`;
                panel.style.height = `${nextHeight}px`;
            }
            event.preventDefault();
        }
        const onUp = () => {
            if (dragging || resizing) {
                this.saveVpsSessionPanelGeometry(panel);
            }
            dragging = false;
            resizing = false;
            resizeDirection = "";
            panel.classList.remove("is-dragging", "is-resizing");
            document.removeEventListener("mousemove", onMove, true);
            document.removeEventListener("mouseup", onUp, true);
            window.removeEventListener("blur", onUp);
        }
        const beginPointerAction = (event, mode, direction = "") => {
            if (event.button !== 0) return;
            const rect = panel.getBoundingClientRect();
            startX = event.clientX;
            startY = event.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            startWidth = rect.width;
            startHeight = rect.height;
            dragging = mode === "drag";
            resizing = mode === "resize";
            resizeDirection = direction;
            panel.classList.toggle("is-dragging", dragging);
            panel.classList.toggle("is-resizing", resizing);
            event.preventDefault();
            event.stopPropagation();
            document.addEventListener("mousemove", onMove, true);
            document.addEventListener("mouseup", onUp, true);
            window.addEventListener("blur", onUp);
        }
        panel.addEventListener("mousedown", (event) => {
            if (isInteractiveTarget(event.target)) return;
            beginPointerAction(event, "drag");
        });
        panel.querySelectorAll(".hud-vps-session-resize-edge").forEach((handle) => {
            handle.addEventListener("mousedown", (event) => beginPointerAction(event, "resize", handle.dataset.resize || ""));
        });
        window.addEventListener("resize", () => {
            const geometry = this.clampVpsSessionPanelGeometry(panel.getBoundingClientRect());
            panel.style.left = `${geometry.left}px`;
            panel.style.top = `${geometry.top}px`;
            panel.style.width = `${geometry.width}px`;
            panel.style.height = `${geometry.height}px`;
            this.saveVpsSessionPanelGeometry(panel);
        });
    }
    updateVpsSessionPanel(statusOverride = null) {
        const panel = document.querySelector(".hud-vps-session-panel");
        const sourceDropdown = document.getElementsByClassName("dropdown")[0];
        if (!panel || !sourceDropdown) return;
        const serverSelect = panel.querySelector(".hud-vps-session-server");
        const serverSelected = panel.querySelector(".hud-vps-session-selected");
        const statusElem = panel.querySelector(".hud-vps-session-status");
        const listElem = panel.querySelector(".hud-vps-session-list");
        if (!serverSelect || !statusElem || !listElem) return;
        if (serverSelect.value !== sourceDropdown.value) {
            serverSelect.value = sourceDropdown.value;
        }
        if (serverSelected) {
            serverSelected.textContent = serverSelect.selectedOptions[0]?.textContent || serverSelect.value || "Pick VPS";
        }
        const activeSessions = typeof user !== "undefined" && user && user.activeSessions ? user.activeSessions : {};
        const sessions = Object.values(activeSessions).sort((a, b) => (a.sessionUserId || 0) - (b.sessionUserId || 0));
        const connectedId = typeof user !== "undefined" && user ? user.connectedToId : null;
        const socketReady = typeof user !== "undefined" && user && user.ws && user.ws.readyState === 1;
        statusElem.textContent = statusOverride || (socketReady ? `${sessions.length} session${sessions.length === 1 ? "" : "s"} on ${serverSelect.value}` : `Connecting to ${serverSelect.value}`);
        if (!sessions.length) {
            listElem.innerHTML = `<div class="hud-vps-session-empty">${socketReady ? "No sessions on this VPS." : "Waiting for VPS..."}</div>`;
            return;
        }
        listElem.innerHTML = sessions.map((session) => {
            const actualId = parseInt(session.actualUserId);
            const shownId = parseInt(session.sessionUserId);
            const name = Sanitize(session.sessionName || "Session");
            const isConnected = actualId === connectedId;
            return `
                <button class="hud-vps-session-item${isConnected ? " is-active" : ""}" type="button" data-session-id="${actualId}">
                    <span>${name}</span>
                    <small>[${actualId} | ${shownId}]</small>
                </button>
            `;
        }).join("");
    }
    getZombsLeaderboardState() {
        const state = this.zombsLeaderboardState || {};
        if (!["wave", "score"].includes(state.category)) state.category = "wave";
        if (!["24h", "7d", "all"].includes(state.time)) state.time = "7d";
        state.parties = Array.isArray(state.parties) ? state.parties : [];
        state.error = state.error || "";
        this.zombsLeaderboardState = state;
        return state;
    }
    createZombsLeaderboardPanel() {
        const anchor = document.querySelector("#hud-intro");
        const existingPanel = document.querySelector(".hud-zombs-lb-panel");
        if (existingPanel && existingPanel.closest("#hud-intro")) return;
        if (existingPanel) existingPanel.remove();
        if (!anchor) {
            clearTimeout(this.zombsLeaderboardRetry);
            this.zombsLeaderboardRetry = setTimeout(() => this.createZombsLeaderboardPanel(), 500);
            return;
        }
        const panel = document.createElement("div");
        panel.className = "hud-zombs-lb-panel";
        anchor.appendChild(panel);
        const stopGameInput = (event) => event.stopPropagation();
        ["mousedown", "mouseup", "click", "dblclick", "wheel", "keydown", "keyup", "keypress", "mousemove", "pointermove", "mouseover", "pointerover"].forEach((eventName) => {
            panel.addEventListener(eventName, stopGameInput);
        });
        panel.addEventListener("change", (event) => {
            const state = this.getZombsLeaderboardState();
            if (event.target.classList.contains("hud-zombs-lb-category")) {
                state.category = event.target.value;
                localStorage.zombsLeaderboardCategory = state.category;
                this.fetchZombsLeaderboard();
            }
            if (event.target.classList.contains("hud-zombs-lb-time")) {
                state.time = event.target.value;
                localStorage.zombsLeaderboardTime = state.time;
                this.fetchZombsLeaderboard();
            }
        });
        this.renderZombsLeaderboardPanel();
        this.fetchZombsLeaderboard();
        clearInterval(this.zombsLeaderboardInterval);
        this.zombsLeaderboardInterval = setInterval(() => {
            if (!document.hidden) this.fetchZombsLeaderboard(false);
        }, 300000);
    }
    renderZombsLeaderboardPanel() {
        const panel = document.querySelector(".hud-zombs-lb-panel");
        if (!panel) return;
        const state = this.getZombsLeaderboardState();
        const category = state.category;
        const time = state.time;
        const rows = state.parties.slice(0, 5);
        const formatValue = (value) => (Number(value) || 0).toLocaleString();
        const rowValues = rows.map((party) => formatValue(category === "score" ? party.score : party.wave));
        const rowHtml = rows.length ? rows.map((party, index) => {
            const players = Array.isArray(party.players) ? party.players : [];
            const name = players.length ? players.join(", ") : (party.name || "Unknown");
            const value = rowValues[index];
            return `
                <div class="hud-zombs-lb-row">
                    <strong>${Sanitize(value)}</strong>
                    <span class="hud-zombs-lb-name">${Sanitize(name)}</span>
                </div>
            `;
        }).join("") : `<div class="hud-zombs-lb-empty">${Sanitize(state.loading ? "Loading..." : (state.error || "No leaderboard data."))}</div>`;
        panel.innerHTML = `
            <div class="hud-zombs-lb-header">
                <span>Top</span>
                <select class="hud-zombs-lb-category" name="lbCategory" aria-label="Leaderboard type">
                    <option value="wave"${category === "wave" ? " selected" : ""}>Wave</option>
                    <option value="score"${category === "score" ? " selected" : ""}>Score</option>
                </select>
                <span>For</span>
                <select class="hud-zombs-lb-time" name="lbTime" aria-label="Leaderboard time">
                    <option value="24h"${time === "24h" ? " selected" : ""}>Today</option>
                    <option value="7d"${time === "7d" ? " selected" : ""}>This Week</option>
                    <option value="all"${time === "all" ? " selected" : ""}>All Time</option>
                </select>
            </div>
            <div class="hud-zombs-lb-list">${rowHtml}</div>
        `;
    }
    async fetchZombsLeaderboard(showLoading = true) {
        const state = this.getZombsLeaderboardState();
        if (state.loading) return;
        state.loading = !!showLoading;
        state.error = "";
        if (showLoading) this.renderZombsLeaderboardPanel();
        try {
            const response = await fetch(`/zombs-leaderboard?category=${encodeURIComponent(state.category)}&time=${encodeURIComponent(state.time)}`, { cache: "no-store" });
            if (!response.ok) throw new Error(response.status === 404 ? "Restart Banshee to load LB." : "Leaderboard unavailable.");
            const data = await response.json();
            if (data.status !== "success" || !Array.isArray(data.parties)) throw new Error("invalid data");
            state.parties = data.parties;
            state.lastUpdated = Date.now();
        } catch (error) {
            state.error = error && error.message ? error.message : "Leaderboard unavailable.";
            state.parties = [];
        } finally {
            state.loading = false;
            this.renderZombsLeaderboardPanel();
        }
    }
    enableDraggableSettingsMenu() {
        const menu = document.querySelector(".hud-menu-settings");
        if (!menu || menu.dataset.draggable === "true") return;
        menu.dataset.draggable = "true";
        const dragHandle = menu.querySelector("h3") || menu;
        const dragAreaHeight = 68;
        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const startDrag = (event) => {
            const rect = menu.getBoundingClientRect();
            if (event.button !== 0 || event.clientY - rect.top > dragAreaHeight || event.target.closest(".hud-menu-close, .hud-script-tab, .hud-script-toggle, .hud-session-toggle, .hud-session-action, input, textarea, select, button")) return;
            dragging = true;
            startX = event.clientX;
            startY = event.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            menu.classList.add("is-dragging");
            menu.style.left = `${startLeft}px`;
            menu.style.top = `${startTop}px`;
            menu.style.margin = "0";
            event.preventDefault();
            event.stopPropagation();
        }
        const moveDrag = (event) => {
            if (!dragging) return;
            const nextLeft = clamp(startLeft + event.clientX - startX, 8, window.innerWidth - menu.offsetWidth - 8);
            const nextTop = clamp(startTop + event.clientY - startY, 8, window.innerHeight - menu.offsetHeight - 8);
            menu.style.left = `${nextLeft}px`;
            menu.style.top = `${nextTop}px`;
            event.preventDefault();
        }
        const stopDrag = () => {
            if (!dragging) return;
            dragging = false;
            menu.classList.remove("is-dragging");
        }
        dragHandle.addEventListener("mousedown", startDrag);
        menu.addEventListener("mousedown", startDrag);
        document.addEventListener("mousemove", moveDrag, true);
        document.addEventListener("mouseup", stopDrag, true);
        window.addEventListener("blur", stopDrag);
        window.addEventListener("resize", () => {
            const rect = menu.getBoundingClientRect();
            if (getComputedStyle(menu).display === "none") return;
            menu.style.left = `${clamp(rect.left, 8, window.innerWidth - menu.offsetWidth - 8)}px`;
            menu.style.top = `${clamp(rect.top, 8, window.innerHeight - menu.offsetHeight - 8)}px`;
            menu.style.margin = "0";
        });
    }
    enableResizableSettingsMenu() {
        const menu = document.querySelector(".hud-menu-settings");
        if (!menu || menu.dataset.resizable === "true") return;
        menu.dataset.resizable = "true";
        const directions = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
        directions.forEach((direction) => {
            const handle = document.createElement("div");
            handle.className = `hud-menu-resize-handle hud-menu-resize-${direction}`;
            handle.dataset.resizeDirection = direction;
            menu.appendChild(handle);
        });
        let resizing = false;
        let resizeDirection = "";
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        let startWidth = 0;
        let startHeight = 0;
        const minWidth = 760;
        const minHeight = 430;
        const startResize = (event) => {
            if (event.button !== 0) return;
            const rect = menu.getBoundingClientRect();
            resizing = true;
            resizeDirection = event.currentTarget.dataset.resizeDirection;
            startX = event.clientX;
            startY = event.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            startWidth = rect.width;
            startHeight = rect.height;
            menu.classList.add("is-resizing");
            menu.style.left = `${rect.left}px`;
            menu.style.top = `${rect.top}px`;
            menu.style.margin = "0";
            event.preventDefault();
            event.stopPropagation();
        }
        const moveResize = (event) => {
            if (!resizing) return;
            let nextLeft = startLeft;
            let nextTop = startTop;
            let nextWidth = startWidth;
            let nextHeight = startHeight;
            if (resizeDirection.includes("e")) {
                nextWidth = Math.max(minWidth, Math.min(window.innerWidth - startLeft - 8, startWidth + event.clientX - startX));
            }
            if (resizeDirection.includes("s")) {
                nextHeight = Math.max(minHeight, Math.min(window.innerHeight - startTop - 8, startHeight + event.clientY - startY));
            }
            if (resizeDirection.includes("w")) {
                const maxLeft = startLeft + startWidth - minWidth;
                nextLeft = Math.max(8, Math.min(maxLeft, startLeft + event.clientX - startX));
                nextWidth = startWidth + startLeft - nextLeft;
            }
            if (resizeDirection.includes("n")) {
                const maxTop = startTop + startHeight - minHeight;
                nextTop = Math.max(8, Math.min(maxTop, startTop + event.clientY - startY));
                nextHeight = startHeight + startTop - nextTop;
            }
            menu.style.left = `${nextLeft}px`;
            menu.style.top = `${nextTop}px`;
            menu.style.width = `${nextWidth}px`;
            menu.style.height = `${nextHeight}px`;
            menu.style.setProperty("--settings-grid-height", `${Math.max(260, nextHeight - 110)}px`);
            event.preventDefault();
        }
        const stopResize = () => {
            if (!resizing) return;
            resizing = false;
            resizeDirection = "";
            menu.classList.remove("is-resizing");
        }
        menu.querySelectorAll(".hud-menu-resize-handle").forEach((handle) => handle.addEventListener("mousedown", startResize));
        document.addEventListener("mousemove", moveResize, true);
        document.addEventListener("mouseup", stopResize, true);
        window.addEventListener("blur", stopResize);
    }
    enableDraggableScoreLogsMenu() {
        const menu = document.querySelector(".hud-menu-FPS");
        if (!menu || menu.dataset.draggable === "true") return;
        menu.dataset.draggable = "true";
        const noDragSelector = ".hud-menu-close, .hud-menu-resize-handle, input, textarea, select, button, a, [contenteditable='true']";
        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const startDrag = (event) => {
            const rect = menu.getBoundingClientRect();
            if (event.button !== 0 || event.target.closest(noDragSelector)) return;
            dragging = true;
            startX = event.clientX;
            startY = event.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            menu.classList.add("is-dragging");
            menu.style.left = `${startLeft}px`;
            menu.style.top = `${startTop}px`;
            menu.style.margin = "0";
            event.preventDefault();
            event.stopPropagation();
        }
        const moveDrag = (event) => {
            if (!dragging) return;
            const nextLeft = clamp(startLeft + event.clientX - startX, 8, window.innerWidth - menu.offsetWidth - 8);
            const nextTop = clamp(startTop + event.clientY - startY, 8, window.innerHeight - menu.offsetHeight - 8);
            menu.style.left = `${nextLeft}px`;
            menu.style.top = `${nextTop}px`;
            event.preventDefault();
        }
        const stopDrag = () => {
            if (!dragging) return;
            dragging = false;
            menu.classList.remove("is-dragging");
        }
        menu.addEventListener("mousedown", startDrag);
        document.addEventListener("mousemove", moveDrag, true);
        document.addEventListener("mouseup", stopDrag, true);
        window.addEventListener("blur", stopDrag);
        window.addEventListener("resize", () => {
            const rect = menu.getBoundingClientRect();
            if (getComputedStyle(menu).display === "none") return;
            menu.style.left = `${clamp(rect.left, 8, window.innerWidth - menu.offsetWidth - 8)}px`;
            menu.style.top = `${clamp(rect.top, 8, window.innerHeight - menu.offsetHeight - 8)}px`;
            menu.style.margin = "0";
        });
    }
    enableResizableScoreLogsMenu() {
        const menu = document.querySelector(".hud-menu-FPS");
        if (!menu || menu.dataset.resizable === "true") return;
        menu.dataset.resizable = "true";
        const directions = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
        directions.forEach((direction) => {
            const handle = document.createElement("div");
            handle.className = `hud-menu-resize-handle hud-menu-resize-${direction}`;
            handle.dataset.resizeDirection = direction;
            menu.appendChild(handle);
        });
        let resizing = false;
        let resizeDirection = "";
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        let startWidth = 0;
        let startHeight = 0;
        const minWidth = 480;
        const minHeight = 250;
        const startResize = (event) => {
            if (event.button !== 0) return;
            const rect = menu.getBoundingClientRect();
            resizing = true;
            resizeDirection = event.currentTarget.dataset.resizeDirection;
            startX = event.clientX;
            startY = event.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            startWidth = rect.width;
            startHeight = rect.height;
            menu.classList.add("is-resizing");
            menu.style.left = `${rect.left}px`;
            menu.style.top = `${rect.top}px`;
            menu.style.margin = "0";
            event.preventDefault();
            event.stopPropagation();
        }
        const moveResize = (event) => {
            if (!resizing) return;
            let nextLeft = startLeft;
            let nextTop = startTop;
            let nextWidth = startWidth;
            let nextHeight = startHeight;
            if (resizeDirection.includes("e")) {
                nextWidth = Math.max(minWidth, Math.min(window.innerWidth - startLeft - 8, startWidth + event.clientX - startX));
            }
            if (resizeDirection.includes("s")) {
                nextHeight = Math.max(minHeight, Math.min(window.innerHeight - startTop - 8, startHeight + event.clientY - startY));
            }
            if (resizeDirection.includes("w")) {
                const maxLeft = startLeft + startWidth - minWidth;
                nextLeft = Math.max(8, Math.min(maxLeft, startLeft + event.clientX - startX));
                nextWidth = startWidth + startLeft - nextLeft;
            }
            if (resizeDirection.includes("n")) {
                const maxTop = startTop + startHeight - minHeight;
                nextTop = Math.max(8, Math.min(maxTop, startTop + event.clientY - startY));
                nextHeight = startHeight + startTop - nextTop;
            }
            menu.style.left = `${nextLeft}px`;
            menu.style.top = `${nextTop}px`;
            menu.style.width = `${nextWidth}px`;
            menu.style.height = `${nextHeight}px`;
            menu.style.setProperty("--fps-grid-height", `${Math.max(150, nextHeight)}px`);
            event.preventDefault();
        }
        const stopResize = () => {
            if (!resizing) return;
            resizing = false;
            resizeDirection = "";
            menu.classList.remove("is-resizing");
        }
        menu.querySelectorAll(".hud-menu-resize-handle").forEach((handle) => handle.addEventListener("mousedown", startResize));
        document.addEventListener("mousemove", moveResize, true);
        document.addEventListener("mouseup", stopResize, true);
        window.addEventListener("blur", stopResize);
    }
    enablePlacementMenuMode() {
        if (window.banPlacementMenuMode) return;
        window.banPlacementMenuMode = true;
        setInterval(() => {
            const placementOverlay = game.ui && game.ui.components && game.ui.components.PlacementOverlay;
            const isPlacing = !!(placementOverlay && placementOverlay.isActive && placementOverlay.isActive());
            const settingsMenu = document.querySelector(".hud-menu-settings");
            const scoreLogsMenu = document.querySelector(".hud-menu-FPS");
            if (settingsMenu) settingsMenu.classList.toggle("is-placing-building", isPlacing);
            if (scoreLogsMenu) scoreLogsMenu.classList.toggle("is-placing-building", isPlacing);
        }, 100);
    }
    getRenderActions() {
        return [
            { id: "tower-entity", label: "Disable Tower Entity", section: "Entity", includes: ["Tower Entity"], excludes: ["Sprite"] },
            { id: "projectile-entity", label: "Disable Projectile Entity", section: "Entity", includes: ["Projectile Entity"] },
            { id: "zombie-sprite", label: "Disable Zombie Sprite Entity", section: "Entity", includes: ["Zombie Sprite Entity"] },
            { id: "zombie-entity", label: "Disable Zombie Entity", section: "Entity", includes: ["Zombie Entity"], excludes: ["Sprite"] },
            { id: "rendering", label: "Stop Rendering", section: "Entity", includes: ["Rendering"] },
            { id: "grid-200", label: "Show 200x200 Grid", section: "Grids", includes: ["200x200 Grid"] },
            { id: "ground", label: "Hide Ground", section: "Grids", includes: ["Ground"] },
            { id: "grid-7", label: "Show 7x7 Grid", section: "Grids", includes: ["7x7 Grid"] },
            { id: "stash-placement", label: "Show Stash Placement", section: "Grids", includes: ["Stash Placement"] },
            { id: "stash-range", label: "Show Stash Range", section: "Grids", includes: ["Stash Range"] },
            { id: "spawn-circle", label: "Show Spawn Circle", section: "Grids", includes: ["Spawn Circle"] },
            { id: "blocked-areas", label: "Show Blocked Areas", section: "Grids", includes: ["Blocked Areas"] },
            { id: "t6-textures", label: "Use Blue T6 Textures", section: "Textures", includes: ["T6 Textures"] },
            { id: "default-zombies", label: "Use Default Zombies", section: "Textures", includes: ["Zombies"] }
        ];
    }
    getRenderSections() {
        const actions = this.getRenderActions();
        return ["Entity", "Grids", "Textures"].map((title) => ({
            title,
            actions: actions.filter((action) => action.section === title)
        }));
    }
    getSavedRenderStates() {
        try {
            return JSON.parse(localStorage.zombsRenderStates || "{}") || {};
        } catch {
            return {};
        }
    }
    setSavedRenderState(actionId, isActive) {
        const states = this.getSavedRenderStates();
        states[actionId] = !!isActive;
        localStorage.zombsRenderStates = JSON.stringify(states);
    }
    findFpsRenderButton(actionId) {
        const action = this.getRenderActions().find((entry) => entry.id === actionId);
        if (!action) return null;
        const buttons = Array.from(document.querySelectorAll("#hud-menu-FPS .hud-FPS-restart-walkthrough"));
        return buttons.find((button) => {
            const text = button.textContent.trim();
            const includes = action.includes.every((term) => text.indexOf(term) !== -1);
            const excludes = (action.excludes || []).some((term) => text.indexOf(term) !== -1);
            return includes && !excludes;
        }) || null;
    }
    getRenderActionState(actionId) {
        const api = window.zombsRenderActions && window.zombsRenderActions[actionId];
        if (api && api.isActive) return !!api.isActive();
        const source = this.findFpsRenderButton(actionId);
        if (!source) return null;
        return source.classList.contains("btn-red");
    }
    toggleRenderActionById(actionId) {
        const api = window.zombsRenderActions && window.zombsRenderActions[actionId];
        if (api && api.toggle) {
            api.toggle();
            return true;
        }
        const source = this.findFpsRenderButton(actionId);
        if (!source) return false;
        source.click();
        return true;
    }
    applySavedRenderStates() {
        const states = this.getSavedRenderStates();
        const hasSavedState = (actionId) => Object.prototype.hasOwnProperty.call(states, actionId);
        this.getRenderActions().forEach((action) => {
            if (!hasSavedState(action.id) || this.appliedRenderStates.has(action.id)) return;
            const api = window.zombsRenderActions && window.zombsRenderActions[action.id];
            if (!api || !api.isActive || !api.toggle) return;
            const desiredState = !!states[action.id];
            const currentState = !!api.isActive();
            if (currentState !== desiredState) api.toggle();
            this.appliedRenderStates.add(action.id);
        });
    }
    saveRenderActionState(actionId) {
        const state = this.getRenderActionState(actionId);
        if (state === null) return;
        this.setSavedRenderState(actionId, state);
        this.appliedRenderStates.add(actionId);
    }
    syncRenderButtons() {
        this.applySavedRenderStates();
        const buttons = document.querySelectorAll(".hud-render-toggle");
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            const api = window.zombsRenderActions && window.zombsRenderActions[button.dataset.renderAction];
            if (api) {
                const label = api.getLabel ? api.getLabel() : button.textContent.trim();
                const isActive = api.isActive ? !!api.isActive() : false;
                button.textContent = label;
                button.classList.toggle("btn-green", !isActive);
                button.classList.toggle("btn-red", isActive);
                button.classList.toggle("is-active", isActive);
                continue;
            }
            const source = this.findFpsRenderButton(button.dataset.renderAction);
            if (!source) continue;
            button.textContent = source.textContent.trim();
            button.classList.toggle("btn-green", source.classList.contains("btn-green"));
            button.classList.toggle("btn-red", source.classList.contains("btn-red"));
            button.classList.toggle("is-active", source.classList.contains("btn-red"));
        }
    }
    handleRenderAction(button) {
        const actionId = button.dataset.renderAction;
        const api = window.zombsRenderActions && window.zombsRenderActions[actionId];
        if (api && api.toggle) {
            api.toggle();
            this.saveRenderActionState(actionId);
            this.syncRenderButtons();
            setTimeout(() => this.syncRenderButtons(), 0);
            return;
        }
        const source = this.findFpsRenderButton(actionId);
        if (!source) return;
        source.click();
        this.saveRenderActionState(actionId);
        this.syncRenderButtons();
        setTimeout(() => this.syncRenderButtons(), 0);
    }
    formatScoreLogNumber(value = 0, compact = false) {
        const number = Number(value) || 0;
        if (compact) {
            const abs = Math.abs(number);
            const formatCompact = (divisor, suffix) => {
                const compactValue = number / divisor;
                const rounded = compactValue.toFixed(Math.abs(compactValue) >= 100 ? 1 : 2).replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
                return `${rounded}${suffix}`;
            }
            if (abs >= 1e12) return formatCompact(1e12, "T");
            if (abs >= 1e9) return formatCompact(1e9, "B");
            if (abs >= 1e6) return formatCompact(1e6, "M");
            if (abs >= 1e3) return formatCompact(1e3, "K");
        }
        if (Number.isInteger(number)) return number.toLocaleString();
        return number.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    copyScoreLoggerValue(value, label = "Score") {
        const text = `${value || ""}`;
        const fallbackCopy = () => {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
                document.execCommand("copy");
            } catch (e) { };
            textarea.remove();
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(fallbackCopy);
        } else {
            fallbackCopy();
        }
        if (game.ui && game.ui.components && game.ui.components.PopupOverlay) {
            game.ui.components.PopupOverlay.showHint(`${label} copied.`);
        }
    }
    matchesScoreLoggerSearch(log, query) {
        const normalize = (value) => `${value || ""}`.toLowerCase().replace(/,/g, "").replace(/[#|:]/g, " ").replace(/\s+/g, " ").trim();
        const value = normalize(query);
        if (!value) return true;
        const wave = this.formatScoreLogNumber(log.wave);
        const combined = this.formatScoreLogNumber(log.combinedSpw);
        const aspw = this.formatScoreLogNumber(log.combinedAverage);
        const total = this.formatScoreLogNumber(log.totalScore);
        const parts = [
            `log ${log.logNumber}`,
            `log #${log.logNumber}`,
            `wave ${log.wave}`,
            `wave ${wave}`,
            `combined ${combined}`,
            `aspw ${aspw}`,
            `total ${total}`,
            `total score ${total}`,
            log.logNumber,
            log.wave,
            log.combinedSpw,
            log.combinedAverage,
            log.totalScore,
            wave,
            combined,
            aspw,
            total
        ];
        (log.rows || []).forEach((row) => {
            const rowScore = this.formatScoreLogNumber(row.spw);
            const rowAverage = this.formatScoreLogNumber(row.avgSpw);
            const rowTotal = this.formatScoreLogNumber(row.score);
            parts.push(
                `#${row.rank}`,
                `rank ${row.rank}`,
                `base ${row.rank}`,
                row.name,
                `wave ${row.wave}`,
                `score ${rowTotal}`,
                `spw ${rowScore}`,
                `aspw ${rowAverage}`,
                `total ${rowTotal}`,
                `leaderboard ${rowTotal}`,
                `leaderboard score ${rowTotal}`,
                row.rank,
                row.wave,
                row.spw,
                row.avgSpw,
                row.score,
                rowScore,
                rowAverage,
                rowTotal
            );
        });
        const haystack = normalize(parts.join(" "));
        return haystack.includes(value);
    }
    installScoreLoggerRpcHandlers() {
        if (this.scoreLoggerRpcHandlersInstalled || !game.network || !game.network.addRpcHandler) return;
        this.scoreLoggerRpcHandlersInstalled = true;
        game.network.addRpcHandler("Leaderboard", (response) => {
            if (!this.isHandledOnce) {
                this.isHandledOnce = true;
                this.handleScoreLoggerLeaderboard(response);
            } else {
                const displayCheck = getElement("hud-menu-FPS")[0].style.display;
                if (this.scripts.scorelogger || (displayCheck !== "" && displayCheck !== "none")) {
                    this.handleScoreLoggerLeaderboard(response);
                }
            }
        });
        game.network.addRpcHandler("DayCycle", (response) => {
            if (!this.isHandledTwice) {
                this.isHandledTwice = true;
                this.handleScoreLoggerDayCycle(response);
            } else {
                const displayCheck = getElement("hud-menu-FPS")[0].style.display;
                if (this.scripts.scorelogger || (displayCheck !== "" && displayCheck !== "none")) {
                    this.handleScoreLoggerDayCycle(response);
                }
            }
            this.handleSingleScoreLogger(response);
        });
    }
    handleScoreLoggerLeaderboard(response) {
        this.syncScoreLoggerLeaderboard(false, response);
    }
    getScoreLoggerCycleKey(response = {}) {
        const cycleStart = response.cycleStartTick === undefined ? "" : response.cycleStartTick;
        const nightEnd = response.nightEndTick === undefined ? "" : response.nightEndTick;
        const dayEnd = response.dayEndTick === undefined ? "" : response.dayEndTick;
        if (cycleStart !== "" || nightEnd !== "" || dayEnd !== "") {
            return `${cycleStart}:${nightEnd}:${dayEnd}`;
        }
        const wave = game.ui && game.ui.playerTick ? game.ui.playerTick.wave : "";
        return `${response.isDay ? "day" : "night"}:${wave}`;
    }
    refreshScoreLoggerCycleFromTicker() {
        const ticker = game.ui && game.ui.components && game.ui.components.DayNightTicker ? game.ui.components.DayNightTicker.tickData : null;
        if (!ticker) return;
        this.scoreLoggerCurrentCycleKey = this.getScoreLoggerCycleKey(ticker);
        this.scoreLoggerCurrentIsDay = !!ticker.isDay;
    }
    handleScoreLoggerDayCycle(response = {}) {
        if (!response) return;
        const cycleKey = this.getScoreLoggerCycleKey(response);
        this.scoreLoggerCurrentCycleKey = cycleKey;
        this.scoreLoggerCurrentIsDay = !!response.isDay;
        if (response.isDay) return;
        if (cycleKey === this.scoreLoggerLastCycleKey) return;
        this.scoreLoggerLastCycleKey = cycleKey;
        if (!this.scripts.scorelogger) return;
        this.scoreLoggerIsNight = true;
        if (!this.scoreLoggerPrimed && this.scoreLoggerActivationCycleKey && cycleKey === this.scoreLoggerActivationCycleKey) {
            this.scoreLoggerStatus = "Waiting for next night start";
            this.updateScoreLoggerPanel();
            return;
        }
        this.processScoreLogger();
    }
    getScoreLoggerLeaderboard(source = null) {
        const leaderboard = source || (game.ui && game.ui.components && game.ui.components.Leaderboard ? game.ui.components.Leaderboard.leaderboardData : []);
        return (leaderboard || []).slice(0, 4).map((base, index) => ({
            uid: base.uid || index,
            name: base.name || `Base ${index + 1}`,
            rank: base.rank === undefined ? index : base.rank,
            wave: Number(base.wave) || 0,
            score: Number(base.score) || 0
        }));
    }
    resetScoreLogger() {
        this.id = 0;
        this.spw = 0;
        this.aspw = 0;
        this.hspw = 0;
        this.spws = [];
        this.lastScore = undefined;
        this.scoreLoggerRows = [];
        this.scoreLoggerBases = {};
        this.scoreLoggerCombinedSpws = [];
        this.scoreLoggerLogRows = [];
        this.scoreLoggerLogCount = 0;
        this.scoreLoggerSearch = "";
        this.scoreLoggerHighScore = null;
        this.scoreLoggerLowScore = null;
        this.scoreLoggerPrimed = false;
        this.refreshScoreLoggerCycleFromTicker();
        this.scoreLoggerActivationCycleKey = this.scoreLoggerCurrentCycleKey;
        this.scoreLoggerLastNightKey = null;
        this.scoreLoggerLastCycleKey = this.scoreLoggerCurrentIsDay === false ? this.scoreLoggerCurrentCycleKey : null;
        this.scoreLoggerStatus = "Waiting for next night start";
        this.syncScoreLoggerLeaderboard(false);
        this.updateScoreLoggerPanel();
    }
    ensureScoreLoggerPanel() {
        const grid = document.querySelector("#hud-menu-FPS .hud-FPS-grid");
        if (!grid) return null;
        let panel = grid.querySelector(".hud-score-logger-panel");
        if (!panel) {
            panel = document.createElement("div");
            panel.className = "hud-score-logger-panel";
            grid.insertBefore(panel, grid.firstChild);
        }
        return panel;
    }
    updateScoreLoggerPanel() {
        const panel = this.ensureScoreLoggerPanel();
        if (!panel) return;
        const focusedSearch = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains("hud-score-logger-search") ? document.activeElement : null;
        const restoreSearchFocus = !!focusedSearch;
        const restoreSearchStart = focusedSearch ? focusedSearch.selectionStart : null;
        const restoreSearchEnd = focusedSearch ? focusedSearch.selectionEnd : null;
        const previousLogList = panel.querySelector(".hud-score-logger-log");
        const previousLogScroll = previousLogList ? previousLogList.scrollTop : 0;
        panel.style.display = "flex";
        let rows = this.scoreLoggerRows.slice(0, 4);
        if (!rows.length) rows = this.getScoreLoggerLeaderboard().map((base) => ({ ...base, spw: 0, avgSpw: 0 }));
        const combinedCurrent = rows.reduce((total, row) => total + (Number(row.spw) || 0), 0);
        const combinedTotalScore = rows.reduce((total, row) => total + (Number(row.score) || 0), 0);
        const combinedAverage = this.scoreLoggerCombinedSpws.length ? this.scoreLoggerCombinedSpws.reduce((total, value) => total + value, 0) / this.scoreLoggerCombinedSpws.length : 0;
        const averageBaseSpw = rows.length ? rows.reduce((total, row) => total + (Number(row.avgSpw) || 0), 0) / rows.length : 0;
        const status = this.scripts.scorelogger ? this.scoreLoggerStatus : "Off - type !sl | For your player, type !ssl";
        const searchValue = this.scoreLoggerSearch || "";
        const logSource = this.scoreLoggerLogRows || [];
        const logRows = searchValue.trim() ? logSource.filter((log) => this.matchesScoreLoggerSearch(log, searchValue)) : logSource;
        const previousSearchValue = panel.dataset.scoreLoggerSearch || "";
        const searchChanged = previousSearchValue !== searchValue;
        panel.dataset.scoreLoggerSearch = searchValue;
        const logCount = Number(this.scoreLoggerLogCount) || 0;
        const isScoreLoggerRunning = !!this.scripts.scorelogger;
        const highScore = this.scoreLoggerHighScore === null ? 0 : this.scoreLoggerHighScore;
        const lowScore = this.scoreLoggerLowScore === null ? 0 : this.scoreLoggerLowScore;
        const menuWidth = (document.querySelector(".hud-menu-FPS")?.getBoundingClientRect().width || 760);
        const compactNumbers = menuWidth <= 640;
        panel.dataset.compactNumbers = compactNumbers ? "true" : "false";
        const scoreNumber = (value) => this.formatScoreLogNumber(value, compactNumbers);
        const sticky = panel.querySelector(".hud-score-logger-sticky");
        const logs = panel.querySelector(".hud-score-logger-log");
        if (!sticky) {
            panel.innerHTML = `
                <div class="hud-score-logger-sticky">
                <div class="hud-score-logger-title">
                <strong>Score Logger</strong>
                <input class="hud-score-logger-search" name="logger" type="text" value="${Sanitize(searchValue)}" placeholder="Search wave/log" spellcheck="false">
                <div class="hud-score-logger-markers">
                ${isScoreLoggerRunning ? `<b>Log #${logCount || "--"}</b>` : `<button class="hud-score-logger-start" type="button">Start</button>`}
                <button class="hud-score-logger-copy-value" type="button" data-copy-score="${Sanitize(this.formatScoreLogNumber(highScore))}" data-copy-label="High Score"><span>High</span><strong>${Sanitize(scoreNumber(highScore))}</strong></button>
                <button class="hud-score-logger-copy-value" type="button" data-copy-score="${Sanitize(this.formatScoreLogNumber(lowScore))}" data-copy-label="Low Score"><span>Low</span><strong>${Sanitize(scoreNumber(lowScore))}</strong></button>
                </div>
                </div>
                <div class="hud-score-logger-rows">
                ${rows.length ? rows.map((row, index) => `
                <div class="hud-score-logger-row${row.uid === game.world.myUid ? " is-me" : ""}">
                <strong>#${index + 1} ${Sanitize(row.name || "Base")}</strong>
                <span>Score ${scoreNumber(row.score || 0)}</span>
                <span>Wave ${(Number(row.wave) || 0).toLocaleString()}</span>
                <span>SPW ${scoreNumber(row.spw || 0)}</span>
                <span>ASPW ${scoreNumber(row.avgSpw || 0)}</span>
                </div>
                `).join("") : `<div class="hud-score-logger-empty">Waiting for leaderboard score data...</div>`}
                </div>
                <div class="hud-score-logger-summary">
                <span>All Players Avg: ${scoreNumber(averageBaseSpw)}</span>
                <span>Combined ASPW: ${scoreNumber(combinedAverage)}</span>
                <span class="hud-score-logger-status">${Sanitize(status)}</span>
                <span>Total Score: ${scoreNumber(combinedTotalScore)}</span>
                <span>Combined SPW: ${scoreNumber(combinedCurrent)}</span>
                </div>
                </div>
                <div class="hud-score-logger-log">
                ${logRows.length ? logRows.map((log) => `
                <div class="hud-score-logger-log-entry">
                <strong>Log #${log.logNumber || "--"}</strong>
                <div class="hud-score-logger-log-summary-row">
                <span>Combined ${scoreNumber(log.combinedSpw || 0)}</span>
                <span>ASPW ${scoreNumber(log.combinedAverage || 0)}</span>
                <span>Total ${scoreNumber(log.totalScore || 0)}</span>
                </div>
                <div class="hud-score-logger-log-table">
                ${(log.rows || []).map((row) => `
                <div class="hud-score-logger-log-row">
                <small>#${row.rank} ${Sanitize(row.name || "Base")}</small>
                <small>Score ${scoreNumber(row.score || 0)}</small>
                <small>Wave ${Sanitize((Number(row.wave) || 0).toLocaleString())}</small>
                <small>SPW ${scoreNumber(row.spw || 0)}</small>
                </div>
                `).join("")}
                </div>
                </div>
                `).join("") : `<div class="hud-score-logger-empty">${searchValue.trim() ? "No matching logs." : "No score logs yet."}</div>`}
                </div>
            `;
        } else {
            if (this.scoreLoggerIsNight) {
                this.scoreLoggerIsNight = false;
                sticky.innerHTML = `
                    <div class="hud-score-logger-title">
                    <strong>Score Logger</strong>
                    <input class="hud-score-logger-search" name="logger" type="text" value="${Sanitize(searchValue)}" placeholder="Search wave/log" spellcheck="false">
                    <div class="hud-score-logger-markers">
                    ${isScoreLoggerRunning ? `<b>Log #${logCount || "--"}</b>` : `<button class="hud-score-logger-start" type="button">Start</button>`}
                    <button class="hud-score-logger-copy-value" type="button" data-copy-score="${Sanitize(this.formatScoreLogNumber(highScore))}" data-copy-label="High Score"><span>High</span><strong>${Sanitize(scoreNumber(highScore))}</strong></button>
                    <button class="hud-score-logger-copy-value" type="button" data-copy-score="${Sanitize(this.formatScoreLogNumber(lowScore))}" data-copy-label="Low Score"><span>Low</span><strong>${Sanitize(scoreNumber(lowScore))}</strong></button>
                    </div>
                    </div>
                    <div class="hud-score-logger-rows">
                    ${rows.length ? rows.map((row, index) => `
                    <div class="hud-score-logger-row${row.uid === game.world.myUid ? " is-me" : ""}">
                    <strong>#${index + 1} ${Sanitize(row.name || "Base")}</strong>
                    <span>Score ${scoreNumber(row.score || 0)}</span>
                    <span>Wave ${(Number(row.wave) || 0).toLocaleString()}</span>
                    <span>SPW ${scoreNumber(row.spw || 0)}</span>
                    <span>ASPW ${scoreNumber(row.avgSpw || 0)}</span>
                    </div>
                    `).join("") : `<div class="hud-score-logger-empty">Waiting for leaderboard score data...</div>`}
                    </div>
                    <div class="hud-score-logger-summary">
                    <span>All Players Avg: ${scoreNumber(averageBaseSpw)}</span>
                    <span>Combined ASPW: ${scoreNumber(combinedAverage)}</span>
                    <span class="hud-score-logger-status">${Sanitize(status)}</span>
                    <span>Total Score: ${scoreNumber(combinedTotalScore)}</span>
                    <span>Combined SPW: ${scoreNumber(combinedCurrent)}</span>
                    </div>
                `;
                logs.innerHTML = `
                    ${logRows.length ? logRows.map((log) => `
                    <div class="hud-score-logger-log-entry">
                    <strong>Log #${log.logNumber || "--"}</strong>
                    <div class="hud-score-logger-log-summary-row">
                    <span>Combined ${scoreNumber(log.combinedSpw || 0)}</span>
                    <span>ASPW ${scoreNumber(log.combinedAverage || 0)}</span>
                    <span>Total ${scoreNumber(log.totalScore || 0)}</span>
                    </div>
                    <div class="hud-score-logger-log-table">
                    ${(log.rows || []).map((row) => `
                    <div class="hud-score-logger-log-row">
                    <small>#${row.rank} ${Sanitize(row.name || "Base")}</small>
                    <small>Score ${scoreNumber(row.score || 0)}</small>
                    <small>Wave ${Sanitize((Number(row.wave) || 0).toLocaleString())}</small>
                    <small>SPW ${scoreNumber(row.spw || 0)}</small>
                    </div>
                    `).join("")}
                    </div>
                    </div>
                    `).join("") : `<div class="hud-score-logger-empty">${searchValue.trim() ? "No matching logs." : "No score logs yet."}</div>`}
                `;
            }
        }
        const nextLogList = panel.querySelector(".hud-score-logger-log");
        if (nextLogList) {
            const maxScroll = Math.max(0, nextLogList.scrollHeight - nextLogList.clientHeight);
            const targetScroll = searchChanged ? 0 : Math.min(previousLogScroll, maxScroll);
            nextLogList.scrollTop = targetScroll;
            nextLogList.banScrollTarget = targetScroll;
        }
        const searchInput = panel.querySelector(".hud-score-logger-search");
        const startButton = panel.querySelector(".hud-score-logger-start");
        if (startButton) {
            if (startButton.onclick) return;
            startButton.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.setScriptToggle("scorelogger", true);
                this.updateScriptMenu();
                if (game.ui && game.ui.components && game.ui.components.PopupOverlay) {
                    game.ui.components.PopupOverlay.showHint("Score Logger On!");
                }
            }
        }
        panel.querySelectorAll(".hud-score-logger-copy-value").forEach((button) => {
            if (button.onclick) return;
            button.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.copyScoreLoggerValue(button.dataset.copyScore, button.dataset.copyLabel);
            }
        });
        if (searchInput) {
            if (searchInput.oninput) return;
            searchInput.oninput = () => {
                const cursor = searchInput.selectionStart || searchInput.value.length;
                this.scoreLoggerSearch = searchInput.value;
                this.scoreLoggerIsNight = true;
                this.updateScoreLoggerPanel();
                const nextInput = panel.querySelector(".hud-score-logger-search");
                if (nextInput) {
                    nextInput.focus();
                    nextInput.setSelectionRange(cursor, cursor);
                }
            }
            if (restoreSearchFocus) {
                searchInput.focus();
                const start = restoreSearchStart === null ? searchInput.value.length : restoreSearchStart;
                const end = restoreSearchEnd === null ? start : restoreSearchEnd;
                searchInput.setSelectionRange(start, end);
            }
        }
    }
    syncScoreLoggerLeaderboard(sampleSpw = false, source = null) {
        const topBases = this.getScoreLoggerLeaderboard(source);
        if (!topBases.length) {
            this.scoreLoggerStatus = "No leaderboard data";
            this.updateScoreLoggerPanel();
            return;
        }
        let combinedSpw = 0;
        let hasSpwSample = false;
        this.scoreLoggerRows = topBases.map((base, index) => {
            const uid = base.uid;
            const previous = this.scoreLoggerBases[uid] || { spws: [], totalSpw: 0, lastScore: null };
            const score = base.score;
            let spw = previous.spw || 0;
            if (sampleSpw && previous.lastScore !== null && score >= previous.lastScore) {
                spw = score - previous.lastScore;
                previous.spws.push(spw);
                previous.totalSpw += spw;
                combinedSpw += spw;
                hasSpwSample = true;
            } else if (sampleSpw && previous.lastScore !== null) {
                spw = 0;
            }
            if (sampleSpw) previous.lastScore = score;
            previous.spw = spw;
            previous.avgSpw = previous.spws.length ? previous.totalSpw / previous.spws.length : 0;
            previous.name = base.name;
            previous.uid = uid;
            previous.wave = base.wave;
            previous.score = score;
            this.scoreLoggerBases[uid] = previous;
            return previous;
        });
        if (hasSpwSample && combinedSpw > 0) {
            this.scoreLoggerCombinedSpws.push(combinedSpw);
            const wave = Math.max(...this.scoreLoggerRows.map((row) => Number(row.wave) || 0));
            const combinedAverage = this.scoreLoggerCombinedSpws.reduce((total, value) => total + value, 0) / this.scoreLoggerCombinedSpws.length;
            const totalScore = this.scoreLoggerRows.reduce((total, row) => total + (Number(row.score) || 0), 0);
            const individualScores = this.scoreLoggerRows.map((row) => Number(row.spw) || 0).filter((score) => score > 0);
            this.scoreLoggerLogCount += 1;
            if (individualScores.length) {
                const highestIndividualScore = Math.max(...individualScores);
                const lowestIndividualScore = Math.min(...individualScores);
                this.scoreLoggerHighScore = this.scoreLoggerHighScore === null ? highestIndividualScore : Math.max(this.scoreLoggerHighScore, highestIndividualScore);
                this.scoreLoggerLowScore = this.scoreLoggerLowScore === null ? lowestIndividualScore : Math.min(this.scoreLoggerLowScore, lowestIndividualScore);
            }
            this.scoreLoggerLogRows.unshift({
                logNumber: this.scoreLoggerLogCount,
                wave,
                combinedSpw,
                combinedAverage,
                totalScore,
                rows: this.scoreLoggerRows.map((row, index) => ({
                    rank: index + 1,
                    name: row.name,
                    wave: row.wave,
                    spw: row.spw,
                    avgSpw: row.avgSpw,
                    score: row.score
                }))
            });
            this.scoreLoggerStatus = `Updated Log #${this.scoreLoggerLogCount.toLocaleString()}`;
        } else if (hasSpwSample && combinedSpw <= 0) {
            this.scoreLoggerStatus = "Waiting for score gain";
        } else if (sampleSpw) {
            this.scoreLoggerStatus = "Baseline saved - next night logs";
        } else if (this.scripts.scorelogger && !this.scoreLoggerPrimed) {
            this.scoreLoggerStatus = "Waiting for next night start";
        }
        if (sampleSpw) {
            this.scoreLoggerPrimed = true;
        }
        this.updateScoreLoggerPanel();
    }
    processScoreLogger() {
        this.syncScoreLoggerLeaderboard(true);
    }
    handleSingleScoreLogger(response = {}) {
        if (!this.scripts.singlescorelogger || !response || !game.ui.playerTick || !this.gs) return;
        if (!response.isDay && !game.ui.playerTick.isPaused) {
            ++this.currentId;
            if (this.currentId === 1) {
                this.currentScore = game.ui.playerTick.score;
            } else if (this.currentId > 1) {
                const bossWaves = [9, 17, 25, 33, 41, 49, 57, 65, 73, 81, 89, 97, 105, 121];
                const currentWave = game.ui.playerTick.wave;
                const newScore = game.ui.playerTick.score;
                let scoreGain = newScore - this.currentScore;
                if (scoreGain > 0 && !bossWaves.includes[currentWave]) {
                    let scoreSum = 0;
                    this.allScores.push(scoreGain);
                    scoreGain = this.counter(scoreGain);
                    this.currentScore = newScore;
                    this.allScores.forEach((e) => scoreSum += e);
                    const average = this.counter(scoreSum / this.allScores.length);
                    game.ui.components.Chat.onMessageReceived({ displayName: "Score Logs", message: `Wave ${currentWave} | Score ${scoreGain} | Average ${average}`, uid: this.currentId - 1 });
                } else {
                    this.currentId -= 1;
                }
            }       
        }
    }
    createScriptMenu() {
        const settingsGrid = document.querySelector(".hud-settings-grid");
        if (!settingsGrid) return;
        const tabs = [
            {
                id: "localhost",
                title: "Localhost",
                sections: [
                    {
                        title: "Defense",
                        items: [
                            ["autoheal", "Auto Heal"],
                            ["autobow", "Auto Bow"],
                            ["autospear", "Auto Spear"],
                            ["autoshield", "Auto Shield"],
                            ["autoaim", "Auto Aim"],
                            ["autotimeout", "Auto Timeout"]
                        ]
                    },
                    {
                        title: "Pets",
                        items: [
                            ["autopetpotion", "Buy Pet Potion"],
                            ["autopetheal", "Pet Heal"],
                            ["autorevivepets", "Revive Pet"],
                            ["autoevolvepets", "Evolve Pet"]
                        ]
                    },
                    {
                        title: "Base",
                        items: [
                            ["autobuild", "Auto Build"],
                            ["autoupgrade", "Auto Upgrade"],
                            ["upgradeall", "Upgrade All"],
                            ["sellall", "Sell All"],
                            ["uth", "UTH"],
                            ["towerheal", "Tower Heal"],
                            ["autorefiller", "Auto Refiller"]
                        ]
                    },
                    {
                        title: "Placement",
                        items: [
                            ["walls3x3", "Walls 3x3"],
                            ["walls5x5", "Walls 5x5"],
                            ["walls7x7", "Walls 7x7"],
                            ["walls9x9", "Walls 9x9"],
                            ["harvs4x4", "Harvs 4x4"],
                            ["harvs8x8", "Harvs 8x8"]
                        ]
                    },
                    {
                        title: "Multibox",
                        items: [
                            ["mousemove", "Mouse Move"],
                            ["positionlock", "Position Lock"],
                            ["wasd", "WASD"],
                            ["autofollow", "Auto Follow"]
                        ]
                    },
                    {
                        title: "Tools",
                        items: [
                            ["showrss", "Player Info"],
                            ["clearchat", "Clear Chat"],
                            ["chatspam", "Chat Spam"],
                            ["xkey", "X Key"],
                            ["scorelogger", "Score Logger"],
                            ["autorespawn", "Auto Respawn"],
                            ["autoaltjoin", "Auto Alt Join"],
                            ["joindelay", "Join Delay"],
                            ["sesswitcher", "Ses Switcher"],
                            ["singlescorelogger", "1P Score Logger"]
                        ]
                    }
                ]
            },
            {
                id: "sessions",
                title: "Sessions",
                session: true,
                sections: [
                    {
                        title: "Defense",
                        items: [
                            ["sessionAutobow", "Auto Bow", "eatb", "datb"],
                            ["sessionAutoaim", "Auto Aim", "eaa", "daa"],
                            ["sessionAimZombies", "Aim Zombies", "eaaz", "daaz"],
                            ["sessionAimDemons", "Aim Demons", "eaad", "daad"],
                            ["sessionTimeout", "Auto Timeout", "eat", "dat"],
                            ["sessionAutoWeapon", "Weapon Switch", "eaws", "daws"],
                            ["sessionClearZombies", "Clear Zombies", "eacz", "dacz"],
                            ["sessionChatSpam", "Chat Spam", "esp", "dsp"]
                        ]
                    },
                    {
                        title: "Pets",
                        items: [
                            ["sessionPetRevive", "Pet Revive", "eapr", "dapr"],
                            ["sessionPetEvolve", "Pet Evolve", "eape", "dape"],
                            ["sessionPetHeal", "Pet Heal", "eaph", "daph"]
                        ]
                    },
                    {
                        title: "Base",
                        items: [
                            ["sessionAutobuild", "Auto Build", "eab", "dab"],
                            ["sessionAutoupgrade", "Auto Upgrade", "eau", "dau"],
                            ["sessionUpgradeAll", "Upgrade All", "eua", "dua"],
                            ["sessionSellAll", "Sell All", "esa", "dsa"],
                            ["sessionUpgradeHealth", "UTH", "euth", "duth"],
                            ["sessionTowerHeal", "Tower Heal", "eth", "dth"],
                            ["sessionAhrc", "AHRC", "eahrc", "dahrc"],
                            ["sessionAntiArrow", "Anti Arrow", "eaar", "daar"],
                            ["sessionRevert", "Revert Towers", "erev", "drev"],
                            ["sessionReturnItems", "Return Items", "erit", "drit"]
                        ]
                    },
                    {
                        title: "Misc",
                        items: [
                            ["sessionPositionLock", "Position Lock", "epl", "dpl"],
                            ["sessionFollow", "Auto Follow", "epf", "dpf"],
                            ["sessionAutoMove", "Auto Move", "eatm", "datm"],
                            ["sessionAimLock", "Aim Lock", "eal", "dal"],
                            ["sessionWallBounce", "Wall Bounce", "ewb", "dwb"],
                            ["sessionPlayerTrick", "Player Trick", "ept", "dpt"],
                            ["sessionReverseTrick", "Reverse Trick", "erpt", "drpt"],
                            ["sessionBossReverse", "Boss Reverse", "ebrpt", "dbrpt"],
                            ["sessionTokenReverse", "Token Reverse", "etrpt", "dtrpt"],
                            ["sessionAutoSell", "Auto Sell", "easl", "dasl"]
                        ]
                    },
                    {
                        title: "Actions",
                        actions: [
                            ["Lock Position", "lock"],
                            ["Second Lock", "2lock"],
                            ["Aim Lock Pos", "alock"],
                            ["Horizontal WB", "hor"],
                            ["Vertical WB", "ver"],
                            ["Wall Lock 1", "wlock1"],
                            ["Wall Lock 2", "wlock2"],
                            ["Ping", "ping"],
                            ["Uptime", "uptime"]
                        ]
                    }
                ]
            },
            {
                id: "statistics",
                title: "Statistics",
                statistics: true,
                sections: []
            },
            {
                id: "render",
                title: "Render",
                render: true,
                sections: []
            }
        ];
        const activeTabId = "sessions";
        const splitTabs = ["localhost", "sessions"].map((id) => tabs.find((tab) => tab.id === id)).filter(Boolean);
        const renderTab = tabs.find((tab) => tab.id === "render");
        const statisticsTab = tabs.find((tab) => tab.id === "statistics");
        const menu = document.createElement("div");
        menu.className = "hud-script-menu";
        menu.innerHTML = `
            <div class="hud-script-tabs">
                ${renderTab ? `<a class="hud-script-tab${renderTab.id === activeTabId ? " is-active" : ""}" data-tab="${renderTab.id}">~ ${renderTab.title} ~</a>` : ""}
                <div class="hud-script-tab-split" data-active="${splitTabs.some((tab) => tab.id === activeTabId) ? activeTabId : ""}">
                    ${splitTabs.map((tab) => `<a class="hud-script-tab hud-script-tab-half${tab.id === activeTabId ? " is-active" : ""}" data-tab="${tab.id}">~ ${tab.title} ~</a>`).join("")}
                </div>
                ${statisticsTab ? `<a class="hud-script-tab${statisticsTab.id === activeTabId ? " is-active" : ""}" data-tab="${statisticsTab.id}">~ ${statisticsTab.title} ~</a>` : ""}
            </div>
            <div class="hud-script-scroll-body">
                <div class="hud-script-panels">
                    ${tabs.map((tab) => `
                        <div class="hud-script-panel${tab.id === activeTabId ? " is-active" : ""}" data-panel="${tab.id}">
                            <h4>~ ${tab.title} ~</h4>
                            ${tab.statistics ? `
                                <div class="hud-statistics-panel">
                                    <div class="hud-statistics-grid">
                                        <div class="hud-statistic hud-statistic-wide"><span>Status</span><strong data-stat="statsStatus">Waiting</strong><small></small></div>
                                        <div class="hud-statistic"><span>Process CPU</span><strong data-stat="cpuPercent">--</strong><small>%</small></div>
                                        <div class="hud-statistic"><span>Process Memory</span><strong data-stat="memoryMb">--</strong><small>MB</small></div>
                                        <div class="hud-statistic"><span>Process Heap</span><strong data-stat="heapUsedMb">--</strong><small>MB</small></div>
                                        <div class="hud-statistic"><span>ZOMBS Ping</span><strong data-stat="zombsPingMs">--</strong><small>ms</small></div>
                                        <div class="hud-statistic"><span>Server</span><strong data-stat="serverId">--</strong><small>ID</small></div>
                                        <div class="hud-statistic"><span>Sessions</span><strong data-stat="sessionsCount">--</strong><small>active</small></div>
                                        <div class="hud-statistic"><span>Session Uptime</span><strong data-stat="sessionUptime">--</strong><small></small></div>
                                        <div class="hud-statistic"><span>Process Uptime</span><strong data-stat="processUptime">--</strong><small></small></div>
                                    </div>
                                    <a class="btn hud-statistics-refresh">Refresh Stats</a>
                                </div>
                            ` : ""}
                            ${tab.render ? this.getRenderSections().map((section) => `
                                <label class="hud-script-menu-section hud-render-menu-section" for="hud-intro-name">
                                    <span>${section.title}</span>
                                    <div class="hud-script-menu-buttons hud-render-menu-buttons">
                                        ${section.actions.map((action) => `<a class="btn btn-green hud-render-toggle" data-render-action="${action.id}">${action.label}</a>`).join("")}
                                    </div>
                                </label>
                            `).join("") : ""}
                            ${tab.sections.map(section => `
                                <label class="hud-script-menu-section" for="hud-intro-name">
                                    <span>${section.title}</span>
                                    <div class="hud-script-menu-buttons">
                                        ${(section.items || []).map(([key, label, onCommand, offCommand]) => tab.session ? `<a class="btn hud-session-toggle" data-session-script="${key}" data-session-state="${this.getSessionStateName(onCommand)}" data-session-on="${onCommand}" data-session-off="${offCommand}">${label}</a>` : `<a class="btn hud-script-toggle" data-script="${key}">${label}</a>`).join("")}
                                        ${(section.actions || []).map(([label, command]) => `<a class="btn hud-session-action" data-session-command="${command}">${label}</a>`).join("")}
                                    </div>
                                </label>
                            `).join("")}
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
        const title = document.querySelector(".hud-menu-settings h3");
        if (title) title.textContent = "Script Settings";
        const settingsMenu = document.querySelector(".hud-menu-settings");
        if (settingsMenu) {
            settingsMenu.classList.add("hud-script-settings");
        }
        settingsGrid.innerHTML = "";
        settingsGrid.appendChild(menu);
        settingsGrid.addEventListener("click", (event) => {
            const tab = event.target.closest(".hud-script-tab");
            if (tab) {
                const activeTab = tab.dataset.tab;
                const tabs = settingsGrid.querySelectorAll(".hud-script-tab");
                const panels = settingsGrid.querySelectorAll(".hud-script-panel");
                for (let i = 0; i < tabs.length; i++) {
                    tabs[i].classList.toggle("is-active", tabs[i].dataset.tab === activeTab);
                }
                for (let i = 0; i < panels.length; i++) {
                    panels[i].classList.toggle("is-active", panels[i].dataset.panel === activeTab);
                }
                const splitTab = settingsGrid.querySelector(".hud-script-tab-split");
                if (splitTab) {
                    splitTab.dataset.active = activeTab === "localhost" || activeTab === "sessions" ? activeTab : "";
                }
                if (activeTab === "sessions") {
                    this.requestSessionStates();
                }
                if (activeTab === "statistics") {
                    this.requestSessionStats();
                }
                if (activeTab === "render") {
                    this.syncRenderButtons();
                }
                return;
            }
            const renderButton = event.target.closest(".hud-render-toggle");
            if (renderButton) {
                this.handleRenderAction(renderButton);
                return;
            }
            const statsRefresh = event.target.closest(".hud-statistics-refresh");
            if (statsRefresh) {
                this.requestSessionStats();
                user.sendMessage("ping");
                return;
            }
            const sessionButton = event.target.closest(".hud-session-toggle");
            if (sessionButton) {
                const key = sessionButton.dataset.sessionScript;
                const enabled = !this.sessionScripts[key];
                if (this.sendSessionCommand(enabled ? sessionButton.dataset.sessionOn : sessionButton.dataset.sessionOff, sessionButton.textContent, !enabled)) {
                    this.sessionScripts[key] = enabled;
                    this.updateScriptMenu();
                }
                return;
            }
            const sessionAction = event.target.closest(".hud-session-action");
            if (sessionAction) {
                this.sendSessionCommand(sessionAction.dataset.sessionCommand, sessionAction.textContent);
                return;
            }
            const button = event.target.closest(".hud-script-toggle");
            if (!button) return;
            const key = button.dataset.script;
            this.setScriptToggle(key, !this.scripts[key]);
            this.updateScriptMenu();
            if (game.ui && game.ui.components && game.ui.components.PopupOverlay) {
                game.ui.components.PopupOverlay.showHint(`${button.textContent} ${this.scripts[key] ? "On" : "Off"}!`);
            }
        });
        this.scriptMenuInterval = setInterval(() => this.updateScriptMenu(), 1000);
        this.statisticsInterval = setInterval(() => {
            const settingsCheck = getElement("hud-menu-settings")[0].style.display !== "none";
            if (document.querySelector('.hud-script-panel[data-panel="statistics"].is-active') && settingsCheck) {
                this.requestSessionStats();
            }
        }, 500);
        if (window.sessionScriptStates) {
            this.applySessionStates(window.sessionScriptStates);
        }
        if (window.sessionStats) {
            this.applySessionStats(window.sessionStats);
        }
        this.requestSessionStates();
        this.updateScriptMenu();
        this.syncRenderButtons();
    }
    formatDuration(ms) {
        if (ms === null || ms === undefined) return "--";
        const seconds = Math.max(0, Math.floor(ms / 1000));
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${secs}s`;
    }
    formatPingMs(value) {
        const ping = Number(value);
        if (!Number.isFinite(ping) || ping < 0) return "--";
        return ping < 1 ? ping.toFixed(2) : ping.toFixed(1);
    }
    applySessionStats(stats = {}) {
        window.sessionStatsReceivedAt = Date.now();
        const setStat = (name, value) => {
            const elem = document.querySelector(`[data-stat="${name}"]`);
            if (elem) elem.textContent = value === null || value === undefined ? "--" : value;
        }
        setStat("statsStatus", stats.connected ? `Session #${user.connectedToId}` : "No Session");
        setStat("cpuPercent", stats.cpuPercent);
        setStat("memoryMb", stats.memoryMb);
        setStat("heapUsedMb", stats.heapUsedMb);
        setStat("zombsPingMs", this.formatPingMs(stats.zombsPingMs || "--"));
        setStat("serverId", stats.serverId || game.options.serverId);
        setStat("sessionsCount", stats.sessionsCount === null || stats.sessionsCount === undefined ? "--" : stats.sessionsCount);
        setStat("sessionUptime", this.formatDuration(stats.sessionUptimeMs));
        setStat("processUptime", this.formatDuration((stats.processUptimeSeconds || 0) * 1000));
    }
    applyLocalStatsFallback(status = "Waiting", clearStats = true) {
        const setStat = (name, value) => {
            const elem = document.querySelector(`[data-stat="${name}"]`);
            if (elem) elem.textContent = value === null || value === undefined ? "--" : value;
        }
        setStat("statsStatus", status);
        if (typeof performance !== "undefined" && performance.memory) {
            setStat("heapUsedMb", Math.round(performance.memory.usedJSHeapSize / 104857.6) / 10);
            setStat("memoryMb", Math.round(performance.memory.totalJSHeapSize / 104857.6) / 10);
        }
        if (typeof game !== "undefined" && game.network && game.network.connected) {
            setStat("serverId", game.options && game.options.serverId ? game.options.serverId : "--");
        }
        if (clearStats) {
            setStat("cpuPercent", "--");
            setStat("sessionsCount", "--");
            setStat("sessionUptime", "--");
            setStat("processUptime", "--");
            setStat("zombsPingMs", "--");
        }
    }
    requestSessionStats() {
        if (!window.sessionStatsReceivedAt && !(game.world.inWorld && !user.connectedToId)) {
            this.applyLocalStatsFallback("Requesting");
        }
        if (typeof user === "undefined" || !user.sendMessage || !user.ws || user.ws.readyState !== 1) {
            this.applyLocalStatsFallback("Offline");
            return;
        }
        const requestedAt = Date.now();
        user.sendMessage("getsessionstats");
        setTimeout(() => {
            if (!document.querySelector('.hud-script-panel[data-panel="statistics"].is-active')) return;
            if (!window.sessionStatsReceivedAt || window.sessionStatsReceivedAt < requestedAt) {
                this.applyLocalStatsFallback(user.connectedToId ? "Connecting" : "No session", !window.sessionStatsReceivedAt);
            }
        }, 1000);
    }
    getSessionStateName(command) {
        const states = {
            eab: "autobuild",
            eau: "autoupgrade",
            eatb: "autobow",
            eaa: "autoaim",
            eapr: "autopetrevive",
            eape: "autopetevolve",
            eaph: "autopetheal",
            eaaz: "autoaimzombies",
            eaad: "autoaimdemons",
            ept: "playertrick",
            erpt: "reverseplayertrick",
            ebrpt: "bossreverseplayertrick",
            etrpt: "tokenreverseplayertrick",
            eahrc: "ahrc",
            eua: "upgradeall",
            esa: "sellall",
            euth: "upgradetowerhealth",
            eth: "towerheal",
            eat: "autotimeout",
            epl: "positionlock",
            epf: "autofollow",
            eaar: "antiarrow",
            erev: "revert",
            erit: "returnitems",
            eaws: "autoweaponswitch",
            eatm: "automove",
            eal: "aimlock",
            ewb: "wallbounce",
            eacz: "autoclearzombies",
            easl: "autosell",
            esp: "chatspam"
        }
        return states[command] || command;
    }
    applySessionStates(states = {}) {
        for (const key in this.sessionScripts) {
            delete this.sessionScripts[key];
        }
        const sessionButtons = document.querySelectorAll(".hud-session-toggle");
        for (let i = 0; i < sessionButtons.length; i++) {
            const button = sessionButtons[i];
            this.sessionScripts[button.dataset.sessionScript] = !!states[button.dataset.sessionState];
        }
        this.updateScriptMenu();
    }
    requestSessionStates() {
        if (typeof user === "undefined" || !user.connectedToId || !user.sendMessage) return;
        user.sendMessage("getsessionstates");
    }
    sendSessionCommand(command, label, removed = false) {
        if (!command) return;
        if (!user.connectedToId) {
            if (game.ui && game.ui.components && game.ui.components.PopupOverlay) {
                game.ui.components.PopupOverlay.showHint("Connect to a session first.");
            }
            return false;
        }
        if (command !== "ping") {
            user.sendMessage(command);
        } else {
            this.updatePing = !this.updatePing;
            if (this.updatePing) {
                this.pingTicks = 9;
            }
        }
        setTimeout(() => this.requestSessionStates(), 100);
        if (game.ui && game.ui.components && game.ui.components.PopupOverlay) {
            game.ui.components.PopupOverlay.showHint(`${label} ${removed ? "removed from session" : "sent to session"}.`);
        }
        return true;
    }
    setScriptToggle(key, enabled) {
        if (["walls3x3", "walls5x5", "walls7x7", "walls9x9"].includes(key) && enabled) {
            this.scripts.walls3x3 = false;
            this.scripts.walls5x5 = false;
            this.scripts.walls7x7 = false;
            this.scripts.walls9x9 = false;
        }
        if (["harvs4x4", "harvs8x8"].includes(key) && enabled) {
            this.scripts.harvs4x4 = false;
            this.scripts.harvs8x8 = false;
        }
        this.scripts[key] = enabled;
        if (key === "autobuild" && this.targetBase) {
            this.inactiveRebuilder = new Map();
            this.inactiveReupgrader = new Map();
            this.rebuilder = new Map();
            this.reupgrader = new Map();
            for (let i in this.targetBase) {
                this.rebuilder.set(this.targetBase[i][0] + this.targetBase[i][1] * 1000, [this.targetBase[i][0], this.targetBase[i][1], this.targetBase[i][2], this.targetBase[i][3]]);
                this.reupgrader.set(this.targetBase[i][0] + this.targetBase[i][1] * 1000, [this.targetBase[i][0], this.targetBase[i][1], this.targetBase[i][4]]);
                if (!Object.values(game.ui.buildings).find((x) => x.x === this.targetBase[i][0] * 24 + this.gs.x && x.y === this.targetBase[i][1] * 24 + this.gs.y)) {
                    if (this.targetBase[i][2] !== "GoldStash") {
                        this.inactiveRebuilder.set(this.targetBase[i][0] + this.targetBase[i][1] * 1000, this.targetBase[i]);
                    }
                }
            }
        }
        if (key === "autoupgrade" && this.targetBase) {
            this.inactiveReupgrader = new Map();
            this.reupgrader = new Map();
            for (let i in this.targetBase) {
                this.reupgrader.set(this.targetBase[i][0] + this.targetBase[i][1] * 1000, [this.targetBase[i][0], this.targetBase[i][1], this.targetBase[i][4]]);
                const building = Object.values(game.ui.buildings).find((x) => x.x === this.targetBase[i][0] * 24 + this.gs.x && x.y === this.targetBase[i][1] * 24 + this.gs.y && x.tier < this.targetBase[i][4]);
                const index = this.targetBase[i][0] + this.targetBase[i][1] * 1000;
                if (building) {
                    const reupgrader = this.reupgrader.get(index);
                    this.inactiveReupgrader.set(index, [reupgrader[0], reupgrader[1], reupgrader[2], building.tier, building.uid]);
                }
            }        
        }
        if (key === "showrss" && !enabled) {
            if (!window.pEntities || !window.pEntities.size) return;
            window.pEntities.forEach((e) => {
                if (game.world.entities.has(e)) {
                    const entity = game.world.entities.get(e);
                    if (entity.targetTick.oldName && entity.targetTick.oldName.length) {
                        entity.targetTick.name = entity.targetTick.oldName;
                        entity.targetTick.oldName = null;
                    }
                }
                window.pEntities.delete(e);
            });
        }
        if (key === "mousemove" && !enabled && game.inputManager) {
            game.inputManager.isFocused = false;
            for (let i in sockets) {
                if (sockets[i].myPlayer) {
                    sockets[i].sendPacket(3, { up: 0, down: 0, left: 0, right: 0 });
                }
            }
        }
        if (key === "scorelogger") {
            this.scoreLoggerIsNight = true;
            if (enabled) {
                this.resetScoreLogger();
            } else {
                this.scoreLoggerStatus = "Off";
                this.updateScoreLoggerPanel();
            }
        }
    }
    updateScriptMenu() {
        document.body.classList.toggle("is-score-logger-active", !!this.scripts.scorelogger);
        const buttons = document.querySelectorAll(".hud-script-toggle");
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            const enabled = !!this.scripts[button.dataset.script];
            button.classList.toggle("btn-green", enabled);
            button.classList.toggle("btn-red", !enabled);
            button.classList.toggle("is-active", enabled);
            button.setAttribute("data-state", enabled ? "on" : "off");
        }
        const sessionButtons = document.querySelectorAll(".hud-session-toggle");
        for (let i = 0; i < sessionButtons.length; i++) {
            const button = sessionButtons[i];
            const enabled = !!this.sessionScripts[button.dataset.sessionScript];
            button.classList.toggle("btn-green", enabled);
            button.classList.toggle("btn-red", !enabled);
            button.classList.toggle("is-active", enabled);
            button.setAttribute("data-state", enabled ? "on" : "off");
        }
        this.syncRenderButtons();
        const scoreLogsMenu = document.querySelector(".hud-menu-FPS");
        const scoreLogsVisible = !!(scoreLogsMenu && scoreLogsMenu.offsetParent !== null && getComputedStyle(scoreLogsMenu).display !== "none");
        if (this.scripts.scorelogger || scoreLogsVisible) {
            this.updateScoreLoggerPanel();
        }
    }
    createBorders(x, y, color) {
        let size = 0;
        switch (color) {
            case "red":
                size = 1728;
                break;
            case "yellow":
                size = 3360;
                break;
            case "green":
                size = 5088;
                break;
            case "white":
                size = 96;
                break;
        }
        createBorder(x, y, size, color);
    }
    createCircle(x, y) {
        window.gr && window.gr.destroy();
        window.gr = new PIXI.Graphics();
        window.gr.beginFill(0xffffff);
        window.gr.drawCircle(x, y, Math.sqrt(2) * 864);
        window.gr.alpha = 0.025;
        document.showSpawnCircle = document.showSpawnCircle === true;
        document.spawnCircleNodes = document.spawnCircleNodes || [];
        document.spawnCircleNodes = document.spawnCircleNodes.filter((circle) => circle && !circle.destroyed && (!circle.node || !circle.node.destroyed));
        document.spawnCircleNodes.push(window.gr);
        window.gr.visible = document.showSpawnCircle;
        game.world.renderer.ground.node.addChild(window.gr);
    }
    depositAhrc(tick) {
        this.harvesters.forEach((e) => {
            if (e.tier === tick.tier) {
                game.network.sendPacket(9, { name: "AddDepositToHarvester", uid: e.uid, deposit: tick.deposit });
            }
        });
    }
    collectAhrc(tick) {
        this.harvesters.forEach((e) => {
            if (e.tier === tick.tier) {
                game.network.sendPacket(9, { name: "CollectHarvester", uid: e.uid });
            }
        });
    }
    counter = (e = 0) => {
        return e <= 999.5 ? Math.round(e) + "" : e <= 9995e2 ? Math.round(e / 1e2) / 10 + "K" : e <= 9995e5 ? Math.round(e / 1e5) / 10 + "M" : e <= 9995e8 ? Math.round(e / 1e8) / 10 + "B" : e <= 9995e11 ? Math.round(e / 1e11) / 10 + "T" : "Many";
    }
    mover(e, uid) {
        const isActive = e.get(uid);
        if (isActive) {
            const player = game.world.entities.get(uid);
            if (player) {
                this.playerX = player.targetTick.position.x;
                this.playerY = player.targetTick.position.y;
            }
            if (isActive) {
                this.yaw = isActive.yaw;
                game.ui.playerTick.yyaw = this.yaw;
            }
        }
        this.s.playerX = this.playerX;
        this.s.playerY = this.playerY;
        if (this.yaw) {
            this.s.isYaw = true;
            if (this.yaw === 90) {
                game.network.sendPacket(3, { right: 1, left: 0, up: 0, down: 0 });
            } else if (this.yaw === 225) {
                game.network.sendPacket(3, { down: 1, left: 1, up: 0, right: 0 });
            } else if (this.yaw === 44) {
                game.network.sendPacket(3, { down: 0, left: 0, up: 1, right: 1 });
            } else if (this.yaw === 314) {
                game.network.sendPacket(3, { down: 0, left: 1, up: 1, right: 0 });
            } else if (this.yaw === 135) {
                game.network.sendPacket(3, { down: 1, left: 0, up: 0, right: 1 });
            } else if (this.yaw === 359) {
                game.network.sendPacket(3, { up: 1, down: 0, right: 0, left: 0 });
            } else if (this.yaw === 180) {
                game.network.sendPacket(3, { down: 1, up: 0, right: 0, left: 0 });
            } else if (this.yaw === 270) {
                game.network.sendPacket(3, { left: 1, right: 0, up: 0, down: 0 });
            }
        } else {
            if (this.s.isYaw) {
                this.s.isYaw = false;
                game.network.sendPacket(3, { right: 0, left: 0, up: 0, down: 0 });
            }
        }
        if (game.ui.playerTick.position) {
            if (game.ui.playerTick.position.y - this.s.playerY > 100 || Math.sqrt(Math.pow((game.ui.playerTick.position.y - this.s.playerY), 2) + Math.pow((game.ui.playerTick.position.x - this.s.playerX), 2)) < 100) {
                if (!this.s.stopped) {
                    this.s.isYaw = true;
                }
            } else {
                this.s.stopped = false;
                if (!this.yaw) {
                    game.network.sendPacket(3, { down: 1 });
                }
            }
            if (-game.ui.playerTick.position.y + this.s.playerY > 100 || Math.sqrt(Math.pow((game.ui.playerTick.position.y - this.s.playerY), 2) + Math.pow((game.ui.playerTick.position.x - this.s.playerX), 2)) < 100) {
                if (!this.s.stopped) {
                    this.s.isYaw = true;
                }
            } else {
                this.s.stopped = false;
                if (!this.yaw) {
                    game.network.sendPacket(3, { up: 1 });
                }
            }
            if (-game.ui.playerTick.position.x + this.s.playerX > 100 || Math.sqrt(Math.pow((game.ui.playerTick.position.y - this.s.playerY), 2) + Math.pow((game.ui.playerTick.position.x - this.s.playerX), 2)) < 100) {
                if (!this.s.stopped) {
                    this.s.isYaw = true;
                }
            } else {
                this.s.stopped = false;
                if (!this.yaw) {
                    game.network.sendPacket(3, { left: 1 });
                }
            }
            if (game.ui.playerTick.position.x - this.s.playerX > 100 || Math.sqrt(Math.pow((game.ui.playerTick.position.y - this.s.playerY), 2) + Math.pow((game.ui.playerTick.position.x - this.s.playerX), 2)) < 100) {
                if (!this.s.stopped) {
                    this.s.isYaw = true;
                }
            } else {
                this.s.stopped = false;
                if (!this.yaw) {
                    game.network.sendPacket(3, { right: 1 });
                }
            }
            if (Math.sqrt(Math.pow((game.ui.playerTick.position.y - this.s.playerY), 2) + Math.pow((game.ui.playerTick.position.x - this.s.playerX), 2)) < 100) {
                this.s.stopped = true;
            }
        }
    }
    connect(serverNum) {
        if (socketServers[serverNum].socket.onmessage === null) {
            socketServers[serverNum].socket.sendMessage = (m) => {
                if (socketServers[serverNum].socket.readyState === 1) {
                    socketServers[serverNum].socket.send(m);
                }
            }
            socketServers[serverNum].socket.onmessage = (m) => {
                const msg = user.decode(m.data);
                switch (msg.split(" ")[0].replaceAll(" ", "")) {
                    case "clientId":
                        const password = localStorage.password;
                        socketServers[serverNum].socket.clientId = socketServers[serverNum].socket.clientId ? socketServers[serverNum].socket.clientId : msg.split(" ")[1];
                        socketServers[serverNum].socket.sendMessage(`clientId ${socketServers[serverNum].socket.clientId} ${password}`);
                        for (let message in this.messagesToSend) {
                            const msg = this.messagesToSend[message];
                            socketServers[serverNum].socket.sendMessage(msg);
                        }
                        this.messagesToSend = [];
                        break;
                    case "opcode4":
                        const opcode4id = msg.split(" ")[1];
                        const opcode5 = new Uint8Array(JSON.parse(`[${msg.split(" ")[2]}]`));
                        const opcode6 = new Uint8Array(JSON.parse(`[${msg.split(" ")[3]}]`));
                        Object.values(sockets).find((e) => {
                            if (e.wid == opcode4id) {
                                opcode5Ids[e.wid] = [this.altName, opcode5];
                                if (!this.scripts.joindelay) {
                                    e.sendPacket(4, { displayName: this.altName, extra: opcode5 });
                                    e.verified = true;
                                }
                                e.enterworld2 = opcode6;
                            }
                        });
                        break;
                    case "opcode10":
                        const opcode10id = msg.split(" ")[1];
                        const module = new Uint8Array(JSON.parse(`[${msg.split(" ")[2]}]`));
                        Object.values(sockets).find((e) => {
                            if (e.wid == opcode10id) {
                                e.ws.send(module);
                            }
                        });
                        break;
                }
            }
            socketServers[serverNum].socket.reconnect = (closed) => {
                if (!closed) {
                    socketServers[serverNum].socket.reconnecting = true;
                }
                const oldWs = socketServers[serverNum].socket;
                socketServers[serverNum].socket = new WebSocket(oldWs.url);
                socketServers[serverNum].socket.binaryType = "arraybuffer";
                socketServers[serverNum].socket.clientId = oldWs.clientId;
                socketServers[serverNum].socket.sendMessage = oldWs.sendMessage;
                socketServers[serverNum].socket.onmessage = oldWs.onmessage;
                socketServers[serverNum].socket.reconnect = oldWs.reconnect;
                socketServers[serverNum].socket.onclose = oldWs.onclose;
            }
            socketServers[serverNum].socket.onclose = () => {
                if (socketServers[serverNum].socket.reconnecting) {
                    socketServers[serverNum].socket.reconnecting = false;
                    return;
                }
                setTimeout(() => {
                    socketServers[serverNum].socket.reconnect(true);
                }, 1000);
            }
        }
        return serverNum;
    }
    fnc() {
        if (this.automove) {
            if (game.ui.playerTick.position.x > 1200 + this.m) {
                game.network.sendPacket(3, { left: 1, right: 0 });
                this.stoppedmovingrightorleft = false;
            } else if (game.ui.playerTick.position.x < 1000 + this.m) {
                game.network.sendPacket(3, { right: 1, left: 0 });
                this.stoppedmovingrightorleft = false;
            } else {
                if (!this.stoppedmovingrightorleft) {
                    game.network.sendPacket(3, { right: 0, left: 0 });
                    this.stoppedmovingrightorleft = true;
                }
                if (this.shouldMoveDown) {
                    this.shouldMoveDown = false;
                    game.network.sendPacket(3, { down: 1, up: 0 });
                }
                if (this.shouldMoveUp) {
                    this.shouldMoveUp = false;
                    game.network.sendPacket(3, { up: 1, down: 0 });
                }
            }
            if (game.ui.playerTick.position.y < 350 && !this.needsToCompleteBottom) {
                this.hascompletedmovingfromtop = true;
                this.needsToCompleteBottom = true;
                this.needsToCompleteTop = false;
            }
            if (game.ui.playerTick.position.y > 23650 && !this.needsToCompleteTop) {
                this.hascompletedmovingfrombottom = true;
                this.needsToCompleteTop = true;
                this.needsToCompleteBottom = false;
            }
            if (this.hascompletedmovingfromtop) {
                this.hascompletedmovingfromtop = false;
                game.network.sendPacket(3, { up: 0, down: 0 });
                if (this.round !== 0) {
                    ++this.round;
                    this.m += 1000;
                }
                this.shouldMoveDown = true;
            }
            if (this.hascompletedmovingfrombottom && this.isReadyToScanSpots) {
                this.hascompletedmovingfrombottom = false;
                game.network.sendPacket(3, { up: 0, down: 0 });
                ++this.round;
                this.m += 1000;
                this.shouldMoveUp = true;
            }
            if (this.round >= 23) {
                this.automove = false;
            }
            if (this.round === 0 && game.ui.playerTick.position.y > 350 && !this.isReadyToScanSpots) {
                game.network.sendPacket(3, { up: 1, down: 0 });
            } else {
                if (!this.stoppedmovingupordown) {
                    game.network.sendPacket(3, { up: 0, down: 0 });
                    this.stoppedmovingupordown = true;
                }
            }
            if (this.stoppedmovingupordown && this.stoppedmovingrightorleft && !this.isReadyToScanSpots) {
                this.isReadyToScanSpots = true;
                game.network.sendPacket(3, { down: 1, up: 0 });
            }
        }
    }
    getIndexOfRealPos({ x, y }) {
        return (y * 50000 * 100 + x).toFixed(2) - "";
    }
    getServerSpots() {
        const entitiesFound = [];
        const entitiesCount = { entities: 0, trees: 0, stones: 0, camps: 0 };
        for (let i = 0; i < 825; i++) {
            const e = game.world.entities.get(i + 1);
            if (e) {
                if (e.fromTick.model === "Tree" || e.fromTick.model === "Stone" || e.fromTick.model === "NeutralCamp") {
                    if (e.fromTick.model === "Tree") {
                        ++entitiesCount.trees;
                    }
                    if (e.fromTick.model === "Stone") {
                        ++entitiesCount.stones;
                    }
                    if (e.fromTick.model === "NeutralCamp") {
                        ++entitiesCount.camps;
                    }
                    ++entitiesCount.entities;
                    entitiesFound.push(this.getIndexOfRealPos(e.fromTick.position));
                }
            } else {
                entitiesFound.push(null);
            }
        }
        const json = `${game.options.serverId}: {\n    spotEncoded: "${JSON.stringify(entitiesFound)}",\n    spotinfo: "${entitiesCount.entities} entities, ${entitiesCount.trees} trees, ${entitiesCount.stones} stones and ${entitiesCount.camps} neutral camps."\n},`;
        console.log(json);
    }
    onEnterWorld(data) {
        this.altName = data.effectiveDisplayName;
        this.globalName = this.altName;
        if (this.serverId !== game.options.serverId) {
            this.serverId = game.options.serverId;
            const regions = { v1: "US East", v2: "US West", v5: "Europe", v3: "Asia", v4: "Australia" };
            const number = this.serverId.slice(this.serverId.length - 1, this.serverId.length);
            if (this.serverId.startsWith("v1")) {
                this.serverName = `${regions.v1} #${number}`;
            } else if (this.serverId.startsWith("v2")) {
                this.serverName = `${regions.v2} #${number}`;
            } else if (this.serverId.startsWith("v5")) {
                this.serverName = `${regions.v5} #${number}`;
            } else if (this.serverId.startsWith("v3")) {
                this.serverName = `${regions.v3} #${number}`;
            } else if (this.serverId.startsWith("v4")) {
                this.serverName = `${regions.v4} #${number}`;
            }
            getElement("hud-party-server")[0].innerHTML = this.serverName;
        }
        if (window.alreadyEntered || !data.allowed) return;
        window.alreadyEntered = true;
        if (data.allowed) {
            if (user.connectedToId) {
                game.ui.components.PopupOverlay.showHint(`You're on Session #${user.connectedToId}.`);
            } else {
                game.ui.components.PopupOverlay.showHint("You're on a Tab.");
            }
        }
        game.ui.components.PopupOverlay.showHint(`This server was last reset ${(data.startingTick / 1728000).toFixed(2)} days ago.`);
        getElement("hud-menu-icon")[2].onclick = () => {
            getElement("hud-menu-FPS")[0].style.display = "none";
        }
        getElement("hud-menu-icon")[3].onclick = () => {
            getElement("hud-menu-settings")[0].style.display = "none";
        }
        if (!data.allowed) return;
        game.network.sendPacket(9, { name: "BuyItem", itemName: "HatHorns", tier: 1 });
        game.network.sendPacket(9, { name: "BuyItem", itemName: "PetCARL", tier: 1 });
        game.network.sendPacket(9, { name: "BuyItem", itemName: "PetMiner", tier: 1 });
        if (!user.connectedToId) {
            game.network.sendPacket(9, { name: "EquipItem", itemName: "PetCARL", tier: 1 });
            game.network.sendPacket(9, { name: "EquipItem", itemName: "PetMiner", tier: 1 });
        }
        if (this.isSetup) return;
        const loadingScreenDisabled = window.isBansheeSessionLoaderDisabled && window.isBansheeSessionLoaderDisabled();
        getElement("hud")[0].style.backgroundImage = "url()";
        setTimeout(() => {
            getElement("hud-top-left")[0].style.display = "flex";
            getElement("hud-top-right")[0].style.display = "flex";
            getElement("hud-center-left")[0].style.display = "flex";
            getElement("hud-center-right")[0].style.display = "flex";
            getElement("hud-bottom-left")[0].style.display = "flex";
            getElement("hud-bottom-center")[0].style.display = "flex";
            getElement("hud-bottom-right")[0].style.display = "flex";
            if (!game.renderer.entities.isVisible) game.renderer.entities.setVisible(true);
            if (!game.ui.components.BuffBar.isVisible()) game.ui.components.BuffBar.show();
            if (!game.ui.components.PipOverlay.isVisible()) game.ui.components.PipOverlay.show();
            if (!game.ui.components.PopupOverlay.isVisible()) game.ui.components.PopupOverlay.show();
            if (!game.ui.components.AnnouncementOverlay.isVisible()) game.ui.components.AnnouncementOverlay.show();
        }, !loadingScreenDisabled ? 1000 : 0);
        for (let i in getElement("hud-shop-item")) {
            const { className, dataset } = getElement("hud-shop-item")[i];
            if (className && className === "hud-shop-item") {
                getElement("hud-shop-item")[i].addEventListener("click", (e) => {
                    for (let ii in sockets) {
                        if (sockets[ii].myPlayer) {
                            if (sockets[ii].inventory[dataset.item]) {
                                sockets[ii].sendPacket(9, { name: "BuyItem", itemName: dataset.item, tier: sockets[ii].inventory[dataset.item].tier + 1 });
                            } else {
                                sockets[ii].sendPacket(9, { name: "BuyItem", itemName: dataset.item, tier: 1 });
                            }
                        }
                    }
                });
            }
        }
        for (let i = 0; i < getElement("hud-toolbar-item").length; i++) {
            const { className, dataset } = getElement("hud-toolbar-item")[i];
            getElement("hud-toolbar-item")[i].addEventListener("mouseup", (e) => {
                for (let ii in sockets) {
                    if (sockets[ii].myPlayer) {
                        if (sockets[ii].inventory[dataset.item]) {
                            sockets[ii].sendPacket(9, { name: "EquipItem", itemName: dataset.item, tier: sockets[ii].inventory[dataset.item].tier });
                        }
                    }
                }
            });
        }
        getElement("hud-party-members")[0].style.display = "block";
        getElement("hud-party-grid")[0].style.display = "none";
        const privateTab = document.createElement("a");
        privateTab.className = "hud-party-tabs-link";
        privateTab.id = "privateTab";
        privateTab.innerHTML = "Private Parties";
        const privateHud = document.createElement("div");
        privateHud.className = "hud-private hud-party-grid";
        privateHud.id = "privateHud";
        privateHud.style = "display: none;";
        getElement("hud-party-tabs")[0].appendChild(privateTab);
        getElement("hud-menu hud-menu-party")[0].insertBefore(privateHud, getElement("hud-party-actions")[0]);
        const keyTab = document.createElement("a");
        keyTab.className = "hud-party-tabs-link";
        keyTab.id = "keyTab";
        keyTab.innerHTML = "Party Keys";
        getElement("hud-party-tabs")[0].appendChild(keyTab);
        const keyHud = document.createElement("div");
        keyHud.className = "hud-keys hud-party-grid";
        keyHud.id = "keyHud";
        keyHud.style = "display: none;";
        getElement("hud-menu hud-menu-party")[0].insertBefore(keyHud, getElement("hud-party-actions")[0]);
        getId("privateTab").onclick = (e) => {
            for (let i = 0; i < getElement("hud-party-tabs-link").length; i++) {
                getElement("hud-party-tabs-link")[i].className = "hud-party-tabs-link";
            }
            getId("privateTab").className = "hud-party-tabs-link is-active";
            getId("privateHud").setAttribute("style", "display: block;");
            if (getElement("hud-party-members")[0].getAttribute("style") === "display: block;") {
                getElement("hud-party-members")[0].setAttribute("style", "display: none;");
            }
            if (getElement("hud-party-grid")[0].getAttribute("style") === "display: block;") {
                getElement("hud-party-grid")[0].setAttribute("style", "display: none;");
            }
            if (getId("privateHud").getAttribute("style") === "display: none;") {
                getId("privateHud").setAttribute("style", "display: block;");
            }
            if (getId("keyHud").getAttribute("style") === "display: block;") {
                getId("keyHud").setAttribute("style", "display: none;");
            }
        }
        getElement("hud-party-tabs-link")[0].onmouseup = (e) => {
            getId("privateHud").setAttribute("style", "display: none;");
            getId("keyHud").setAttribute("style", "display: none;");
            if (getId("privateTab").className === "hud-party-tabs-link is-active") {
                getId("privateTab").className = "hud-party-tabs-link";
            }
            if (getId("keyTab").className === "hud-party-tabs-link is-active") {
                getId("keyTab").className = "hud-party-tabs-link";
            }
        }
        getElement("hud-party-tabs-link")[1].onmouseup = (e) => {
            getId("privateHud").setAttribute("style", "display: none;");
            getId("keyHud").setAttribute("style", "display: none;");
            if (getId("privateTab").className === "hud-party-tabs-link is-active") {
                getId("privateTab").className = "hud-party-tabs-link";
            }
            if (getId("keyTab").className === "hud-party-tabs-link is-active") {
                getId("keyTab").className = "hud-party-tabs-link";
            }
        }
        getId("keyTab").onmouseup = (e) => {
            for (let i = 0; i < getElement("hud-party-tabs-link").length; i++) {
                getElement("hud-party-tabs-link")[i].className = "hud-party-tabs-link";
            }
            getId("keyTab").className = "hud-party-tabs-link is-active";
            getId("keyHud").setAttribute("style", "display: block;");
            if (getElement("hud-party-members")[0].getAttribute("style") === "display: block;") {
                getElement("hud-party-members")[0].setAttribute("style", "display: none;");
            }
            if (getElement("hud-party-grid")[0].getAttribute("style") === "display: block;") {
                getElement("hud-party-grid")[0].setAttribute("style", "display: none;");
            }
            if (getId("privateHud").getAttribute("style") === "display: block;") {
                getId("privateHud").setAttribute("style", "display: none;");
            }
            if (getId("keyHud").getAttribute("style") === "display: none;") {
                getId("keyHud").setAttribute("style", "display: block;");
            }
        }
        getElement("btn hud-script-toggle btn-red")[34].addEventListener("click", () => {
            this.allScores = [];
            this.currentId = 0;
        });
        this.isSetup = true;
    }
    onEntityUpdate(data) {
        data.entities.forEach((tick) => {
            if (tick !== true && tick.model === "GoldStash" && tick.position) {
                if (window.lines && window.lines.length) {
                    for (let i = 0; i < lines.length; i++) {
                        lines[i].destroy();
                    }
                    window.lines.length = 0;
                }
                this.createBorders(tick.position.x, tick.position.y, "red");
                this.createBorders(tick.position.x, tick.position.y, "yellow");
                this.createBorders(tick.position.x, tick.position.y, "green");
                this.createBorders(tick.position.x, tick.position.y, "white");
                this.createCircle(tick.position.x, tick.position.y);
            }
        });
        if (!this.scripts.positionlock) {
            this.mousePs = game.renderer.screenToWorld(game.ui.mousePosition.x, game.ui.mousePosition.y);
        }
        if (!game.ui.playerTick) return;
        this.nearestPlayer = false;
        this.nearestPlayerDistance = Infinity;
        if (game.ui.playerTick.petUid && !this.petActivated) {
            this.petActivated = true;
        }
        this.upgradeTicks = ++this.upgradeTicks % 10;
        this.rssTicks = ++this.rssTicks % 2;
        this.arfTicks = ++this.arfTicks % 200;
        this.pingTicks = ++this.pingTicks % 10;
        this.staleTicks = ++this.staleTicks % 600;
        if (this.scripts.autoaim || this.scripts.autofollow || this.scripts.showrss) {
            const entityList = game.world.entityList;
            if (this.scripts.showrss && this.rssTicks === 0) {
                if (!window.pEntities) window.pEntities = new Set();
                if (window.pEntities.size) {
                    window.pEntities.forEach((e) => {
                        if (!data.entities.has(e)) window.pEntities.delete(e);
                    });
                }
            }            
            for (let i = 0; i < entityList.length; i++) {
                const e = entityList[i];
                const tick = e.targetTick;
                if (!tick) continue;
                if ((this.scripts.autoaim || this.scripts.autofollow) && tick.model === "GamePlayer" && e.uid !== game.world.myUid && !socketsByUid[e.uid] && tick.partyId !== game.ui.playerPartyId && !tick.dead && tick.position) {
                    const dx = tick.position.x - game.ui.playerTick.position.x;
                    const dy = tick.position.y - game.ui.playerTick.position.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < this.nearestPlayerDistance) {
                        this.nearestPlayerDistance = distSq;
                        this.nearestPlayer = tick;
                    }
                }
                if (this.scripts.showrss && this.rssTicks === 0 && tick.model === "GamePlayer") {
                    if (!window.pEntities.has(e.uid)) window.pEntities.add(e.uid);
                    const wood_1 = this.counter(tick.wood);
                    const stone_1 = this.counter(tick.stone);
                    const gold_1 = this.counter(tick.gold);
                    const token_1 = this.counter(tick.token);
                    const px_1 = this.counter(tick.position.x);
                    const py_1 = this.counter(tick.position.y);
                    if (!tick.oldName) {
                        tick.oldWood = wood_1;
                        tick.oldStone = stone_1;
                        tick.oldGold = gold_1;
                        tick.oldPX = px_1;
                        tick.oldPY = py_1;
                        tick.oldName = tick.name;
                        tick.name = `${tick.oldName}, W ${wood_1}, S ${stone_1}, G ${gold_1}, T ${token_1}
X ${px_1}, Y ${py_1}, PID ${tick.partyId} (${game.ui.parties[tick.partyId] ? game.ui.parties[tick.partyId].memberCount : 1})
on ${tick.firingTick > 0 ? Math.round((game.world.replicator.currentTick.tick - tick.firingTick) / 1200) + "m ago" : "???"} (${e.uid}) ${tick.isPaused ? "🕓" : ""}`;
                    } else if (tick.oldWood !== wood_1 || tick.oldStone !== stone_1 || tick.oldGold !== gold_1 || tick.oldPX !== px_1 || tick.oldPY !== py_1) {
                        tick.oldWood = wood_1;
                        tick.oldStone = stone_1;
                        tick.oldGold = gold_1;
                        tick.oldPX = px_1;
                        tick.oldPY = py_1;
                        tick.name = `${tick.oldName}, W ${wood_1}, S ${stone_1}, G ${gold_1}, T ${token_1}
X ${px_1}, Y ${py_1}, PID ${tick.partyId} (${game.ui.parties[tick.partyId] ? game.ui.parties[tick.partyId].memberCount : 1})
on ${tick.firingTick > 0 ? Math.round((game.world.replicator.currentTick.tick - tick.firingTick) / 1200) + "m ago" : "???"} (${e.uid}) ${tick.isPaused ? "🕓" : ""}`;
                    }
                }
            }
        }
        const sockets2 = [];
        for (let i in sockets) {
            if (sockets[i].myPlayer) {
                if (this.scripts.showrss && this.rssTicks === 0 && game.world.entities.get(sockets[i].uid)) {
                    game.world.entities.get(sockets[i].uid).targetTick.oldName = sockets[i].id + "";
                }
                if (sockets[i].myPlayer.position && !sockets[i].mouseDownHit && sockets[i].myPlayer.health !== 0) {
                    sockets[i].distance = Math.hypot(this.mousePs.x - sockets[i].myPlayer.position.x, this.mousePs.y - sockets[i].myPlayer.position.y);
                    sockets2.push(sockets[i]);
                }
            }
        }
        this.nearestAlts = {};
        for (let i = 0; i < this.nearestAltCount; i++) {
            this.nearestAlts[i] = sockets2.sort((a, b) => {
                return a.distance - b.distance;
            })[i];
        }
        if (this.scripts.autoheal && !this.scripts.xkey) {
            if (game.ui.playerTick.health > 0 && game.ui.playerTick.health / 5 <= 20) {
                if (!this.autohealtimeout && game.ui.inventory.HealthPotion) {
                    this.autohealtimeout = true;
                    game.network.sendPacket(9, { name: "EquipItem", itemName: "HealthPotion", tier: 1 });
                    game.network.sendPacket(9, { name: "BuyItem", itemName: "HealthPotion", tier: 1 });
                }
            } else {
                if (this.autohealtimeout) {
                    this.autohealtimeout = false;
                }
            }
            if (!game.ui.inventory.HealthPotion) {
                game.network.sendPacket(9, { name: "BuyItem", itemName: "HealthPotion", tier: 1 });
            }
        }
        if (this.scripts.autopetpotion && game.ui.playerPetTick && game.ui.playerPetTick.health <= game.ui.playerPetTick.maxHealth * this.petHealHealth / 100 && !game.ui.inventory.PetHealthPotion) {
            game.network.sendPacket(9, { name: "BuyItem", itemName: "PetHealthPotion", tier: 1 });
        }
        if (this.scripts.autopetheal && game.ui.playerPetTick && game.ui.playerPetTick.health <= game.ui.playerPetTick.maxHealth * this.petHealHealth / 100 && game.ui.inventory.PetHealthPotion) {
            game.network.sendPacket(9, { name: "EquipItem", itemName: "PetHealthPotion", tier: 1 });
        }
        if (this.scripts.autorevivepets && (this.petActivated || user.connectedToId)) {
            game.network.sendPacket(9, { name: "BuyItem", itemName: "PetRevive", tier: 1 });
            game.network.sendPacket(9, { name: "EquipItem", itemName: "PetRevive", tier: 1 });
        }
        if (this.scripts.autoevolvepets && game.ui.playerPetTick && game.ui.playerPetTick.tier < 8) {
            const petLevel = game.ui.playerPetTick.experience / 100 + 1;
            if (petLevel >= 9 && game.ui.playerPetTick.tier < 2 && game.ui.playerTick.token >= 100) {
                game.network.sendPacket(9, { name: "BuyItem", itemName: game.ui.playerPetTick.model, tier: 2 });
            } else if (petLevel >= 17 && game.ui.playerPetTick.tier < 3 && game.ui.playerTick.token >= 100) {
                game.network.sendPacket(9, { name: "BuyItem", itemName: game.ui.playerPetTick.model, tier: 3 });
            } else if (petLevel >= 25 && game.ui.playerPetTick.tier < 4 && game.ui.playerTick.token >= 100) {
                game.network.sendPacket(9, { name: "BuyItem", itemName: game.ui.playerPetTick.model, tier: 4 });
            } else if (petLevel >= 33 && game.ui.playerPetTick.tier < 5 && game.ui.playerTick.token >= 100) {
                game.network.sendPacket(9, { name: "BuyItem", itemName: game.ui.playerPetTick.model, tier: 5 });
            } else if (petLevel >= 49 && game.ui.playerPetTick.tier < 6 && game.ui.playerTick.token >= 200) {
                game.network.sendPacket(9, { name: "BuyItem", itemName: game.ui.playerPetTick.model, tier: 6 });
            } else if (petLevel >= 65 && game.ui.playerPetTick.tier < 7 && game.ui.playerTick.token >= 200) {
                game.network.sendPacket(9, { name: "BuyItem", itemName: game.ui.playerPetTick.model, tier: 7 });
            } else if (petLevel >= 97 && game.ui.playerPetTick.tier < 8 && game.ui.playerTick.token >= 300) {
                game.network.sendPacket(9, { name: "BuyItem", itemName: game.ui.playerPetTick.model, tier: 8 });
            }
        }
        if (this.scripts.autobow) {
            if (game.ui.playerTick.weaponName === "Bow") {
                game.network.sendPacket(3, { space: 0 });
                game.network.sendPacket(3, { space: 1 });
            } else {
                game.network.sendPacket(3, { mouseDown: game.inputPacketCreator.lastAnyYaw });
            }
        }
        if (this.scripts.autotimeout && !game.ui.playerTick.isPaused && game.ui.playerTick.gold >= 10000) {
            game.network.sendPacket(9, { name: "BuyItem", itemName: "Pause", tier: 1 });
        }
        if (this.scripts.autofollow && this.nearestPlayer) {
            this.mover(data.entities, this.nearestPlayer.uid);
        }
        if (this.scripts.autoaim && this.nearestPlayer) {
            const aim = Math.floor((Math.atan2(this.nearestPlayer.position.y - game.ui.playerTick.position.y, this.nearestPlayer.position.x - game.ui.playerTick.position.x) * 180 / Math.PI + 450) % 360) || 0;
            if (game.ui.playerTick.aimingYaw !== aim) {
                game.network.sendPacket(3, { mouseMoved: aim });
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
        if (this.scripts.autorefiller && this.dayFiller && game.ui.components.DayNightTicker.tickData.isDay && this.arfTicks === 0) {
            new Alt();
        }
        if (this.scripts.chatspam && !user.connectedToId) {
            game.network.sendPacket(9, { name: "SendChatMessage", channel: "Local", message: this.chatSpamMessage });
        }
        if (this.scripts.clearchat) {
            for (let i = 0; i < getElement("hud-chat-message").length; i++) {
                getElement("hud-chat-message")[i].remove();
            }
        }
        if (this.scripts.xkey) {
            if (!game.ui.inventory[this.xKeyWeapon]) {
                if (game.ui.playerTick.gold >= 100) {
                    game.network.sendPacket(9, { name: "BuyItem", itemName: this.xKeyWeapon, tier: 1 });
                }
            } else {
                if (game.ui.playerTick.weaponName !== this.xKeyWeapon) {
                    game.network.sendPacket(9, { name: "EquipItem", itemName: this.xKeyWeapon, tier: game.ui.inventory[this.xKeyWeapon].tier });
                }
            }
        }
        if (this.scripts.autoshield && !game.ui.inventory.ZombieShield && game.ui.playerTick.gold >= 1000) {
            game.network.sendPacket(9, { name: "BuyItem", itemName: "ZombieShield", tier: 1 });
        }
        if (user.connectedToId) {
            if (this.scripts.sesswitcher && getElement("hud-vps-session-panel")[0].style.display !== "flex") {
                getElement("hud-vps-session-panel")[0].style.display = "flex";
            } else if (!this.scripts.sesswitcher && getElement("hud-vps-session-panel")[0].style.display !== "none") {
                getElement("hud-vps-session-panel")[0].style.display = "none";
            }
            if (this.updatePing && this.pingTicks === 0) {
                user.sendMessage("ping");
            }
        } else {
            if (this.scripts.sesswitcher) this.scripts.sesswitcher = false;
        }
        if (this.staleTicks === 0) {
            const staleAfter = 300_000;
            const now = Date.now();
            allEntities.forEach((entity) => {
                if (!(!entity || entity.tier || !entity.lastSeen) && now - entity.lastSeen > staleAfter) {
                    allEntities.delete(entity.uid);
                }
            });
        }
        if (this.gs) {
            if (this.scripts.autobuild) {
                this.inactiveRebuilder.forEach((e) => {
                    const x = e[0] * 24 + this.gs.x;
                    const y = e[1] * 24 + this.gs.y;
                    if (Math.abs(game.ui.playerTick.position.x - x) <= 576 && Math.abs(game.ui.playerTick.position.y - y) <= 576) {
                        game.network.sendPacket(9, { name: "MakeBuilding", x: x, y: y, type: e[2], yaw: e[3] });
                    }
                });
            }
            if (this.scripts.autoupgrade && this.upgradeTicks === 0) {
                this.inactiveReupgrader.forEach((e) => {
                    const x = e[0] * 24 + this.gs.x;
                    const y = e[1] * 24 + this.gs.y;
                    if (Math.hypot((game.ui.playerTick.position.x - x), (game.ui.playerTick.position.y - y)) <= 768) {
                        game.network.sendPacket(9, { name: "UpgradeBuilding", uid: e[4] });
                    }
                });
            }
            for (let i in game.ui.buildings) {
                if (this.scripts.upgradeall && game.ui.buildings[i].tier < this.gs.tier && Math.hypot((game.ui.playerTick.position.x - game.ui.buildings[i].x), (game.ui.playerTick.position.y - game.ui.buildings[i].y)) <= 768 && this.upgradeTicks === 0) {
                    game.network.sendPacket(9, { name: "UpgradeBuilding", uid: game.ui.buildings[i].uid });
                }
                if (this.scripts.sellall && game.ui.buildings[i].type !== "GoldStash" && Math.abs(game.ui.playerTick.position.x - game.ui.buildings[i].x) <= 1152 && Math.abs(game.ui.playerTick.position.y - game.ui.buildings[i].y) <= 1152) {
                    game.network.sendPacket(9, { name: "DeleteBuilding", uid: game.ui.buildings[i].uid });
                }
                if (this.scripts.uth && game.world.entities.get(game.ui.buildings[i].uid) && game.world.entities.get(game.ui.buildings[i].uid).targetTick.health <= game.world.entities.get(game.ui.buildings[i].uid).targetTick.maxHealth * this.uthHealth / 100 && game.ui.buildings[i].tier < (game.ui.buildings[i].type !== "GoldStash" ? this.gs.tier : 8) && Math.hypot((game.ui.playerTick.position.x - game.ui.buildings[i].x), (game.ui.playerTick.position.y - game.ui.buildings[i].y)) <= 768 && this.upgradeTicks === 0) {
                    game.network.sendPacket(9, { name: "UpgradeBuilding", uid: game.ui.buildings[i].uid });
                }
                if (this.scripts.towerheal && ["ArrowTower", "CannonTower", "BombTower", "MagicTower", "MeleeTower"].includes(game.ui.buildings[i].type) && game.world.entities.get(game.ui.buildings[i].uid) && game.world.entities.get(game.ui.buildings[i].uid).targetTick.health <= game.world.entities.get(game.ui.buildings[i].uid).targetTick.maxHealth * this.towerHealHealth / 100 && Math.hypot((game.ui.playerTick.position.x - game.ui.buildings[i].x), (game.ui.playerTick.position.y - game.ui.buildings[i].y)) <= 1000) {
                    game.network.sendPacket(9, { name: "CastSpell", spell: "HealTowersSpell", x: game.ui.buildings[i].x, y: game.ui.buildings[i].y, tier: 1 });
                }
            }
        }
    }
    onRpc(data) {
        switch (data.name) {
            case "LocalBuilding":
                data.response.forEach((e) => {
                    if (e.type === "GoldStash") {
                        if (!e.dead) {
                            this.gs = { x: e.x, y: e.y, tier: e.tier };
                            if (this.stashDied) {
                                this.stashDied = false;
                                for (let i in this.targetBase) {
                                    if (!Object.values(game.ui.buildings).find((x) => x.x === this.targetBase[i][0] * 24 + this.gs.x && x.y === this.targetBase[i][1] * 24 + this.gs.y)) {
                                        if (this.targetBase[i][2] !== "GoldStash") {
                                            this.inactiveRebuilder.set(this.targetBase[i][0] + this.targetBase[i][1] * 1000, this.targetBase[i]);
                                        }
                                    }
                                }
                            }
                        } else {
                            if (this.scripts.autobuild) {
                                this.rebuilder.forEach((e) => {
                                    if (e[2] === "Harvester") {
                                        this.inactiveRebuilder.set(e[0] + e[1] * 1000, e);
                                    }
                                });
                            }
                            this.gs = false;
                        }
                    }
                    if (e.type === "Harvester") {
                        if (!e.dead) {
                            this.harvesters.set(e.uid, { uid: e.uid, tier: e.tier });
                        } else {
                            this.harvesters.delete(e.uid);
                        }
                    }
                    if (this.scripts.autobuild && this.gs && this.rebuilder.get((e.x - this.gs.x) / 24 + (e.y - this.gs.y) / 24 * 1000)) {
                        const index = (e.x - this.gs.x) / 24 + (e.y - this.gs.y) / 24 * 1000;
                        const rebuilder = this.rebuilder.get(index);
                        if (e.dead) {
                            this.inactiveRebuilder.set(index, rebuilder);
                        } else {
                            this.inactiveRebuilder.delete(index);
                        }
                    }
                    if (this.scripts.autoupgrade && this.gs && this.reupgrader.get((e.x - this.gs.x) / 24 + (e.y - this.gs.y) / 24 * 1000)) {
                        const index = (e.x - this.gs.x) / 24 + (e.y - this.gs.y) / 24 * 1000;
                        const reupgrader = this.reupgrader.get(index);
                        if (e.dead) {
                            this.inactiveReupgrader.delete(index);
                        } else {
                            if (e.tier < reupgrader[2]) {
                                if (!this.inactiveReupgrader.get(index)) {
                                    this.inactiveReupgrader.set(index, [reupgrader[0], reupgrader[1], reupgrader[2], e.tier, e.uid]);
                                }
                            } else {
                                this.inactiveReupgrader.delete(index);
                            }
                        }
                    }
                });
                break;
            case "SetPartyList":
                this.players = 0;
                this.parties = "";
                const partyIds = [];
                data.response.forEach((e) => {
                    this.players += e.memberCount;
                    if (e.isOpen === 0) {
                        this.parties += "<div style=\"width: relative; height: relative;\" class=\"hud-party-link is-disabled\"><strong>" + Sanitize(e.partyName) + "</strong><span>" + e.memberCount + "/4; " + e.partyId + "<span></div>";
                    }
                    partyIds.push(e.partyId);
                });
                allEntities.forEach((e) => {
                    if (e.tier && !partyIds.includes(e.partyId)) {
                        allEntities.delete(e.uid);
                    }
                });
                if (this.oldPlayers !== this.players) {
                    this.oldPlayers = this.players;
                    game.ui.components.PopupOverlay.showHint(`${this.players === 1 ? "1 player" : `${this.players} players`} | ${Object.keys(socketsByUid).length === 1 ? "1 socket" : `${Object.keys(socketsByUid).length} sockets`}`);
                    if (user.connectedToId) {
                        document.title = `BAN_SESSION #${user.connectedToId} - ${this.players}, ${Object.keys(socketsByUid).length}`;
                    } else {
                        document.title = `BAN_TAB - ${this.players}, ${Object.keys(socketsByUid).length}`;
                    }
                }
                getId("privateHud").innerHTML = this.parties;
                if (this.scripts.autorefiller && this.nightFiller) {
                    const neededAlts = 40 - this.players;
                    if (neededAlts > 5) return;
                    for (let i = 0; i < neededAlts; i++) {
                        new Alt();
                    }
                }
                break;
            case "PartyShareKey":
                if (this.num === 0 || getElement(`tag${this.num}`)[0].innerText !== data.response.partyShareKey) {
                    const el = document.createElement("div");
                    el.innerText = data.response.partyShareKey;
                    el.className = `tag${++this.num}`;
                    getElement("hud-keys hud-party-grid")[0].appendChild(el);
                    getElement(`${el.className}`)[0].addEventListener("click", (e) => {
                        game.network.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: el.innerText });
                    });
                }
                break;
            case "PartyInfo":
                this.partyInfoAlt = data.response;
                this.partyInfoSession = data.response;
                if (data.response[0].playerUid === game.world.myUid) {
                    data.response.forEach((e) => {
                        if (socketsByUid[e.playerUid] && !e.canSell) {
                            game.network.sendPacket(9, { name: "SetPartyMemberCanSell", uid: e.playerUid, canSell: 1 });
                        }
                    });
                }
                break;
            case "ReceiveChatMessage":
                switch (this.chatVisibility) {
                    case "party":
                        let players = 0;
                        for (let i in game.ui.playerPartyMembers) {
                            if (data.response.uid === game.ui.playerPartyMembers[i].playerUid) {
                                players += 1;
                            }
                        }
                        if (players === 0) return;
                        break;
                    case "spam":
                        if (data.response.message.startsWith(".".repeat(50)) || data.response.message.startsWith("W".repeat(50))) return;
                        break;
                    case "none":
                        return;
                }
                const a = game.ui.getComponent("Chat");
                const b = data.response.uid;
                const c = Sanitize(data.response.displayName);
                const d = Sanitize(data.response.message);
                const e = a.ui.createElement(`<div class="hud-chat-message"><strong><small>(${b})</small> ${c}</strong>: ${d}</div>`);
                if (this.scripts.clearchat) return;
                a.messagesElem.appendChild(e);
                a.messagesElem.scrollTop = a.messagesElem.scrollHeight;
                break;
            case "Dead":
                getElement("hud-menu-settings")[0].style.display = "none";
                getElement("hud-menu-FPS")[0].style.display = "none";
                if (this.scripts.xkey) {
                    game.network.sendPacket(3, { respawn: 1 });
                }
                if (data.response.stashDied) {
                    this.stashDied = true;
                }
                break;
        }
    }
    onKeyDown(e) {
        if (e.repeat || !game.world.inWorld) return;
        if (document.activeElement.tagName.toLowerCase() !== "input" && document.activeElement.tagName.toLowerCase() !== "textarea") {
            switch (e.code) {
                case "BracketLeft":
                    game.network.sendPacket(9, { name: "LeaveParty" });
                    game.ui.components.PopupOverlay.showHint(`Left Party! ${e.code}.`);
                    break;
                case "BracketRight":
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            if (!sockets[i].gs) {
                                game.network.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: sockets[i].psk });
                            }
                        }
                    }
                    break;
                case "KeyJ":
                    for (let i = 1; i < 4; i++) {
                        if (sockets[i] && sockets[i].myPlayer) {
                            sockets[i].sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: game.ui.playerPartyShareKey });
                        }
                    }
                    break;
                case "KeyH":
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            sockets[i].sendPacket(9, { name: "LeaveParty" });
                        }
                    }
                    break;
                case "KeyM":
                    game.network.sendPacket(9, { name: "EquipItem", itemName: this.petToSpawn, tier: game.ui.inventory[this.petToSpawn].tier || 1 });
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            sockets[i].sendPacket(9, { name: "EquipItem", itemName: this.petToSpawn, tier: sockets[i].inventory[this.petToSpawn].tier || 1 });
                        }
                    }
                    game.ui.components.PopupOverlay.showHint(`${this.petToSpawn} Equipped! ${e.code}.`);
                    break;
                case "KeyN":
                    this.scripts.autorevivepets = !this.scripts.autorevivepets;
                    game.ui.components.PopupOverlay.showHint(`Auto Revive Pets ${this.scripts.autorevivepets ? "On" : "Off"}! ${e.code}.`);
                    break;
                case "KeyV":
                    game.network.sendPacket(9, { name: "DeleteBuilding", uid: game.ui.playerPetUid || 1 });
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            sockets[i].sendPacket(9, { name: "DeleteBuilding", uid: sockets[i].myPlayer.petUid || 1 });
                        }
                    }
                    game.ui.components.PopupOverlay.showHint(`Sold Pet! ${e.code}.`);
                    break;
                case "KeyX":
                    this.scripts.upgradeall = !this.scripts.upgradeall;
                    if (this.scripts.upgradeall) {
                        this.upgradeTicks = 9;
                    }
                    game.ui.components.PopupOverlay.showHint(`Auto Upgrade ${this.scripts.upgradeall ? "On" : "Off"}! ${e.code}.`);
                    break;
                case "KeyG":
                    this.scripts.autofollow = !this.scripts.autofollow;
                    break;
                case "KeyK":
                    this.scripts.clearchat = !this.scripts.clearchat;
                    game.ui.components.PopupOverlay.showHint(`Auto Clear Messages ${this.scripts.clearchat ? "On" : "Off"}! ${e.code}.`);
                    break;
                case "KeyL":
                    if (game.world.inWorld) {
                        new Alt();
                    }
                    break;
                case "KeyQ":
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            let nextWeapon = "Pickaxe";
                            const weaponOrder = ["Pickaxe", "Spear", "Bow", "Bomb"];
                            let foundCurrent = false;
                            for (let e in weaponOrder) {
                                if (foundCurrent) {
                                    if (sockets[i].inventory[weaponOrder[e]]) {
                                        nextWeapon = weaponOrder[e];
                                        break;
                                    }
                                } else if (weaponOrder[e] === sockets[i].myPlayer.weaponName) {
                                    foundCurrent = true;
                                }
                            }
                            sockets[i].sendPacket(9, { name: "EquipItem", itemName: nextWeapon, tier: sockets[i].inventory[nextWeapon].tier });
                        }
                    }
                    break;
                case "KeyR":
                    if (game.ui.components.BuildingOverlay.buildingUid) {
                        if (game.ui.components.BuildingOverlay.shouldUpgradeAll) {
                            for (let i in game.ui.buildings) {
                                if (game.ui.buildings.type === game.ui.components.BuildingOverlay.buildingId && game.ui.buildings.tier === game.ui.components.BuildingOverlay.buildingTier) {
                                    for (let ii in sockets) {
                                        if (sockets[ii].myPlayer) {
                                            sockets[ii].sendPacket(9, { name: "UpgradeBuilding", uid: game.ui.buildings[i].uid });
                                        }
                                    }
                                }
                            }
                        } else {
                            for (let i in sockets) {
                                if (sockets[i].myPlayer) {
                                    sockets[i].sendPacket(9, { name: "UpgradeBuilding", uid: game.ui.components.BuildingOverlay.buildingUid });
                                }
                            }
                        }
                    }
                    break;
                case "KeyY":
                    if (game.ui.components.BuildingOverlay.buildingUid && game.ui.components.BuildingOverlay.buildingId !== "GoldStash") {
                        if (game.ui.components.BuildingOverlay.shouldUpgradeAll) {
                            for (let i in game.ui.buildings) {
                                if (game.ui.buildings.type === game.ui.components.BuildingOverlay.buildingId && game.ui.buildings.tier === game.ui.components.BuildingOverlay.buildingTier) {
                                    for (let ii in sockets) {
                                        if (sockets[ii].myPlayer) {
                                            sockets[ii].sendPacket(9, { name: "DeleteBuilding", uid: game.ui.buildings[i].uid });
                                        }
                                    }
                                }
                            }
                        } else {
                            for (let i in sockets) {
                                if (sockets[i].myPlayer) {
                                    sockets[i].sendPacket(9, { name: "DeleteBuilding", uid: game.ui.components.BuildingOverlay.buildingUid });
                                }
                            }
                        }
                    }
                    break;
                case "KeyZ":
                    this.scripts.autobow = !this.scripts.autobow;
                    game.ui.components.PopupOverlay.showHint(`Auto Bow ${this.scripts.autobow ? "On" : "Off"}! ${e.code}.`);
                    break;
                case "Minus":
                    game.ui.components.PlacementOverlay.startPlacing("GoldStash");
                    break;
                case "Backquote":
                    this.scripts.showrss = !this.scripts.showrss;
                    if (this.scripts.showrss) {
                        this.rssTicks = 1;
                    } else {
                        if (!window.pEntities || !window.pEntities.size) return;
                        window.pEntities.forEach((e) => {
                            if (game.world.entities.has(e)) {
                                const entity = game.world.entities.get(e);
                                if (entity.targetTick.oldName && entity.targetTick.oldName.length) {
                                    entity.targetTick.name = entity.targetTick.oldName;
                                    entity.targetTick.oldName = null;
                                }
                            }
                            window.pEntities.delete(e);
                        });
                    }
                    game.ui.components.PopupOverlay.showHint(`Show Player Info ${this.scripts.showrss ? "Enabled" : "Disabled"}! ${e.code}.`);
                    break;
                case "Slash":
                    this.scripts.mousemove = !this.scripts.mousemove;
                    if (!this.scripts.mousemove) {
                        for (let i in sockets) {
                            if (sockets[i].myPlayer) {
                                sockets[i].sendPacket(3, { up: 0, down: 0, left: 0, right: 0 });
                            }
                        }
                    }
                    break;
                case "KeyP":
                    this.scripts.positionlock = !this.scripts.positionlock;
                    break;
                case "Semicolon":
                    this.scripts.wasd = !this.scripts.wasd;
                    break;
                case "Quote":
                    if (this.petToSpawn === "PetCARL") {
                        this.petToSpawn = "PetMiner";
                    } else {
                        this.petToSpawn = "PetCARL";
                    }
                    game.ui.components.PopupOverlay.showHint(`Spawn ${this.petToSpawn} On! ${e.code}.`);
                    break;
                case "KeyW":
                    if (!this.scripts.wasd || this.scripts.mousemove) return;
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            sockets[i].sendPacket(3, { up: 1, down: 0 });
                        }
                    }
                    break;
                case "KeyA":
                    if (!this.scripts.wasd || this.scripts.mousemove) return;
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            sockets[i].sendPacket(3, { left: 1, right: 0 });
                        }
                    }
                    break;
                case "KeyS":
                    if (!this.scripts.wasd || this.scripts.mousemove) return;
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            sockets[i].sendPacket(3, { down: 1, up: 0 });
                        }
                    }
                    break;
                case "KeyD":
                    if (!this.scripts.wasd || this.scripts.mousemove) return;
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            sockets[i].sendPacket(3, { right: 1, left: 0 });
                        }
                    }
                    break;
                case "Period":
                    for (let i in this.nearestAlts) {
                        const oldSocket = this.nearestAlts[i];
                        if (oldSocket && !oldSocket.mouseDownHit) {
                            oldSocket.mouseDownHit = 1;
                            oldSocket.sendPacket(9, { name: "EquipItem", itemName: "HealthPotion", tier: 1 });
                            oldSocket.timeout1Ticks = 1;
                            oldSocket.timeout2Ticks = 1;
                            oldSocket.timeout3Ticks = 1;
                        }
                    }
                    break;
                case "Comma":
                    game.network.sendPacket(9, { name: "CastSpell", spell: "HealTowersSpell", x: Math.round(this.mousePs.x), y: Math.round(this.mousePs.y), tier: 1 });
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            sockets[i].sendPacket(9, { name: "CastSpell", spell: "HealTowersSpell", x: Math.round(this.mousePs.x), y: Math.round(this.mousePs.y), tier: 1 });
                        }
                    }
                    break;
                case "IntlBackslash":
                    for (let i in this.nearestAlts) {
                        const nearestAlt = this.nearestAlts[i];
                        if (nearestAlt && !nearestAlt.hasHit) {
                            nearestAlt.hasHit = true;
                            nearestAlt.hitTicks = 0;
                            nearestAlt.sendPacket(3, { mouseDown: nearestAlt.aimingYaw });
                        }
                    }
                    break;
                case "KeyI":
                    getElement("hud-FPS-restart-walkthrough")[8].click();
                    game.ui.components.PopupOverlay.showHint(`Wall Ranges ${document.show7x7Grid ? "On" : "Off"}! ${e.code}.`);
                    break;
                case "KeyU":
                    this.scripts.joindelay = !this.scripts.joindelay;
                    game.ui.components.PopupOverlay.showHint(`Join Delay ${this.scripts.joindelay ? "On" : "Off"}! ${e.code}.`);
                    break;
                case "AltRight":
                    if (!this.scripts.joindelay || Object.keys(sockets).length !== Object.keys(opcode5Ids).length) return;
                    Object.values(sockets).find((ee) => {
                        if (opcode5Ids[ee.wid] && !ee.verified) {
                            const altData = opcode5Ids[ee.wid];
                            ee.sendPacket(4, { displayName: altData[0], extra: altData[1] });
                            ee.verified = true;
                        }
                    });
                    break;
                case "Backslash":
                    if (user.connectedToId) {
                        this.scripts.sesswitcher = !this.scripts.sesswitcher;
                        game.ui.components.PopupOverlay.showHint(`Session Switcher ${this.scripts.sesswitcher ? "On" : "Off"}! ${e.code}.`);
                    }
                    break;
            }
        }
    }
    onKeyUp(e) {
        if (!this.scripts.wasd || this.scripts.mousemove || !game.world.inWorld) return;
        if (document.activeElement.tagName.toLowerCase() !== "input" && document.activeElement.tagName.toLowerCase() !== "textarea") {
            switch (e.code) {
                case "KeyW":
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            sockets[i].sendPacket(3, { up: 0 });
                        }
                    }
                    break;
                case "KeyA":
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            sockets[i].sendPacket(3, { left: 0 });
                        }
                    }
                    break;
                case "KeyS":
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            sockets[i].sendPacket(3, { down: 0 });
                        }
                    }
                    break;
                case "KeyD":
                    for (let i in sockets) {
                        if (sockets[i].myPlayer) {
                            sockets[i].sendPacket(3, { right: 0 });
                        }
                    }
                    break;
            }
        }
    }
    onMouseDown(e) {
        if (e.button === 2) {
            this.scatter = true;
            for (let i in sockets) {
                if (sockets[i].myPlayer) {
                    sockets[i].scatter = true;
                }
            }
        }
        if (!e.button) {
            for (let i in sockets) {
                if (sockets[i].myPlayer) {
                    sockets[i].sendPacket(3, { mouseDown: sockets[i].aimingYaw });
                }
            }
        }
    }
    onMouseUp(e) {
        if (e.button === 2) {
            this.scatter = false;
            for (let i in sockets) {
                if (sockets[i].myPlayer) {
                    sockets[i].scatter = false;
                }
            }
        }
        if (!e.button) {
            for (let i in sockets) {
                if (sockets[i].myPlayer) {
                    sockets[i].sendPacket(3, { mouseUp: 1 });
                }
            }
        }
    }
    onSendRpc(e) {
        if (!game.world.inWorld) return;
        if (e.name === "SendChatMessage") {
            if (e.message.startsWith("!")) {
                const msg = e.message.toLowerCase();
                const args = msg.split(" ");
                const alt = sockets[args[1]];
                switch (msg.split(" ")[0].replaceAll(" ", "")) {
                    case "!ab":
                        if (user.connectedToId) {
                            user.sendMessage("eab");
                        }
                        break;
                    case "!!ab":
                        if (user.connectedToId) {
                            user.sendMessage("dab");
                        }
                        break;
                    case "!au":
                        if (user.connectedToId) {
                            user.sendMessage("eau");
                        }
                        break;
                    case "!!au":
                        if (user.connectedToId) {
                            user.sendMessage("dau");
                        }
                        break;
                    case "!atb":
                        if (user.connectedToId) {
                            user.sendMessage("eatb");
                        }
                        break;
                    case "!!atb":
                        if (user.connectedToId) {
                            user.sendMessage("datb");
                        }
                        break;
                    case "!aa":
                        if (user.connectedToId) {
                            user.sendMessage("eaa");
                        }
                        break;
                    case "!!aa":
                        if (user.connectedToId) {
                            user.sendMessage("daa");
                        }
                        break;
                    case "!apr":
                        if (user.connectedToId) {
                            user.sendMessage("eapr");
                        }
                        break;
                    case "!!apr":
                        if (user.connectedToId) {
                            user.sendMessage("dapr");
                        }
                        break;
                    case "!ape":
                        if (user.connectedToId) {
                            user.sendMessage("eape");
                        }
                        break;
                    case "!!ape":
                        if (user.connectedToId) {
                            user.sendMessage("dape");
                        }
                        break;
                    case "!aph":
                        if (user.connectedToId) {
                            user.sendMessage("eaph");
                        }
                        break;
                    case "!!aph":
                        if (user.connectedToId) {
                            user.sendMessage("daph");
                        }
                        break;
                    case "!aaz":
                        if (user.connectedToId) {
                            user.sendMessage("eaaz");
                        }
                        break;
                    case "!!aaz":
                        if (user.connectedToId) {
                            user.sendMessage("daaz");
                        }
                        break;
                    case "!aad":
                        if (user.connectedToId) {
                            user.sendMessage("eaad");
                        }
                        break;
                    case "!!aad":
                        if (user.connectedToId) {
                            user.sendMessage("daad");
                        }
                        break;
                    case "!pt":
                        if (user.connectedToId) {
                            user.sendMessage("ept");
                        }
                        break;
                    case "!!pt":
                        if (user.connectedToId) {
                            user.sendMessage("dpt");
                        }
                        break;
                    case "!rpt":
                        if (user.connectedToId) {
                            user.sendMessage("erpt");
                        }
                        break;
                    case "!!rpt":
                        if (user.connectedToId) {
                            user.sendMessage("drpt");
                        }
                        break;
                    case "!brpt":
                        if (user.connectedToId) {
                            user.sendMessage("ebrpt");
                        }
                        break;
                    case "!!brpt":
                        if (user.connectedToId) {
                            user.sendMessage("dbrpt");
                        }
                        break;
                    case "!trpt":
                        if (user.connectedToId) {
                            user.sendMessage("etrpt");
                        }
                        break;
                    case "!!trpt":
                        if (user.connectedToId) {
                            user.sendMessage("dtrpt");
                        }
                        break;
                    case "!ahrc":
                        if (user.connectedToId) {
                            user.sendMessage("eahrc");
                        }
                        break;
                    case "!!ahrc":
                        if (user.connectedToId) {
                            user.sendMessage("dahrc");
                        }
                        break;
                    case "!ua":
                        if (user.connectedToId) {
                            user.sendMessage("eua");
                        }
                        break;
                    case "!!ua":
                        if (user.connectedToId) {
                            user.sendMessage("dua");
                        }
                        break;
                    case "!sa":
                        if (user.connectedToId) {
                            user.sendMessage("esa");
                        }
                        break;
                    case "!!sa":
                        if (user.connectedToId) {
                            user.sendMessage("dsa");
                        }
                        break;
                    case "!uth":
                        if (user.connectedToId) {
                            user.sendMessage("euth");
                        }
                        break;
                    case "!!uth":
                        if (user.connectedToId) {
                            user.sendMessage("duth");
                        }
                        break;
                    case "!th":
                        if (user.connectedToId) {
                            user.sendMessage("eth");
                        }
                        break;
                    case "!!th":
                        if (user.connectedToId) {
                            user.sendMessage("dth");
                        }
                        break;
                    case "!at":
                        if (user.connectedToId) {
                            user.sendMessage("eat");
                        }
                        break;
                    case "!!at":
                        if (user.connectedToId) {
                            user.sendMessage("dat");
                        }
                        break;
                    case "!pl":
                        if (user.connectedToId) {
                            user.sendMessage("epl");
                        }
                        break;
                    case "!!pl":
                        if (user.connectedToId) {
                            user.sendMessage("dpl");
                        }
                        break;
                    case "!lock":
                        if (user.connectedToId) {
                            user.sendMessage("lock");
                        }
                        break;
                    case "!pf":
                        if (user.connectedToId) {
                            user.sendMessage("epf");
                        }
                        break;
                    case "!!pf":
                        if (user.connectedToId) {
                            user.sendMessage("dpf");
                        }
                        break;
                    case "!aar":
                        if (user.connectedToId) {
                            user.sendMessage("eaar");
                        }
                        break;
                    case "!!aar":
                        if (user.connectedToId) {
                            user.sendMessage("daar");
                        }
                        break;
                    case "!rev":
                        if (user.connectedToId) {
                            user.sendMessage("erev");
                        }
                        break;
                    case "!!rev":
                        if (user.connectedToId) {
                            user.sendMessage("drev");
                        }
                        break;
                    case "!rit":
                        if (user.connectedToId) {
                            user.sendMessage("erit");
                        }
                        break;
                    case "!!rit":
                        if (user.connectedToId) {
                            user.sendMessage("drit");
                        }
                        break;
                    case "!aws":
                        if (user.connectedToId) {
                            user.sendMessage("eaws");
                        }
                        break;
                    case "!!aws":
                        if (user.connectedToId) {
                            user.sendMessage("daws");
                        }
                        break;
                    case "!2lock":
                        if (user.connectedToId) {
                            user.sendMessage("2lock");
                        }
                        break;
                    case "!atm":
                        if (user.connectedToId) {
                            user.sendMessage("eatm");
                        }
                        break;
                    case "!!atm":
                        if (user.connectedToId) {
                            user.sendMessage("datm");
                        }
                        break;
                    case "!alock":
                        if (user.connectedToId) {
                            user.sendMessage("alock");
                        }
                        break;
                    case "!al":
                        if (user.connectedToId) {
                            user.sendMessage("eal");
                        }
                        break;
                    case "!!al":
                        if (user.connectedToId) {
                            user.sendMessage("dal");
                        }
                        break;
                    case "!wlock1":
                        if (user.connectedToId) {
                            user.sendMessage("wlock1");
                        }
                        break;
                    case "!wlock2":
                        if (user.connectedToId) {
                            user.sendMessage("wlock2");
                        }
                        break;
                    case "!hor":
                        if (user.connectedToId) {
                            user.sendMessage("hor");
                        }
                        break;
                    case "!ver":
                        if (user.connectedToId) {
                            user.sendMessage("ver");
                        }
                        break;
                    case "!wb":
                        if (user.connectedToId) {
                            user.sendMessage("ewb");
                        }
                        break;
                    case "!!wb":
                        if (user.connectedToId) {
                            user.sendMessage("dwb");
                        }
                        break;
                    case "!acz":
                        if (user.connectedToId) {
                            user.sendMessage("eacz");
                        }
                        break;
                    case "!!acz":
                        if (user.connectedToId) {
                            user.sendMessage("dacz");
                        }
                        break;
                    case "!asl":
                        if (user.connectedToId) {
                            user.sendMessage("easl");
                        }
                        break;
                    case "!!asl":
                        if (user.connectedToId) {
                            user.sendMessage("dasl");
                        }
                        break;
                    case "!uptime":
                        if (user.connectedToId) {
                            user.sendMessage("uptime");
                        }
                        break;
                    case "!mah":
                        if (args[1]) {
                            this.healHealth = args[1];
                        }
                        this.scripts.autoheal = true;
                        break;
                    case "!!mah":
                        this.scripts.autoheal = false;
                        break;
                    case "!mapp":
                        this.scripts.autopetpotion = true;
                        break;
                    case "!!mapp":
                        this.scripts.autopetpotion = false;
                        break;
                    case "!maph":
                        if (args[1]) {
                            this.petHealHealth = args[1];
                        }
                        this.scripts.autopetheal = true;
                        break;
                    case "!!maph":
                        this.scripts.autopetheal = false;
                        break;
                    case "!mape":
                        this.scripts.autoevolvepets = true;
                        break;
                    case "!!mape":
                        this.scripts.autoevolvepets = false;
                        break;
                    case "!record":
                        if (args[1] && Object.keys(game.ui.buildings).length > 1) {
                            localStorage[`ban.${args[1]}`] = "";
                            const rebuilder = new Map();
                            for (let i in game.ui.buildings) {
                                rebuilder.set((game.ui.buildings[i].x - this.gs.x) / 24 + (game.ui.buildings[i].y - this.gs.y) / 24 * 1000, [(game.ui.buildings[i].x - this.gs.x) / 24, (game.ui.buildings[i].y - this.gs.y) / 24, game.ui.buildings[i].type, (game.world.entities.get(game.ui.buildings[i].uid) ? game.world.entities.get(game.ui.buildings[i].uid).targetTick.yaw : 0), game.ui.buildings[i].tier]);
                            }
                            let building = 0;
                            rebuilder.forEach((e) => {
                                if (building === 0) {
                                    localStorage[`ban.${args[1]}`] += `{"${building++}": [${e[0]}, ${e[1]}, "${e[2]}", ${e[3]}, ${e[4]}], `;
                                } else if (building < rebuilder.size - 1) {
                                    localStorage[`ban.${args[1]}`] += `"${building++}": [${e[0]}, ${e[1]}, "${e[2]}", ${e[3]}, ${e[4]}], `;
                                } else if (building === rebuilder.size - 1) {
                                    localStorage[`ban.${args[1]}`] += `"${building++}": [${e[0]}, ${e[1]}, "${e[2]}", ${e[3]}, ${e[4]}]}`;
                                }
                            });
                        }
                        break;
                    case "!arb":
                        if (args[1] && localStorage[`ban.${args[1]}`]) {
                            this.targetBase = JSON.parse(localStorage[`ban.${args[1]}`]);
                            this.inactiveRebuilder = new Map();
                            this.inactiveReupgrader = new Map();
                            this.rebuilder = new Map();
                            this.reupgrader = new Map();
                            for (let i in this.targetBase) {
                                this.rebuilder.set(this.targetBase[i][0] + this.targetBase[i][1] * 1000, [this.targetBase[i][0], this.targetBase[i][1], this.targetBase[i][2], this.targetBase[i][3]]);
                                this.reupgrader.set(this.targetBase[i][0] + this.targetBase[i][1] * 1000, [this.targetBase[i][0], this.targetBase[i][1], this.targetBase[i][4]]);
                                if (!Object.values(game.ui.buildings).find((x) => x.x === this.targetBase[i][0] * 24 + this.gs.x && x.y === this.targetBase[i][1] * 24 + this.gs.y)) {
                                    if (this.targetBase[i][2] !== "GoldStash") {
                                        this.inactiveRebuilder.set(this.targetBase[i][0] + this.targetBase[i][1] * 1000, this.targetBase[i]);
                                    }
                                }
                            }
                            this.scripts.autobuild = true;
                        }
                        break;
                    case "!!arb":
                        this.scripts.autobuild = false;
                        break;
                    case "!aru":
                        if (args[1] && localStorage[`ban.${args[1]}`]) {
                            this.targetBase = JSON.parse(localStorage[`ban.${args[1]}`]);
                            this.inactiveReupgrader = new Map();
                            this.reupgrader = new Map();
                            for (let i in this.targetBase) {
                                this.reupgrader.set(this.targetBase[i][0] + this.targetBase[i][1] * 1000, [this.targetBase[i][0], this.targetBase[i][1], this.targetBase[i][4]]);
                                const building = Object.values(game.ui.buildings).find((x) => x.x === this.targetBase[i][0] * 24 + this.gs.x && x.y === this.targetBase[i][1] * 24 + this.gs.y && x.tier < this.targetBase[i][4]);
                                const index = this.targetBase[i][0] + this.targetBase[i][1] * 1000;
                                if (building) {
                                    const reupgrader = this.reupgrader.get(index);
                                    this.inactiveReupgrader.set(index, [reupgrader[0], reupgrader[1], reupgrader[2], building.tier, building.uid]);
                                }
                            }
                            this.scripts.autoupgrade = true;
                        }
                        break;
                    case "!!aru":
                        this.scripts.autoupgrade = false;
                        break;
                    case "!delete":
                        if (args[1] && localStorage[`ban.${args[1]}`]) {
                            delete localStorage[`ban.${args[1]}`];
                        }
                        break;
                    case "!pahrc":
                        if (alt) {
                            alt.ahrc = true;
                        } else {
                            this.scripts.ahrc = true;
                        }
                        break;
                    case "!!pahrc":
                        if (alt) {
                            alt.ahrc = false;
                        } else {
                            this.scripts.ahrc = false;
                            for (let i in sockets) {
                                if (sockets[i].myPlayer) {
                                    sockets[i].ahrc = false;
                                }
                            }
                        }
                        break;
                    case "!msa":
                        this.scripts.sellall = true;
                        break;
                    case "!!msa":
                        this.scripts.sellall = false;
                        break;
                    case "!muth":
                        if (args[1]) {
                            this.uthHealth = args[1];
                        }
                        this.scripts.uth = true;
                        break;
                    case "!!muth":
                        this.scripts.uth = false;
                        break;
                    case "!mth":
                        if (args[1]) {
                            this.towerHealHealth = args[1];
                        }
                        this.scripts.towerheal = true;
                        break;
                    case "!!mth":
                        this.scripts.towerheal = false;
                        break;
                    case "!mat":
                        this.scripts.autotimeout = true;
                        break;
                    case "!!mat":
                        this.scripts.autotimeout = false;
                        break;
                    case "!maa":
                        this.scripts.autoaim = true;
                        break;
                    case "!!maa":
                        this.scripts.autoaim = false;
                        break;
                    case "!ar":
                        this.scripts.autorespawn = true;
                        break;
                    case "!!ar":
                        this.scripts.autorespawn = false;
                        break;
                    case "!r":
                        if (alt) {
                            alt.sendPacket(3, { respawn: 1 });
                        } else {
                            for (let i in sockets) {
                                sockets[i].sendPacket(3, { respawn: 1 });
                            }
                        }
                        break;
                    case "!respawn":
                        game.network.sendPacket(3, { respawn: 1 });
                        break;
                    case "!af":
                        if (args[1]) {
                            this.dayFiller = args[1];
                        }
                        if (args[2]) {
                            this.nightFiller = args[2];
                        }
                        this.scripts.autorefiller = true;
                        break;
                    case "!!af":
                        this.scripts.autorefiller = false;
                        break;
                    case "!arc":
                        this.scripts.autoreconnect = true;
                        break;
                    case "!!arc":
                        this.scripts.autoreconnect = false;
                        break;
                    case "!aaj":
                        this.scripts.autoaltjoin = true;
                        break;
                    case "!!aaj":
                        this.scripts.autoaltjoin = false;
                        break;
                    case "!as":
                        if (args[1]) {
                            this.spearTier = args[1];
                        }
                        this.requiredGold = this.goldCosts[this.spearTier - 1];
                        this.scripts.autospear = true;
                        break;
                    case "!!as":
                        this.scripts.autospear = false;
                        break;
                    case "!sp":
                        this.scripts.chatspam = true;
                        if (user.connectedToId) {
                            user.sendMessage("esp");
                        }
                        break;
                    case "!!sp":
                        this.scripts.chatspam = false;
                        if (user.connectedToId) {
                            user.sendMessage("dsp");
                        }
                        break;
                    case "!xk":
                        if (args[1]) {
                            let weapon = args[1][0].toUpperCase();
                            for (let i = 1; i < args[1].length; i++) {
                                weapon += args[1][i];
                            }
                            this.xKeyWeapon = weapon;
                        }
                        this.scripts.xkey = true;
                        break;
                    case "!!xk":
                        this.scripts.xkey = false;
                        break;
                    case "!ft":
                        const goldStashes = [];
                        allEntities.forEach((e) => {
                            if (e.tier) {
                                goldStashes.push([e.partyId, e.tier]);
                            }
                        });
                        allEntities.forEach((e) => {
                            if (!e.tier) {
                                const rank = game.ui.components.Leaderboard.leaderboardData.find((x) => x.uid === e.uid);
                                let doNotSend = false;
                                for (let ii in goldStashes) {
                                    const ee = goldStashes[ii];
                                    if (e.partyId === ee[0]) {
                                        doNotSend = true;
                                        const tier = ee[1] === 1 ? "T1" : ee[1] === 2 ? "T2" : ee[1] === 3 ? "T3" : ee[1] === 4 ? "T4" : ee[1] === 5 ? "T5" : ee[1] === 6 ? "T6" : ee[1] === 7 ? "T7" : ee[1] === 8 ? "T8" : "";
                                        game.ui.components.Chat.onMessageReceived({ displayName: e.name, message: `X ${this.counter(e.position.x)}, Y ${this.counter(e.position.y)}, PID ${e.partyId} (${game.ui.parties[e.partyId] ? game.ui.parties[e.partyId].memberCount : 1}) ${tier} ${rank ? `#${rank.rank + 1}` : ""}`, uid: e.uid });
                                    }
                                }
                                if (!doNotSend) {
                                    const rank = game.ui.components.Leaderboard.leaderboardData.find((x) => x.uid === e.uid);
                                    game.ui.components.Chat.onMessageReceived({ displayName: e.name, message: `X ${this.counter(e.position.x)}, Y ${this.counter(e.position.y)}, PID ${e.partyId} (${game.ui.parties[e.partyId] ? game.ui.parties[e.partyId].memberCount : 1}) ${rank ? `#${rank.rank + 1}` : ""}`, uid: e.uid });
                                }
                            }
                        });
                        break;
                    case "!fs":
                        allEntities.forEach((e) => {
                            if (e.tier) {
                                const tier = e.tier === 1 ? "T1" : e.tier === 2 ? "T2" : e.tier === 3 ? "T3" : e.tier === 4 ? "T4" : e.tier === 5 ? "T5" : e.tier === 6 ? "T6" : e.tier === 7 ? "T7" : e.tier === 8 ? "T8" : "";
                                game.ui.components.Chat.onMessageReceived({ displayName: e.name, message: `X ${this.counter(e.position.x)}, Y ${this.counter(e.position.y)}, PID ${e.partyId} (${game.ui.parties[e.partyId] ? game.ui.parties[e.partyId].memberCount : 1}) ${tier}`, uid: e.uid });
                            }
                        });
                        break;
                    case "!azs":
                        this.scripts.autoshield = true;
                        break;
                    case "!!azs":
                        this.scripts.autoshield = false;
                        break;
                    case "!sl":
                        this.setScriptToggle("scorelogger", true);
                        this.updateScriptMenu();
                        break;
                    case "!!sl":
                        this.setScriptToggle("scorelogger", false);
                        this.updateScriptMenu();
                        break;
                    case "!ssl":
                        this.allScores = [];
                        this.currentId = 0;
                        this.scripts.singlescorelogger = true;
                        break;
                    case "!!ssl":
                        this.scripts.singlescorelogger = false;
                        break;
                    case "!1x1":
                        this.scripts.walls3x3 = false;
                        this.scripts.walls5x5 = false;
                        this.scripts.walls7x7 = false;
                        this.scripts.walls9x9 = false;
                        break;
                    case "!2x2":
                        this.scripts.harvs4x4 = false;
                        this.scripts.harvs8x8 = false;
                        break;
                    case "!3x3":
                        this.scripts.walls3x3 = true;
                        this.scripts.walls5x5 = false;
                        this.scripts.walls7x7 = false;
                        this.scripts.walls9x9 = false;
                        break;
                    case "!4x4":
                        this.scripts.harvs4x4 = true;
                        this.scripts.harvs8x8 = false;
                        break;
                    case "!5x5":
                        this.scripts.walls3x3 = false;
                        this.scripts.walls5x5 = true;
                        this.scripts.walls7x7 = false;
                        this.scripts.walls9x9 = false;
                        break;
                    case "!7x7":
                        this.scripts.walls3x3 = false;
                        this.scripts.walls5x5 = false;
                        this.scripts.walls7x7 = true;
                        this.scripts.walls9x9 = false;
                        break;
                    case "!8x8":
                        this.scripts.harvs4x4 = false;
                        this.scripts.harvs8x8 = true;
                        break;
                    case "!9x9":
                        this.scripts.walls3x3 = false;
                        this.scripts.walls5x5 = false;
                        this.scripts.walls7x7 = false;
                        this.scripts.walls9x9 = true;
                        break;
                    case "!an":
                        if (args.length > 1) {
                            for (let i = 1; i < args.length; i++) {
                                if (args[i].length >= 1) {
                                    args[i] += " ";
                                }
                            }
                            const string = args[args.length - 1];
                            let finalString = "";
                            args[args.length - 1] = string.slice(0, string.length - 1);
                            for (let i in args) {
                                finalString += args[i];
                            }
                            this.altName = finalString.slice(args[0].length, finalString.length);
                        } else {
                            this.altName = " ";
                        }
                        break;
                    case "!!an":
                        this.altName = game.ui.playerTick.name;
                        break;
                    case "!join":
                        if (!args[1]) return;
                        if (args[1].length === 20) {
                            game.network.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: args[1] });
                        } else {
                            if (alt) {
                                game.network.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: alt.psk });
                            }
                        }
                        break;
                    case "!altjoin":
                        if (!alt) return;
                        if (alt.gs) {
                            if (args[2]) {
                                if (sockets[args[2]]) {
                                    game.ui.components.PopupOverlay.showConfirmation(`Are you sure you want ${alt.id} to join ${args[2]}? It has a base.`, 10000, () => {
                                        alt.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: sockets[args[2]].psk });
                                    });
                                }
                            } else {
                                game.ui.components.PopupOverlay.showConfirmation(`Are you sure you want ${alt.id} to join you? It has a base.`, 10000, () => {
                                    alt.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: game.ui.playerPartyShareKey });
                                });
                            }
                        } else {
                            if (args[2]) {
                                if (sockets[args[2]]) {
                                    alt.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: sockets[args[2]].psk });
                                }
                            } else {
                                alt.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: game.ui.playerPartyShareKey });
                            }
                        }
                        break;
                    case "!leave":
                        if (!alt) return;
                        alt.sendPacket(9, { name: "LeaveParty" });
                        break;
                    case "!l":
                        if (alt) {
                            alt.isLocked = true;
                        } else {
                            for (let i in sockets) {
                                if (sockets[i].myPlayer) {
                                    sockets[i].isLocked = true;
                                }
                            }
                        }
                        break;
                    case "!!l":
                        if (alt) {
                            alt.isLocked = false;
                        } else {
                            for (let i in sockets) {
                                if (sockets[i].myPlayer) {
                                    sockets[i].isLocked = false;
                                }
                            }
                        }
                        break;
                    case "!f":
                        if (alt) {
                            alt.isFrozen = true;
                            alt.sendPacket(3, { up: 0, down: 0, left: 0, right: 0 });
                        } else {
                            for (let i in sockets) {
                                if (sockets[i].myPlayer) {
                                    sockets[i].isFrozen = true;
                                    sockets[i].sendPacket(3, { up: 0, down: 0, left: 0, right: 0 });
                                }
                            }
                        }
                        break;
                    case "!!f":
                        if (alt) {
                            alt.isFrozen = false;
                        } else {
                            for (let i in sockets) {
                                if (sockets[i].myPlayer) {
                                    sockets[i].isFrozen = false;
                                }
                            }
                        }
                        break;
                    case "!b":
                        const bTier = parseInt(args[1]);
                        const bItem = game.ui.playerTick.weaponName;
                        if (args[1]) {
                            if (user.connectedToId) {
                                user.sendBuffer(new Uint8Array(game.network.codec.encode(9, { name: "BuyItem", itemName: bItem, tier: bTier })));
                            } else {
                                game.network.sendPacket(9, { name: "BuyItem", itemName: bItem, tier: bTier });
                            }
                        }
                        break;
                    case "!e":
                        const eTier = parseInt(args[1]);
                        const eItem = game.ui.playerTick.weaponName;
                        if (args[1]) {
                            if (user.connectedToId) {
                                user.sendBuffer(new Uint8Array(game.network.codec.encode(9, { name: "EquipItem", itemName: eItem, tier: eTier })));
                            } else {
                                game.network.sendPacket(9, { name: "EquipItem", itemName: eItem, tier: eTier });
                            }
                        }
                        break;
                    case "!1":
                        this.nearestAltCount = 1;
                        break;
                    case "!2":
                        this.nearestAltCount = 2;
                        break;
                    case "!3":
                        this.nearestAltCount = 3;
                        break;
                    case "!4":
                        this.nearestAltCount = 4;
                        break;
                    case "!5":
                        this.nearestAltCount = 5;
                        break;
                    case "!6":
                        this.nearestAltCount = 6;
                        break;
                    case "!7":
                        this.nearestAltCount = 7;
                        break;
                    case "!8":
                        this.nearestAltCount = 8;
                        break;
                    case "!9":
                        this.nearestAltCount = 9;
                        break;
                    case "!0":
                        this.nearestAltCount = 10;
                        break;
                    case "!send":
                        const amt = args[1] > 5 ? 5 : args[1];
                        for (let i = 0; i < amt; i++) {
                            new Alt();
                        }
                        break;
                    case "!servers":
                        for (let i in socketServers) {
                            const server = socketServers[i];
                            const id = i;
                            const alts = Object.keys(server.alts).length;
                            game.ui.components.PopupOverlay.showHint(`Socket server ID: ${id} | Sockets: ${alts}`);
                        }
                        break;
                    case "!setpswd":
                        if (!args[1] || !args[2]) return;
                        const server = args[1];
                        const pass = args[2];
                        if (pass.length > 0 && socketServers[server] && socketServers[server].socket.readyState === 1) {
                            localStorage.password = pass;
                            socketServers[server].socket.sendMessage(`changePassword ${localStorage.password}`);
                        }
                        break;
                    case "!resetpswd":
                        if (!args[1]) return;
                        const server2 = args[1];
                        if (socketServers[server2] && socketServers[server2].socket.readyState === 1) {
                            localStorage.password = defaultPassword2;
                            socketServers[server2].socket.sendMessage(`changePassword ${localStorage.password}`);
                        }
                        break;
                    case "!p":
                        const alts = Object.values(sockets);
                        sockets = {};
                        for (let i = 0; i < alts.length; i++) {
                            alts[i].id = i + 1;
                            sockets[i + 1] = alts[i];
                        }
                        break;
                    case "!close":
                        const altId = msg.split(" ")[1] - "";
                        if (altId) sockets[altId].ws.send(0);
                        break;
                    case "!reset":
                        for (let i in sockets) {
                            if (sockets[i].myPlayer) {
                                sockets[i].ws.send(0);
                            }
                        }
                        break;
                    case "!chat":
                        if (args[1]) {
                            this.chatVisibility = args[1];
                        } else {
                            this.chatVisibility = "all";
                        }
                        break;
                    case "!s":
                        for (let i in sockets) {
                            if (sockets[i].myPlayer) {
                                game.ui.components.Chat.onMessageReceived({ displayName: `${sockets[i].id}`, message: `G ${this.counter(sockets[i].myPlayer.gold)}, W ${this.counter(sockets[i].myPlayer.wave)}`, uid: sockets[i].uid });
                            }
                        }
                        break;
                    case "!ps":
                        for (let i in game.ui.playerPartyMembers) {
                            game.ui.components.Chat.onMessageReceived({ displayName: `${game.world.entities.get(game.ui.playerPartyMembers[i].playerUid).targetTick.name}`, message: `W ${this.counter(game.world.entities.get(game.ui.playerPartyMembers[i].playerUid).targetTick.wood)}, S ${this.counter(game.world.entities.get(game.ui.playerPartyMembers[i].playerUid).targetTick.stone)}, G ${this.counter(game.world.entities.get(game.ui.playerPartyMembers[i].playerUid).targetTick.gold)}, T ${this.counter(game.world.entities.get(game.ui.playerPartyMembers[i].playerUid).targetTick.token)}`, uid: game.ui.playerPartyMembers[i].playerUid });
                        }
                        break;
                    case "!dps":
                        window.disablepopups = true;
                        break;
                    case "!!dps":
                        window.disablepopups = false;
                        break;
                    case "!sas":
                        window.serverspots = true;
                        if (this.spotId !== game.options.serverId) {
                            this.spotId = game.options.serverId;
                            if (serverSpots[this.spotId]) {
                                const spots = decodeSpotJSON(serverSpots[this.spotId].spotEncoded);
                                game.world.spots = spots;
                                game.world.toInclude = toInclude;
                                for (let i in spots) {
                                    let entity = toInclude(spots[i]);
                                    game.world.createEntity(entity);
                                }
                            }
                        }
                        break;
                    case "!!sas":
                        window.serverspots = false;
                        this.spotId = null;
                        break;
                    case "!pop":
                        game.ui.components.PopupOverlay.showHint(`${this.players === 1 ? "1 player" : `${this.players} players`} | ${Object.keys(socketsByUid).length === 1 ? "1 socket" : `${Object.keys(socketsByUid).length} sockets`}`);
                        if (user.connectedToId) {
                            document.title = `BAN_SESSION #${user.connectedToId} - ${this.players}, ${Object.keys(socketsByUid).length}`;
                        } else {
                            document.title = `BAN_TAB - ${this.players}, ${Object.keys(socketsByUid).length}`;
                        }
                        break;
                    case "!scanspots":
                        if (!this.addEntityUpdateHandler) {
                            this.addEntityUpdateHandler = true;
                            game.network.addEntityUpdateHandler(() => {
                                this.fnc();
                            });
                        }
                        break;
                    case "!am":
                        if (this.addEntityUpdateHandler) {
                            this.automove = true;
                        }
                        break;
                    case "!!am":
                        if (this.addEntityUpdateHandler) {
                            this.automove = false;
                        }
                        break;
                    case "!stashes":
                        scanner.getStashes({ serverId: game.options.serverId });
                        break;
                    case "!players":
                        scanner.getPlayers({ serverId: game.options.serverId });
                        break;
                }
                return;
            } else {
                game.network.sendRpc2(e);
            }
        }
        if (e.name === "MakeBuilding") {
            if (game.ui.components.PlacementOverlay.buildingId === "Wall" && e.type === "Wall" && (this.scripts.walls3x3 || this.scripts.walls5x5 || this.scripts.walls7x7 || this.scripts.walls9x9) && game.inputManager.mouseDown) {
                const worldPos = game.renderer.screenToWorld(game.ui.mousePosition.x, game.ui.mousePosition.y);
                const gridPos = { x: ((worldPos.x / 48 | 0) + 0.5) * 48, y: ((worldPos.y / 48 | 0) + 0.5) * 48 };
                const z = this.scripts.walls3x3 ? 1 : this.scripts.walls5x5 ? 2 : this.scripts.walls7x7 ? 3 : this.scripts.walls9x9 ? 4 : 0;
                if (z > 0) {
                    for (let x = -z; x < z + 1; x++) {
                        for (let y = -z; y < z + 1; y++) {
                            game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x + x * 48, y: gridPos.y + y * 48, yaw: e.yaw });
                        }
                    }
                }
            } else if (game.ui.components.PlacementOverlay.buildingId === "Harvester" && e.type === "Harvester" && game.inputManager.mouseDown) {
                const worldPos = game.renderer.screenToWorld(game.ui.mousePosition.x, game.ui.mousePosition.y);
                const gridPos = { x: Math.round(worldPos.x / 48) * 48, y: Math.round(worldPos.y / 48) * 48 };
                if (this.scripts.harvs4x4) {
                    game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x + 96, y: gridPos.y, yaw: e.yaw });
                    game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x, y: gridPos.y + 96, yaw: e.yaw });
                    game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x - 96, y: gridPos.y, yaw: e.yaw });
                    game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x, y: gridPos.y - 96, yaw: e.yaw });
                } else if (this.scripts.harvs8x8) {
                    game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x + 144, y: gridPos.y - 48, yaw: e.yaw });
                    game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x + 144, y: gridPos.y + 48, yaw: e.yaw });
                    game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x + 48, y: gridPos.y + 144, yaw: e.yaw });
                    game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x - 48, y: gridPos.y + 144, yaw: e.yaw });
                    game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x - 144, y: gridPos.y + 48, yaw: e.yaw });
                    game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x - 144, y: gridPos.y - 48, yaw: e.yaw });
                    game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x - 48, y: gridPos.y - 144, yaw: e.yaw });
                    game.network.sendPacket(9, { name: e.name, type: e.type, x: gridPos.x + 48, y: gridPos.y - 144, yaw: e.yaw });
                }
            }
            if (e.name !== "SendChatMessage") {
                game.network.sendRpc2(e);
            }
        }
        if (e.name !== "SendChatMessage" && e.name !== "MakeBuilding") {
            game.network.sendRpc2(e);
        }
    }
}

window.ban = new Script();

class Alt {
    constructor() {
        this.ws = new WebSocket(`wss://${game.network.connectionOptions.host}`);
        this.ws.binaryType = "arraybuffer";
        this.ws.onmessage = this.onMessage.bind(this);
        this.ws.onclose = this.onClose.bind(this);
        this.codec = new game.networkType().codec;
        this.codec.isAlt = true;
        this.entity = new Map();
        this.harvesters = new Map();
        this.mousePs = ban.mousePs;
        this.timeout1Ticks = 0;
        this.timeout2Ticks = 0;
        this.timeout3Ticks = 0;
        this.hitTicks = 0;
        this.inventory = {};
        this.harvesterTicks = [
            { tick: 0, resetTick: 31, deposit: 0.4, tier: 1 },
            { tick: 0, resetTick: 29, deposit: 0.6, tier: 2 },
            { tick: 0, resetTick: 27, deposit: 0.7, tier: 3 },
            { tick: 0, resetTick: 24, deposit: 1, tier: 4 },
            { tick: 0, resetTick: 22, deposit: 1.2, tier: 5 },
            { tick: 0, resetTick: 20, deposit: 1.2, tier: 6 },
            { tick: 0, resetTick: 18, deposit: 2.4, tier: 7 },
            { tick: 0, resetTick: 16, deposit: 3, tier: 8 }
        ];
        this.id = ++ban.counts;
        this.wid = Math.round(Math.random() * 10 ** 16);
    }
    sendPacket(event, data) {
        if (this.ws && this.ws.readyState === 1) {
            this.ws.send(new Uint8Array(this.codec.encode(event, data)));
        }
    }
    async onMessage(msg) {
        const opcode = new Uint8Array(msg.data)[0];
        const m = new Uint8Array(msg.data);
        let data;
        try {
            data = this.codec.decode(msg.data);
        } catch (e) { };
        switch (opcode) {
            case 0:
                this.onEntityUpdate(data);
                break;
            case 4:
                this.onEnterWorld(data);
                break;
            case 5:
                sockets[this.id] = this;
                for (let num = 0; num < Object.keys(socketServers).length; num++) {
                    if (!this.isMade) {
                        this.isMade = true;
                        socketServers[num].alts[this.wid] = true;
                        this.serverNum = [ban.connect(num)];
                        const wasmmoduleMessage = `createModule ${this.wid}`;
                        if (socketServers[this.serverNum].socket.readyState === 1) {
                            socketServers[this.serverNum].socket.sendMessage(wasmmoduleMessage);
                        } else {
                            ban.messagesToSend.push(wasmmoduleMessage);
                        }
                    }
                }
                if (this.serverNum) {
                    const opcode5Message = `decodeOpcode5 ${this.wid} ${m} ${game.network.connectionOptions.hostname} ${ban.altName}`;
                    if (socketServers[this.serverNum].socket.readyState === 1) {
                        socketServers[this.serverNum].socket.sendMessage(opcode5Message);
                    } else {
                        ban.messagesToSend.push(opcode5Message);
                    }
                } else {
                    this.ws.send(0);
                }
                break;
            case 9:
                this.onRpc(data);
                break;
            case 10:
                const opcode10Message = `decodeOpcode10 ${this.wid} ${m}`;
                if (socketServers[this.serverNum].socket.readyState === 1) {
                    socketServers[this.serverNum].socket.sendMessage(opcode10Message);
                } else {
                    ban.messagesToSend.push(opcode10Message);
                }
                break;
        }
    }
    onClose() {
        delete sockets[this.id];
        delete opcode5Ids[this.wid];
        if (this.uid) {
            delete socketsByUid[this.uid];
            if (this.myPlayer) {
                if (ban.players > 1) {
                    ban.players -= 1;
                }
                game.ui.components.PopupOverlay.showHint(`${ban.players === 1 ? "1 player" : `${ban.players} players`} | ${Object.keys(socketsByUid).length === 1 ? "1 socket" : `${Object.keys(socketsByUid).length} sockets`}`);
                if (user.connectedToId) {
                    document.title = `BAN_SESSION #${user.connectedToId} - ${ban.players}, ${Object.keys(socketsByUid).length}`;
                } else {
                    document.title = `BAN_TAB - ${ban.players}, ${Object.keys(socketsByUid).length}`;
                }
            }
        }
        const onCloseMessage = `altClosed ${this.wid}`;
        if (this.serverNum) {
            if (socketServers[this.serverNum].socket.readyState === 1) {
                socketServers[this.serverNum].socket.sendMessage(onCloseMessage);
            } else {
                ban.messagesToSend.push(onCloseMessage);
            }
            if (socketServers[this.serverNum].alts[this.wid]) {
                delete socketServers[this.serverNum].alts[this.wid];
            }
        }
        if (ban.scripts.autoreconnect && this.myPlayer) {
            new Alt();
        }
    }
    depositAhrc(tick) {
        this.harvesters.forEach((e) => {
            if (e.tier === tick.tier) {
                this.sendPacket(9, { name: "AddDepositToHarvester", uid: e.uid, deposit: tick.deposit });
            }
        });
    }
    collectAhrc(tick) {
        this.harvesters.forEach((e) => {
            if (e.tier === tick.tier) {
                this.sendPacket(9, { name: "CollectHarvester", uid: e.uid });
            }
        });
    }
    onEnterWorld(data) {
        ban.players = data.players;
        if (data.allowed) {
            this.myPlayer = true;
            this.uid = data.uid;
            if (this.enterworld2) this.ws.send(this.enterworld2);
            socketsByUid[this.uid] = { id: this.id, x: 0, y: 0 };
            this.sendPacket(3, { mouseMoved: 15 });
            this.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: game.ui.playerPartyShareKey });
            this.sendPacket(9, { name: "BuyItem", itemName: "HatHorns", tier: 1 });
            this.sendPacket(9, { name: "BuyItem", itemName: "PetCARL", tier: 1 });
            this.sendPacket(9, { name: "BuyItem", itemName: "PetMiner", tier: 1 });
            this.sendPacket(9, { name: "EquipItem", itemName: "PetCARL", tier: 1 });
            this.sendPacket(9, { name: "EquipItem", itemName: "PetMiner", tier: 1 });
            this.sendPacket(3, { up: 1 });
            if (typeof partyInfo !== "undefined") {
                game.ui.components.Map.onPartyMembersUpdate(partyInfo);
            }
            game.ui.components.Map.onPartyMembersUpdate(ban.partyInfoAlt);
        } else {
            this.ws.send(0);
        }
        game.ui.components.PopupOverlay.showHint(`${ban.players === 1 ? "1 player" : `${ban.players} players`} | ${Object.keys(socketsByUid).length === 1 ? "1 socket" : `${Object.keys(socketsByUid).length} sockets`}`);
        if (user.connectedToId) {
            document.title = `BAN_SESSION #${user.connectedToId} - ${ban.players}, ${Object.keys(socketsByUid).length}`;
        } else {
            document.title = `BAN_TAB - ${ban.players}, ${Object.keys(socketsByUid).length}`;
        }
    }
    onEntityUpdate(data) {
        if (!data || !data.entities) return;
        const now = Date.now();
        for (let i = 0; i < data.entities.length; i++) {
            const tick = data.entities[i];
            const uid = tick.uid;
            const tick_1 = this.entity.get(uid);
            if (tick.uid === this.uid && !tick_1) {
                this.entity.set(tick.uid, { position: tick.position, petUid: tick.petUid, health: tick.health, gold: tick.gold, wave: tick.wave, weaponName: tick.weaponName, isPaused: tick.isPaused });
            } else if (tick.model === "GoldStash" && !tick_1) {
                const existingEntity = allEntities.get(tick.uid);
                if (existingEntity) {
                    existingEntity.lastSeen = now;
                    if (existingEntity.tier !== tick.tier) {
                        allEntities.set(tick.uid, { uid: tick.uid, name: "GoldStash", position: tick.position, partyId: tick.partyId, tier: tick.tier, lastSeen: now });
                    }
                } else {
                    if (tick.tier === 8) {
                        game.ui.components.Chat.onMessageReceived({ displayName: "GoldStash", message: `X ${ban.counter(tick.position.x)}, Y ${ban.counter(tick.position.y)}, PID ${tick.partyId} (${game.ui.parties[tick.partyId] ? game.ui.parties[tick.partyId].memberCount : 1}) T8`, uid: tick.uid });
                    }
                    allEntities.set(tick.uid, { uid: tick.uid, name: "GoldStash", position: tick.position, partyId: tick.partyId, tier: tick.tier, lastSeen: now });
                }
            } else if (tick.model === "GamePlayer" && tick.uid !== game.world.myUid && !socketsByUid[tick.uid] && !tick_1) {
                const existingEntity = allEntities.get(tick.uid);
                if (existingEntity) {
                    existingEntity.lastSeen = now;
                    if (ban.counter(existingEntity.position.x) !== ban.counter(tick.position.x) || ban.counter(existingEntity.position.y) !== ban.counter(tick.position.y)) {
                        allEntities.set(tick.uid, { uid: tick.uid, name: tick.name, position: tick.position, partyId: tick.partyId, lastSeen: now });
                    }
                } else {
                    const rank = game.ui.components.Leaderboard.leaderboardData.find((e) => e.uid === tick.uid);
                    if (rank) {
                        let doNotSend = false;
                        allEntities.forEach((e) => {
                            if (e.tier && e.partyId === tick.partyId) {
                                doNotSend = true;
                                const tier = e.tier === 1 ? "T1" : e.tier === 2 ? "T2" : e.tier === 3 ? "T3" : e.tier === 4 ? "T4" : e.tier === 5 ? "T5" : e.tier === 6 ? "T6" : e.tier === 7 ? "T7" : e.tier === 8 ? "T8" : "";
                                game.ui.components.Chat.onMessageReceived({ displayName: tick.name, message: `X ${ban.counter(tick.position.x)}, Y ${ban.counter(tick.position.y)}, PID ${tick.partyId} (${game.ui.parties[tick.partyId] ? game.ui.parties[tick.partyId].memberCount : 1}) ${tier} #${rank.rank + 1}`, uid: tick.uid });
                            }
                        });
                        if (!doNotSend) {
                            game.ui.components.Chat.onMessageReceived({ displayName: tick.name, message: `X ${ban.counter(tick.position.x)}, Y ${ban.counter(tick.position.y)}, PID ${tick.partyId} (${game.ui.parties[tick.partyId] ? game.ui.parties[tick.partyId].memberCount : 1}) #${rank.rank + 1}`, uid: tick.uid });
                        }
                    }
                    allEntities.set(tick.uid, { uid: tick.uid, name: tick.name, position: tick.position, partyId: tick.partyId, lastSeen: now });
                }
            } else if (tick_1) {
                const keys = Object.keys(tick);
                for (let k = 0; k < keys.length; k++) {
                    const key = keys[k];
                    if (key === "position" || key === "petUid" || key === "health" || key === "gold" || key === "wave" || key === "weaponName" || key === "isPaused") {
                        tick_1[key] = tick[key];
                    }
                }
            }
        }
        this.myPlayer = this.entity.get(this.uid);
        if (!this.myPlayer) return;
        socketsByUid[this.uid] = { id: this.id, x: this.myPlayer.position.x, y: this.myPlayer.position.y };
        if (!ban.scripts.positionlock && !this.isLocked) {
            this.mousePs = ban.mousePs;
        }
        if (this.myPlayer.petUid && !this.petActivated) {
            this.petActivated = true;
        }
        this.aimingYaw = Math.floor((Math.atan2(this.mousePs.y - this.myPlayer.position.y, this.mousePs.x - this.myPlayer.position.x) * 180 / Math.PI + 450) % 360) || 0;
        this.sendPacket(3, { mouseMoved: this.aimingYaw });
        if (ban.scripts.mousemove && !this.isFrozen) {
            const x = (Math.round(((Math.atan2(this.mousePs.y - this.myPlayer.position.y, this.mousePs.x - this.myPlayer.position.x) * 180 / Math.PI + 450) % 360) / 45) * 45) % 360;
            let movementPacket;
            if (!ban.scatter && !this.scatter) {
                movementPacket = { up: (x === 0 || x === 45 || x === 315) ? 1 : 0, down: (x === 135 || x === 180 || x === 225) ? 1 : 0, right: (x === 45 || x === 90 || x === 135) ? 1 : 0, left: (x === 225 || x === 270 || x === 315) ? 1 : 0 };
            } else {
                if (!this.justDied) {
                    movementPacket = { down: (x === 0 || x === 45 || x === 315) ? 1 : 0, up: (x === 135 || x === 180 || x === 225) ? 1 : 0, left: (x === 45 || x === 90 || x === 135) ? 1 : 0, right: (x === 225 || x === 270 || x === 315) ? 1 : 0 };
                } else {
                    movementPacket = { up: 1, down: 0, right: 0, left: 1 };
                }
            }
            this.sendPacket(3, movementPacket);
        }
        if (ban.scripts.autoheal && !ban.scripts.xkey) {
            if (this.myPlayer.health > 0 && this.myPlayer.health / 5 <= 20) {
                if (!this.autohealtimeout && this.inventory.HealthPotion) {
                    this.autohealtimeout = true;
                    this.sendPacket(9, { name: "EquipItem", itemName: "HealthPotion", tier: 1 });
                    this.sendPacket(9, { name: "BuyItem", itemName: "HealthPotion", tier: 1 });
                }
            } else {
                if (this.autohealtimeout) {
                    this.autohealtimeout = false;
                }
            }
            if (!this.inventory.HealthPotion) {
                this.sendPacket(9, { name: "BuyItem", itemName: "HealthPotion", tier: 1 });
            }
        }
        if (ban.scripts.autorevivepets && this.petActivated) {
            this.sendPacket(9, { name: "BuyItem", itemName: "PetRevive", tier: 1 });
            this.sendPacket(9, { name: "EquipItem", itemName: "PetRevive", tier: 1 });
        }
        if (ban.scripts.autobow) {
            if (this.myPlayer.weaponName === "Bow") {
                this.sendPacket(3, { space: 0 });
                this.sendPacket(3, { space: 1 });
            } else {
                this.sendPacket(3, { mouseDown: this.aimingYaw });
            }
        }
        if (ban.scripts.autoaltjoin) {
            if (this.gs) {
                this.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: game.ui.playerPartyShareKey });
            } else {
                this.sendPacket(9, { name: "LeaveParty" });
            }
        }
        if (ban.scripts.autospear) {
            if (this.myPlayer.gold > ban.requiredGold || (this.inventory.Spear && this.inventory.Spear.tier >= ban.spearTier)) {
                this.sendPacket(9, { name: "LeaveParty" });
            } else {
                this.sendPacket(9, { name: "JoinPartyByShareKey", partyShareKey: game.ui.playerPartyShareKey });
            }
        }
        if (ban.scripts.chatspam) {
            this.sendPacket(9, { name: "SendChatMessage", channel: "Local", message: ban.chatSpamMessage });
        }
        if (ban.scripts.xkey) {
            if (!this.inventory[ban.xKeyWeapon]) {
                if (this.myPlayer.gold >= 100) {
                    this.sendPacket(9, { name: "BuyItem", itemName: ban.xKeyWeapon, tier: 1 });
                }
            } else {
                if (this.myPlayer.weaponName !== ban.xKeyWeapon) {
                    this.sendPacket(9, { name: "EquipItem", itemName: ban.xKeyWeapon, tier: this.inventory[ban.xKeyWeapon].tier });
                }
            }
        }
        if (ban.scripts.autoshield && !this.inventory.ZombieShield && this.myPlayer.gold >= 1000) {
            this.sendPacket(9, { name: "BuyItem", itemName: "ZombieShield", tier: 1 });
        }
        if (ban.scripts.autotimeout && !this.myPlayer.isPaused && this.myPlayer.gold >= 10000) {
            this.sendPacket(9, { name: "BuyItem", itemName: "Pause", tier: 1 });
        }
        if (ban.scripts.autopetpotion && this.myPlayer.petUid && !this.inventory.PetHealthPotion) {
            this.sendPacket(9, { name: "BuyItem", itemName: "PetHealthPotion", tier: 1 });
        }
        if (ban.scripts.autopetheal && this.myPlayer.petUid && this.inventory.PetHealthPotion) {
            this.sendPacket(9, { name: "EquipItem", itemName: "PetHealthPotion", tier: 1 });
        }
        if (this.ahrc) {
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
        if (this.timeout1Ticks > 0 && this.timeout1Ticks <= 2) {
            this.timeout1Ticks += 1;
        } else {
            if (this.timeout1Ticks > 0) {
                this.timeout1Ticks = 0;
                this.sendPacket(3, { mouseDown: this.aimingYaw });
            }
        }
        if (this.timeout2Ticks > 0 && this.timeout2Ticks <= 140) {
            this.timeout2Ticks += 1;
        } else {
            if (this.timeout2Ticks > 0) {
                this.timeout2Ticks = 0;
                this.sendPacket(3, { mouseUp: 1 });
            }
        }
        if (this.timeout3Ticks > 0 && this.timeout3Ticks <= 142) {
            this.timeout3Ticks += 1;
        } else {
            if (this.timeout3Ticks > 0) {
                this.timeout3Ticks = 0;
                this.mouseDownHit = 0;
            }
        }
        if (this.scatter > 0 && this.scatter <= 7) {
            this.scatter += 1;
        } else {
            if (this.scatter > 0) {
                this.scatter = 0;
                this.justDied = false;
            }
        }
        if (this.hasHit) {
            this.hitTicks = ++this.hitTicks % 5;
            if (this.hitTicks === 0) {
                this.hasHit = false;
                this.sendPacket(3, { mouseUp: 1 });
            }
        }
    }
    onRpc(data) {
        switch (data.name) {
            case "LocalBuilding":
                data.response.forEach((e) => {
                    if (e.type === "GoldStash") {
                        if (e.dead) {
                            this.gs = false;
                        } else {
                            this.gs = true;
                        }
                    }
                    if (e.type === "Harvester") {
                        if (!e.dead) {
                            this.harvesters.set(e.uid, { uid: e.uid, tier: e.tier });
                        } else {
                            this.harvesters.delete(e.uid);
                        }
                    }
                });
                break;
            case "PartyShareKey":
                this.psk = data.response.partyShareKey;
                break;
            case "Dead":
                if (ban.scripts.autorespawn) {
                    this.sendPacket(3, { respawn: 1 });
                }
                if (this.gs && !data.response.stashDied) {
                    this.justDied = true;
                    this.scatter = 1;
                }
                break;
            case "SetItem":
                this.inventory[data.response.itemName] = data.response;
                if (!this.inventory[data.response.itemName].stacks) {
                    delete this.inventory[data.response.itemName];
                }
                if (data.response.itemName === "ZombieShield" && data.response.stacks) {
                    this.sendPacket(9, { name: "EquipItem", itemName: "ZombieShield", tier: data.response.tier });
                }
                break;
            case "PartyInfo":
                if (data.response[0].playerUid === this.uid) {
                    data.response.forEach((e) => {
                        if ((e.playerUid === game.world.myUid || socketsByUid[e.playerUid]) && !e.canSell) {
                            this.sendPacket(9, { name: "SetPartyMemberCanSell", uid: e.playerUid, canSell: 1 });
                        }
                    });
                }
                break;
        }
    }
}