import os
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
from datetime import datetime

from app import create_app

config_name = os.getenv('FLASK_CONFIG')
app = create_app('development')
socketio = SocketIO(app)
# Get timestamp for messages
server_timestamp = datetime.now().strftime("%H:%M, %m/%d/%Y")
# global variable to store messages
message_history = {
    '#main': [{
                  'body': 'Welcome to flackroom!', 'sender_sid': 'falckbot001', 'sender_name': 'flackbot',
                  'timestamp': server_timestamp, 'recipient_name': 'superflacker', 'channel': '#main'
              }]
}
# Global variable to store channels
open_channels = ['#main']
# global variable to store active users
flackers = []


def is_empty(d):
    # Method to check if dictionary is empty
    if d:
        return False
    else:
        return True


@socketio.on('Register flacker')
def get_flacker():
    # Method to Register flacker and respond with sid
    flackers.append(request.sid)
    print(flackers)
    emit('get_sid', request.sid)


@socketio.on('init_room')
def init_room(data):
    # Method to get stored messages and respond with message payload
    # Takes empty object from client side and loads in messages
    channels = data['open_channels']
    if not is_empty(open_channels):
        channels = open_channels
    emit('load_channels', {'open_channels': channels})


@socketio.on('get_messages')
def load_messages(data):
    print('get messages')
    # Method to get stored messages and respond with message payload
    # Takes empty object from client side and loads in messages
    messages = data['messages']
    channel = data['channel']
    if not is_empty(message_history):
        messages = message_history
    emit('load_messages', {'messages': messages, 'channel': channel})


@socketio.on('Send message')
def send_message(data):
    # Method to send message to channel
    # Takes message object from client side and adds server timestamp
    channel = data['channel']
    body = data['body']
    sender_sid = data['sender_sid']
    sender_name = data['sender_name']
    recipient_name = data['recipient_name']
    # save timestamp as a string to be able to save it
    timestamp = str(server_timestamp)
    # Save message
    message = {
        'body'          : body, 'sender_sid': sender_sid, 'sender_name': sender_name, 'timestamp': timestamp,
        'recipient_name': recipient_name, 'channel': channel
    }
    # check if channel is message_history
    if channel in message_history:
        # save message
        message_history[channel].append(message)
        # only keep the last 100 messages for each channel
        if len(message_history[channel]) >= 100:
            del message_history[channel][0]
    else:
        # add new channel then save message
        message_history[channel] = []
        message_history[channel].append(message)
    # emit the response
    emit('Display message', message, room=channel, broadcast=True)


@socketio.on('Private message')
def private_message(data):
    # Method to send Private message to user
    # extract the payload content
    recipient_sid = data['recipient_sid']
    recipient_name = data['recipient_name']
    body = data['body']
    sender_sid = data['sender_sid']
    sender_name = data['sender_name']
    # save timestamp as a string to be able to save it
    timestamp = str(server_timestamp)
    join_room(recipient_sid)
    # Save message
    message = {'body': body, 'sender_sid': sender_sid, 'sender_name': sender_name, 'timestamp': timestamp,
               'recipient_name': recipient_name, 'recipient_sid': recipient_sid
    }
    print('Private message: ' + str(message))
    emit('Display private message', message, room=recipient_sid, broadcast=True)


@socketio.on('Create channel')
def send_message(data):
    # Method to create new channel
    channel = data['channel']

    if channel not in open_channels:
        open_channels.append(channel)
        print('Channel created: ' + data['channel'])
    print(open_channels)
    emit('Display channel link', {'channel': channel, 'open_channels': open_channels}, broadcast=True)


@socketio.on('Join channel')
def on_join(data):
    # Method to join channel
    username = data['username']
    channel = data['channel']
    join_room(channel)
    print(username + ' joined ' + channel)
    emit('Room joined', {'username': username, 'channel': channel}, broadcast=True)


@socketio.on('Leave channel')
def on_leave(data):
    # Method to leave channel
    username = data['username']
    channel = data['channel']
    leave_room(channel)
    print(username + ' left ' + channel)
    emit('Room left', {'username': username, 'channel': channel}, broadcast=True)


if __name__ == '__main__':
    socketio.run(app, debug=True)
