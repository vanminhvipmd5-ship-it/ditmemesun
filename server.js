// ==========================================
// 🚀 HDXAISUNWIN 9.0 - AI TÀI XỈU SIÊU VIP
// 👑 ADMIN: @vanminh2603
// ==========================================

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ==========================================
// 📦 DATA
// ==========================================

let apiResponseData = {
    Phien: null,
    Xuc_xac_1: null,
    Xuc_xac_2: null,
    Xuc_xac_3: null,
    Tong: null,
    Ket_qua: "",
    id: "@vanminh2603",
    server_time: new Date().toISOString()
};

let currentSessionId = null;

// chỉ giữ 50 kết quả gần nhất
const patternHistory = [];
const predictionHistory = [];
const MAX_HISTORY = 50;

// ==========================================
// 🌐 WEBSOCKET
// ==========================================

const WEBSOCKET_URL =
    "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";

const WS_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Origin: "https://play.sun.win"
};

const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 15000;

const initialMessages = [
    [
        6,
        "MiniGame",
        "taixiuPlugin",
        {
            cmd: 1005
        }
    ],
    [
        6,
        "MiniGame",
        "lobbyPlugin",
        {
            cmd: 10001
        }
    ]
];

let ws = null;
let pingInterval = null;

// ==========================================
// 📡 IP LOCAL
// ==========================================

function getLocalIP() {
    const interfaces = os.networkInterfaces();

    for (const iface of Object.values(interfaces)) {
        for (const alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }

    return "127.0.0.1";
}

// ==========================================
// 🧠 THUẬT TOÁN DỰ ĐOÁN ĐƠN GIẢN
// ==========================================

function getSimplePrediction() {

    // mặc định nếu chưa đủ dữ liệu
    if (patternHistory.length < 5) {
        return {
            prediction: Math.random() > 0.5 ? "Tài" : "Xỉu",
            confidence: 50,
            reason: "🎲 Random mặc định"
        };
    }

    // lấy 5 kết quả gần nhất
    const last5 = patternHistory.slice(-5);

    let tai = 0;
    let xiu = 0;

    last5.forEach(item => {
        if (item.result === "Tài") tai++;
        else xiu++;
    });

    const last1 = last5[last5.length - 1];
    const last2 = last5[last5.length - 2];

    // ==========================================
    // 🔥 THUA 2 TAY LIÊN TIẾP -> PHÁ CẦU
    // ==========================================

    if (
        predictionHistory.length >= 2 &&
        predictionHistory[predictionHistory.length - 1].correct === false &&
        predictionHistory[predictionHistory.length - 2].correct === false
    ) {

        const reverse =
            last1.result === "Tài"
                ? "Xỉu"
                : "Tài";

        return {
            prediction: reverse,
            confidence: 82,
            reason: "🔥 Phá cầu thua 2"
        };
    }

    // ==========================================
    // 🔄 CẦU BỆT
    // ==========================================

    if (
        last1.result === last2.result
    ) {

        return {
            prediction: last1.result,
            confidence: 76,
            reason: "📈 Bắt cầu bệt"
        };
    }

    // ==========================================
    // ⚡ BẺ CẦU
    // ==========================================

    if (tai > xiu) {
        return {
            prediction: "Xỉu",
            confidence: 72,
            reason: "⚡ Bẻ cầu Tài"
        };
    }

    if (xiu > tai) {
        return {
            prediction: "Tài",
            confidence: 72,
            reason: "⚡ Bẻ cầu Xỉu"
        };
    }

    // ==========================================
    // ⚖️ CÂN BẰNG -> ĐÁNH ĐẢO
    // ==========================================

    return {
        prediction:
            last1.result === "Tài"
                ? "Xỉu"
                : "Tài",

        confidence: 65,
        reason: "🔄 Cầu đảo cân bằng"
    };
}

// ==========================================
// 📊 THỐNG KÊ
// ==========================================

function getStats() {

    const taiCount =
        patternHistory.filter(x => x.result === "Tài").length;

    const xiuCount =
        patternHistory.filter(x => x.result === "Xỉu").length;

    const total =
        patternHistory.length;

    const correct =
        predictionHistory.filter(x => x.correct).length;

    const wrong =
        predictionHistory.filter(x => !x.correct).length;

    const accuracy =
        predictionHistory.length > 0
            ? ((correct / predictionHistory.length) * 100).toFixed(2)
            : 0;

    return {
        total,
        taiCount,
        xiuCount,
        correct,
        wrong,
        accuracy
    };
}

// ==========================================
// 🔌 CONNECT WS
// ==========================================

function connectWebSocket() {

    if (ws) {
        ws.removeAllListeners();
        ws.close();
    }

    ws = new WebSocket(
        WEBSOCKET_URL,
        {
            headers: WS_HEADERS
        }
    );

    ws.on("open", () => {

        console.log("✅ WebSocket Connected");

        initialMessages.forEach((msg, i) => {

            setTimeout(() => {

                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(msg));
                }

            }, i * 500);

        });

        clearInterval(pingInterval);

        pingInterval = setInterval(() => {

            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            }

        }, PING_INTERVAL);

    });

    ws.on("message", (message) => {

        try {

            const data = JSON.parse(message);

            if (!Array.isArray(data)) return;
            if (typeof data[1] !== "object") return;

            const {
                cmd,
                sid,
                d1,
                d2,
                d3,
                gBB
            } = data[1];

            // phiên hiện tại
            if (cmd === 1008 && sid) {
                currentSessionId = sid;
            }

            // kết quả
            if (cmd === 1003 && gBB && d1 && d2 && d3) {

                const total = d1 + d2 + d3;

                const result =
                    total > 10
                        ? "Tài"
                        : "Xỉu";

                apiResponseData = {
                    Phien: currentSessionId,
                    Xuc_xac_1: d1,
                    Xuc_xac_2: d2,
                    Xuc_xac_3: d3,
                    Tong: total,
                    Ket_qua: result,
                    id: "@vanminh2603",
                    server_time: new Date().toISOString()
                };

                // lưu lịch sử
                patternHistory.push({
                    session: currentSessionId,
                    dice: [d1, d2, d3],
                    total,
                    result,
                    time: new Date().toISOString()
                });

                // giữ 50
                if (patternHistory.length > MAX_HISTORY) {
                    patternHistory.shift();
                }

                // lưu kết quả prediction
                if (predictionHistory.length > 0) {

                    const lastPrediction =
                        predictionHistory[predictionHistory.length - 1];

                    if (!lastPrediction.checked) {

                        lastPrediction.actual = result;
                        lastPrediction.correct =
                            lastPrediction.prediction === result;

                        lastPrediction.checked = true;
                    }
                }

                console.log(
                    `🎲 ${currentSessionId} | ${d1}-${d2}-${d3} = ${total} (${result})`
                );
            }

        } catch (err) {

            console.log("❌ Parse Error:", err.message);

        }

    });

    ws.on("close", () => {

        console.log("🔌 WebSocket Closed");

        clearInterval(pingInterval);

        setTimeout(() => {
            connectWebSocket();
        }, RECONNECT_DELAY);

    });

    ws.on("error", (err) => {

        console.log("❌ WS Error:", err.message);

        ws.close();

    });

}

