function sendMessage(message_text) {
    const message_info =  {
        client_id: client_id,
        action: "send",
        message: message_text
    }
    socket.send(JSON.stringify(message_info))
}

function sendRoom() {
    const message_info = {
        client_id: client_id,
        action: "join",
        room_name: room_name
    }
    socket.send(JSON.stringify(message_info))
}

function updateMessages(data) {
    const username = data["username"]
    const message = data["message"]

    const past_messages = document.getElementById("past-messages")
    const past_message = document.createElement("div")
    past_message.classList.add("past-message")

    const message_element = document.createElement("span")
    message_element.classList.add("message")
    message_element.textContent = message

    const username_element = document.createElement("span")
    username_element.classList.add("username")
    username_element.textContent = `${username}:`

    past_message.appendChild(username_element)
    past_message.appendChild(message_element)

    past_messages.prepend(past_message)
}

function updateRoom() {
    const room_name_element = document.getElementById("room-name")
    room_name_element.disabled = true
    room_name.value = room_name
}

const socket = new WebSocket('ws://localhost:8080')
socket.onmessage = async event => {
    try {
        const data = await JSON.parse(event.data)
        if (data["action"] === "client_id") {
            client_id = data["client_id"]
        } else if (data["action"] === "receive") {
            updateMessages(data)
        } else if (data["action"] === "notify") {
            if (data["action_type"] === "join") {
                updateRoom()
            }
        }
    } catch (error) {
        console.error('Error handling JSON:', error)
    }
}

socket.onclose = async event => {
    const close_message = {
        client_id: client_id,
        action: "disconnect",
    }
    socket.send(JSON.stringify(close_message))
}

const join_room = document.querySelector("#join-room")
join_room.addEventListener("click", event => {
    const room_name_element = document.getElementById("room-name")
    room_name = room_name_element.value
    sendRoom()

    room_name_element.value = ""
})

const leave_room = document.querySelector("#leave-room")
leave_room.addEventListener("click", event => {
    const room_name_element = document.getElementById("room-name")
    room_name_element.disabled = false
    room_name_element.value = ""
    room_name = ""
})

const input_message = document.querySelector("form#message")
input_message.addEventListener("submit", event => {
    event.preventDefault()

    const message_element = document.getElementById("text")
    const message = message_element.value
    sendMessage(message)

    message_element.value = ""
})

let client_id = ""
let room_name = ""

// todo: show in a room
// todo: error when submitting message but no room
// todo: popup upon leaving room