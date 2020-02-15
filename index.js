const { App } = require("uWebSockets.js")

const app = App()

app.ws("/*", {
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 60 * 5,
    message: (ws, message, isBinary) => {
        excuteMessage(ws, convertClientMessage(message));
    },

    open: (ws, req) => {
        console.log("hello~")
        ws.send(JSON.stringify({type: MessageType.VERSION, value: '1.0.0'}))
    },
    close: (ws, code, message) => {
        console.log("close > ws", clients.get(ws))
        console.log("close > code", code)
        console.log("close > message", convertClosedMessage(message))
    }
}).post("/message", (res, req) => {
    try {
        readJson(res, (obj) => {
            try {
                console.log(obj);
                app.publish(`hello`, JSON.stringify({ type: MessageType.RECEIVE_MESSAGE, ...obj }))
                res.end('Thanks for this json!');
            } catch (e) {
                console.error("error : ", e)
                res.end("fail")
            }
        }, () => {
            /* Request was prematurely aborted or invalid or missing, stop reading */
            console.log('Invalid JSON or no data at all!');
        });
    } catch (e) {
        console.error(e, typeof e)
        res.end("error")
    }

}).listen(9001, (socket) => {
    if (socket) {
        console.log('Listening to port 9001', socket, typeof socket, Object.keys(socket));
    }
})
const clients = new WeakMap();
const convertClientMessage = message => JSON.parse(bufToString(message));
const convertClosedMessage = message => bufToString(message);
const bufToString = buf => {
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
    SUBSCRIBE: "SUBSCRIBE",
    RECEIVE_MESSAGE: "RECEIVE_MESSAGE",
    VERSION: "VERSION"
}

/* Helper function for reading a posted JSON body */
function readJson(res, cb, err) {
    let buffer;
    /* Register data cb */
    res.onData((ab, isLast) => {
        let chunk = Buffer.from(ab);
        if (isLast) {
            let json;
            if (buffer) {
                try {
                    json = JSON.parse(Buffer.concat([buffer, chunk]));
                } catch (e) {
                    /* res.close calls onAborted */
                    res.close();
                    return;
                }
                cb(json);
            } else {
                try {
                    json = JSON.parse(chunk);
                } catch (e) {
                    /* res.close calls onAborted */
                    res.close();
                    return;
                }
                cb(json);
            }
        } else {
            if (buffer) {
                buffer = Buffer.concat([buffer, chunk]);
            } else {
                buffer = Buffer.concat([chunk]);
            }
        }
    });

    /* Register error cb */
    res.onAborted(err);
}