// ==========================================
// 🔮 API DỰ ĐOÁN
// ==========================================

app.get("/ditmesun", (req, res) => {

    const ai = getSimplePrediction();

    const nextSession =
        apiResponseData.Phien
            ? apiResponseData.Phien + 1
            : null;

    // lưu prediction
    predictionHistory.push({
        session: nextSession,
        prediction: ai.prediction,
        confidence: ai.confidence,
        reason: ai.reason,
        checked: false,
        created_at: new Date().toISOString()
    });

    // giữ 50
    if (predictionHistory.length > MAX_HISTORY) {
        predictionHistory.shift();
    }

    res.json({
        phien_hien_tai: nextSession,

        du_doan: ai.prediction,

        do_tin_cay: ai.confidence + "%",

        ly_do: ai.reason,

        ket_qua_gan_nhat: apiResponseData.Ket_qua,

        tong: apiResponseData.Tong,

        xuc_xac: [
            apiResponseData.Xuc_xac_1,
            apiResponseData.Xuc_xac_2,
            apiResponseData.Xuc_xac_3
        ],

        pattern_5:
            patternHistory
                .slice(-5)
                .map(x => x.result === "Tài" ? "T" : "X")
                .join(" - "),

        id: "@vanminh2603",

        server_time: new Date().toISOString()
    });

});

// ==========================================
// 📜 HISTORY
// ==========================================

app.get("/history", (req, res) => {

    res.json(
        patternHistory.slice().reverse()
    );

});

// ==========================================
// 📊 STATS
// ==========================================

app.get("/stats", (req, res) => {

    const s = getStats();

    res.json({

        tong_phien: s.total,

        tai: s.taiCount,

        xiu: s.xiuCount,

        dung: s.correct,

        sai: s.wrong,

        do_chinh_xac: s.accuracy + "%",

        id: "@vanminh2603"

    });

});

// ==========================================
// 💚 HEALTH
// ==========================================

app.get("/health", (req, res) => {

    res.json({

        status: "online",

        websocket:
            ws &&
            ws.readyState === WebSocket.OPEN,

        uptime:
            process.uptime(),

        ram:
            process.memoryUsage()

    });

});

