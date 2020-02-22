const cluster = require("cluster");

const os = require("os");

if (cluster.isMaster) {
    //워커 스케쥴을 Round Robin 방식으로 한다.
    cluster.schedulingPolicy = cluster.SCHED_RR;
    const cpuLength = os.cpus().length;

    cluster.on('online', (worker) => {
        console.log(`worker ${worker.process.pid} ${worker.id} created`);
    });
    cluster.on('exit', (worker, code, signal) => {
        console.log(`죽은 워커 정보 => worker : ${worker.process.pid} ${worker.id}`);
        cluster.fork();
    });
    cluster.on('message', (worker, message, handle) => {
        console.log(`master receive message from ${worker.process.pid} ${worker.id}: `, message)
    });
    console.log("cpuLength: ", cpuLength)
    for (let i = 0; i < cpuLength; i++) {
        cluster.fork();
    }
} else {
    const { App, HttpRequest, WebSocket, HttpResponse } = require("uWebSockets.js"); 
    const app = App()
    console.log("hello :", process.pid)
    

    app.ws("/*", {
        /* Options */
        compression: 0,
        maxPayloadLength: 16 * 1024 * 1024,
        idleTimeout: 60 * 5,
    
        /* Handlers */
        message: async (ws, message, isBinary) => {
            console.log("process id : ", process.pid)
            // await sleep(3000)
            // excuteMessage(ws, convertClientMessage(message));
        },

        open: (ws, req) => {
        },
        close: (ws, code, message) => {
        }
    }).any("/*", (res, req) => {
        console.log("hello : ", process.pid)
        res.end()
    }).listen(9001, (socket) => {
        if (socket) {
            console.log(`Listening to port 9001`);
        }
    })
    const sleep = async (ms) => {
        return new Promise((resolve) => {
            setTimeout(() => resolve("zzzZZZZ"), ms)
        })
    }
    const convertClientMessage = (message) => JSON.parse(bufToString(message));
    const convertClosedMessage = (message) => bufToString(message);
    const bufToString = (buf) => {
        const enc = new TextDecoder("utf-8");
        const arrayBuffer = new Uint8Array(buf);
        return enc.decode(arrayBuffer);
    }

    const addSubscribe = (ws, message) => {
        ws.subscribe(`${message.subscribe}`);
    };

    const excuteMessage = (ws, message) => {
        switch (message.type) {
            case MessageType.SUBSCRIBE:
                addSubscribe(ws, message);
                break;
        }
    }
    const MessageType = {
        "SUBSCRIBE": "SUBSCRIBE"
    }
}
