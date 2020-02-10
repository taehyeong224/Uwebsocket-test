const socket = new WebSocket("ws://localhost:9001");

socket.onopen = () => {
    console.log("on open")
    socket.send(JSON.stringify({type:"SUBSCRIBE", subscribe: "hello"}))
}


socket.onerror = (e) => {
    console.error("error : ", e)
}

socket.onmessage = (e) => {
    const {data,type,target} = e;
    console.log(convertMessageToObject(data));
}

socket.onclose = (e) => {
    console.error("closed : ", e)
}

const convertMessageToObject = (data) => JSON.parse(data);