// ==========================================
// 🌐 GIAO DIỆN WEB FULL ICON
// ==========================================

app.get("/", (req, res) => {

    res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>

<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>

<title>HDXAISUNWIN 9.0</title>

<script src="https://cdn.tailwindcss.com"></script>

<style>

body{
    background:#050816;
    color:white;
    font-family:sans-serif;
}

.card{
    background:#111827;
    border-radius:20px;
    padding:20px;
    box-shadow:0 0 20px rgba(255,215,0,0.15);
}

.glow{
    text-shadow:0 0 15px gold;
}

</style>

</head>

<body class="p-5">

<div class="max-w-6xl mx-auto">

<div class="text-center mb-8">

<h1 class="text-5xl font-bold glow text-yellow-400">
🎲 HDXAISUNWIN 9.0
</h1>

<p class="text-gray-400 mt-3">
🤖 AI TÀI XỈU • CẦU BỆT • BẺ CẦU • ĐẢO CẦU • FULL REALTIME
</p>

</div>

<div class="grid md:grid-cols-2 gap-5">

<div class="card">

<h2 class="text-2xl font-bold mb-4 text-yellow-400">
🔮 DỰ ĐOÁN AI
</h2>

<div id="predict" class="text-5xl font-bold mb-4">
...
</div>

<div class="mb-3">
⚡ Độ tin cậy:
<span id="confidence"></span>
</div>

<div class="mb-3">
📌 Lý do:
<span id="reason"></span>
</div>

<div>
🎯 Pattern:
<span id="pattern"></span>
</div>

</div>

<div class="card">

<h2 class="text-2xl font-bold mb-4 text-green-400">
📊 THỐNG KÊ
</h2>

<div id="stats">
Đang tải...
</div>

</div>

</div>

<div class="card mt-5">

<h2 class="text-2xl font-bold mb-4 text-cyan-400">
📜 50 PHIÊN GẦN NHẤT
</h2>

<div class="overflow-x-auto">

<table class="w-full">

<thead>

<tr class="border-b border-gray-700">

<th class="p-2">🎲 Phiên</th>
<th class="p-2">🎯 Kết quả</th>
<th class="p-2">🎲 Xúc xắc</th>
<th class="p-2">📊 Tổng</th>

</tr>

</thead>

<tbody id="history">

</tbody>

</table>

</div>

</div>

</div>

<script>

async function loadData(){

    const p =
        await fetch('/ditmesun');

    const s =
        await fetch('/stats');

    const h =
        await fetch('/history');

    const predict =
        await p.json();

    const stats =
        await s.json();

    const history =
        await h.json();

    document.getElementById('predict').innerHTML =
        predict.du_doan === 'Tài'
            ? '🟢 TÀI'
            : '🔴 XỈU';

    document.getElementById('confidence').innerHTML =
        predict.do_tin_cay;

    document.getElementById('reason').innerHTML =
        predict.ly_do;

    document.getElementById('pattern').innerHTML =
        predict.pattern_5;

    document.getElementById('stats').innerHTML = \`
        🎲 Tổng phiên: \${stats.tong_phien}<br>
        🟢 Tài: \${stats.tai}<br>
        🔴 Xỉu: \${stats.xiu}<br>
        ✅ Đúng: \${stats.dung}<br>
        ❌ Sai: \${stats.sai}<br>
        ⚡ Accuracy: \${stats.do_chinh_xac}
    \`;

    document.getElementById('history').innerHTML =
        history.map(item => \`
            <tr class="border-b border-gray-800 text-center">
                <td class="p-2">\${item.session}</td>
                <td class="p-2 font-bold">
                    \${item.result === 'Tài'
                        ? '🟢 Tài'
                        : '🔴 Xỉu'}
                </td>
                <td class="p-2">
                    🎲 \${item.dice[0]}
                    🎲 \${item.dice[1]}
                    🎲 \${item.dice[2]}
                </td>
                <td class="p-2">
                    \${item.total}
                </td>
            </tr>
        \`).join('');

}

loadData();

setInterval(loadData, 5000);

</script>

</body>
</html>
`);

});

// ==========================================
// 🚀 START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(`
=========================================
🚀 HDXAISUNWIN 9.0 STARTED
=========================================
🌐 Dashboard:
http://${getLocalIP()}:${PORT}

🔮 Predict:
http://${getLocalIP()}:${PORT}/ditmesun

📜 History:
http://${getLocalIP()}:${PORT}/history

📊 Stats:
http://${getLocalIP()}:${PORT}/stats
=========================================
    `);

    connectWebSocket();

});
