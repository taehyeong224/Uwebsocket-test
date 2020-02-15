"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var cluster_1 = __importDefault(require("cluster"));
var uWebSockets_js_1 = require("uWebSockets.js");
var os_1 = __importDefault(require("os"));
if (cluster_1.default.isMaster) {
    //워커 스케쥴을 Round Robin 방식으로 한다.
    cluster_1.default.schedulingPolicy = cluster_1.default.SCHED_RR;
    var cpuLength = os_1.default.cpus().length;
    cluster_1.default.on('online', function (worker) {
        console.log("worker " + worker.process.pid + " " + worker.id + " created");
    });
    cluster_1.default.on('exit', function (worker, code, signal) {
        console.log("\uC8FD\uC740 \uC6CC\uCEE4 \uC815\uBCF4 => worker : " + worker.process.pid + " " + worker.id);
        cluster_1.default.fork();
    });
    cluster_1.default.on('message', function (worker, message, handle) {
        console.log("master receive message from ${worker.process.pid} ${worker.id}: ", message);
    });
    console.log("cpuLength: ", cpuLength);
    for (var i = 0; i < cpuLength; i++) {
        cluster_1.default.fork();
    }
}
else {
    console.log("hello");
    var app = uWebSockets_js_1.App();
    app.ws("/*", {
        /* Options */
        compression: 0,
        maxPayloadLength: 16 * 1024 * 1024,
        idleTimeout: 60 * 5,
        // would be nice to have maxBackpressure to automatically close slow receivers
        /* Setting 1: merge messages in one, or keep them as separate WebSocket frames - mergePublishedMessages */
        /* Setting 2: compression on/off - cannot have dedicated compressor for pubsub yet */
        /* Setting 3: maxBackpressure - when we want to automatically terminate a slow receiver */
        /* Setting 4: send to all including us, or not? That's not a setting really just use ws.publish or global uWS.publish */
        /* Handlers */
        message: function (ws, message, isBinary) {
            excuteMessage_1(ws, convertClientMessage_1(message));
        },
        open: function (ws, req) {
            // ws.subscribe('home/sensors/#');
            console.log("open > ws", ws);
            // clients[generate()] = ws;
            clients_1.push(ws);
        },
        close: function (ws, code, message) {
            console.log("close > ws", JSON.stringify(ws));
            console.log("close > code", code);
            console.log("close > message", convertClosedMessage_1(message));
        }
    }).get("/test", function (res, req) {
        try {
            console.log("[" + process.pid + "] /test");
            // for (let i = 0; i < 10; i++) {
            //     clients[0].publish(`hello`, JSON.stringify({ test: "hi", i }))
            // }
            console.log("send");
            res.end("hi");
        }
        catch (e) {
            console.error(e, typeof e);
            if (typeof e === "string" && e === "Invalid access of closed uWS.WebSocket/SSLWebSocket.") {
                clients_1 = [];
            }
            if (clients_1[0] === undefined) {
                clients_1 = [];
            }
            res.end("error");
        }
    }).listen(9001, function (socket) {
        if (socket) {
            console.log("Listening to port 9001");
        }
    });
    var clients_1 = [];
    var convertClientMessage_1 = function (message) { return JSON.parse(bufToString_1(message)); };
    var convertClosedMessage_1 = function (message) { return bufToString_1(message); };
    var bufToString_1 = function (buf) {
        var enc = new TextDecoder("utf-8");
        var arrayBuffer = new Uint8Array(buf);
        return enc.decode(arrayBuffer);
    };
    var addSubscribe_1 = function (ws, message) {
        ws.subscribe("" + message.subscribe);
    };
    var excuteMessage_1 = function (ws, message) {
        switch (message.type) {
            case MessageType.SUBSCRIBE:
                addSubscribe_1(ws, message);
                break;
        }
    };
    var MessageType = void 0;
    (function (MessageType) {
        MessageType["SUBSCRIBE"] = "SUBSCRIBE";
    })(MessageType || (MessageType = {}));
}
