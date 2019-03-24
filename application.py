import os

from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)

socketio = SocketIO(app)


@app.route("/")
def index():
    return render_template('home/flackroom.html')


@socketio.on('send message')
def send_message(json, methods=['GET', 'POST']):
    print('Message received: ' + str(json))
    emit('my response', json, broadcast=True)


if __name__ == '__main__':
    socketio.run(app, debug=True)
