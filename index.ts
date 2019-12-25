import {App, HttpRequest, WebSocket} from "uWebSockets.js"

const app = App()

app.ws("/*", {
    message: (ws: WebSocket, message: ArrayBuffer, isBinary: boolean) => {
        console.log("message > ws", ws)
        console.log("message > message", message)
        console.log("message > isBinary", isBinary)

        let ok = ws.send(message, isBinary);
    },

    open: (ws: WebSocket, req: HttpRequest) => {
        console.log("open > ws", ws)
        console.log("openopen > req", req)
    },

    close: (ws: WebSocket, code: number, message: ArrayBuffer) => {
        console.log("close > ws", ws)
        console.log("close > code", code)
        console.log("close > message", message)
    }
}).listen(9001, (socket) => {
    if (socket) {
        console.log('Listening to port 9001');
    }
})
