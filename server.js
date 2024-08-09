const WebSocket = require('ws')
const crypto = require('crypto')

const clients_sockets = {}
const clients_usernames = {}
const clients_rooms = {}
const rooms_clients = {}
let counter = 0

const server = new WebSocket.Server({port: 8080})
server.on('connection', socket => {
    sendOnJoin(socket)
    // todo: all messages taht clients send should have client_id, room_name
    //  and username to make it all parsed before conditionals
    socket.on('message', message => {
        const data = JSON.parse(message)

        const room = data["room"]
        const client_id = data["client_id"]
        const username = data["username"]
        const action = data["action"]

        console.log(data)
        if (action === "send") {
            sendMessage(room, username, data["message"])

        } else if (action === "join") {
            // todo: fixed
            if (data["client_id"] in clients_rooms) {
                const old_room = clients_rooms[client_id]
                sendLeave(old_room, username, client_id)
            }

            clients_rooms[client_id] = room
            if (!(room in rooms_clients)) {
                rooms_clients[room] = new Set()
            }
            rooms_clients[room].add(client_id)
            // notify all other users of user_name JOINING in next room
            rooms_clients[room].forEach(neighbor_client_id => {
                clients_sockets[neighbor_client_id].send(JSON.stringify({
                    action: "notify",
                    reason: "join",
                    message: `${username} has joined`
                }))
            })

            sendUserList(room, username)

        } else if (action === "leave") {

            sendLeave(room, username, client_id)

        } else if (action === "disconnect") {
            if (room) {
                sendLeave(room, username, client_id)
            }

            delete clients_sockets[client_id]
            delete clients_usernames[client_id]
        } else if (action === "update-rooms") {
            sendRoomList(socket)
        } else if (action === "update-users") {
            sendUserList(room, client_id)
        }

        socket.send(JSON.stringify(
            {
                action: "notify",
                action_type: action,
                status: "success",
            }
        ))
    })
})

function sendOnJoin(socket) {
    const client_id = crypto.randomBytes(16).toString('hex');
    const username = `anon${counter}`

    socket.send(JSON.stringify({
        action: "initialize",
        client_id: client_id,
        username: username
    }))

    sendRoomList(socket)
    counter++

    clients_sockets[client_id] = socket
    clients_usernames[client_id] = username
}

function sendMessage(room, username, message) {
    const clients_to_receive = rooms_clients[room]
    clients_to_receive.forEach(client => {
        clients_sockets[client].send(JSON.stringify(
            {
                action: "receive",
                username: username,
                message: message
            }))
    })
}

function sendLeave(room, username, client_id) {
    rooms_clients[room].forEach(other_client_id => {
        if (other_client_id !== client_id) {
            clients_sockets[client_id].send(JSON.stringify({
                action: "notify",
                reason: "leave",
                message: `${username} has left`
            }))
        }
    })

    clients_sockets[client_id].send(JSON.stringify(
        {
            action: "leave"
        })
    )

    rooms_clients[room].delete(client_id)
    if (rooms_clients[room].size === 0) {
        delete rooms_clients[room]
    }

    delete clients_rooms[client_id]
}

function sendRoomList(socket) {
    const rooms = {}
    Object.entries(rooms_clients).forEach(([key, set]) => {
        rooms[key] = set.size
    })

    socket.send(JSON.stringify(
        {
            action: "update-rooms",
            rooms: rooms
        }
    ))
}

function sendUserList(room, self_client_id) {
    // send user list
    clients_sockets[self_client_id].send(JSON.stringify({
        action: "update-users",
        room_name: room,
        users: [...rooms_clients[room]].map(
            client_id => {
                if (client_id !== self_client_id) {
                    return clients_usernames[client_id]
                }
            })
    }))
}

// todo: rewrite to send message saying receive, then send message upon completion of task
console.log('WebSocket server is listening on ws://localhost:8080')