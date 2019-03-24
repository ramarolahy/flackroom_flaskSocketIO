$(document).ready(function () {

    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     *  STORAGE CONTROLLERS
     /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

    /**
     *  Method to update the local storage
     */
    const updateLocalStorage = function () {
        //Initialize JSON object to store locally
        // const jsonFile = {
        //     last_session: session_data
        // };
        // Update file in local storage
        const myLocalFile = JSON.stringify(session_data);
        window.localStorage.setItem('last_session', myLocalFile);
    };

    /**
     * Method to get local storage
     * @returns {*}
     */
    const getLocalStorage = function () {
        // Assign to variable
        const last_session = window.localStorage.getItem('last_session');
        let parsedSession;

        // if not Null then parse it
        if (last_session) {
            parsedSession = JSON.parse(last_session);
        } else {
            return {
                "myFlackername": '',
                "joined_channels": ['#main'],
                "last_active_channel": '#main'
            };
        }

        return parsedSession;
    };

    // Get local storage and assign value to session data
    const session_data = getLocalStorage();

    // =========================================

    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     *  APP INIT
     /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        // Connect to websocket
    const socket = io.connect('http://' + document.domain + ':' + location.port);

    // Global variable to store the current flacker's flackername
    let current_flacker = 'superflacker';
    let flacker_sid = '';


    // =========================================


    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     *  VIEW INIT
     /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    /**
     * Method to load data stored in local storage from last session
     * Each event handlers will need to be reattached on connect
     * @param last_active_channel: string
     * @param joined_channels: array
     * @param flacker: string
     */
    function initFlackroom(flacker, last_active_channel = '#main', joined_channels) {

        /**
         * Receives message history from the server
         * initializes flackroom
         */
        socket.on('load_channels', data => {
            //let storedChannels = Object.keys(data.messages);
            console.log(data.open_channels);
            // load channel links. #main will be pre-loaded and disabled
            for (let i = 0; i < data.open_channels.length; i++) {
                if (data.open_channels[i] !== '#main') {
                    joined_channels.includes(data.open_channels[i]) ? displayChannelBtn(data.open_channels[i], true) : displayChannelBtn(data.open_channels[i], false);
                }
            }
            
        });

        /**
         * load all joined message panels
         *  - disable joined channels
         *  - activate last active channels
         *  - The last active channel seem to get onclickSendMessage twice after reload
         */
        joined_channels.forEach(channel => {
            (channel === last_active_channel) ? displayChannelRoom(channel, true) : displayChannelRoom(channel, false);
            onclickSendMessage(channel);
            onclickTabs(channel);
            onclickLeaveChannel(channel, flacker);
            socket.emit('Join channel', {'username': current_flacker, 'channel': channel});
        });
    }

    // =========================================


    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     *  SOCKET CONTROLLERS
     /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

    /**
     * Get flackername on submit
     * Hide JoinPanel
     * Raise the curtain and give access to flack
     */
    socket.on('connect', () => {
        const last_flackername = session_data.myFlackername;
        $('#flackername').val(last_flackername ? last_flackername : 'superflacker').focus();
        // call join flack from handler
        onJoinFlackSubmit();
    });

    /**
     * Get the flacker's session id from the server
     * and store it client side
     */
    socket.on('get_sid', data => {
        flacker_sid = data;
    });

    /**
     * Set up the socket to send message payload
     * Calls the onclickSendMessage method after identifying the current
     * active channel
     */
    socket.on('connect', () => {
        let channel = session_data.last_active_channel ? session_data.last_active_channel : '#main';
        // When user clicks on send button
        onclickSendMessage(channel);
    });

    /**
     * -> Receives the response from the socket and displays
     * the message payload.
     * Then clears and focus on the input field
     */
    socket.on('Display message', data => {
        const channel = (data.channel.charAt(0) === '#') ? data.channel.substr(1) : data.channel;
        // Display message
        displayMessage(data);
        // Empty then focus on input field
        $(`#message-${channel}`).val('').focus();

    });

    socket.on('load_messages', data => {
        let channels = Object.keys(data.messages);
        let channel = `#${data.channel}`;
        if (($(`#list_messages-${channel}`).find($(`a[id^='flacker-']`))).length === 0) {
            // Load saved messages from the server.
            if (channels.includes(channel)) {
                console.log('load messages');
                for (let j = 0; j < data.messages[channel].length; j++) {
                    displayMessage(data.messages[channel][j]);
                }
            }
        }
    });

    /**
     *  -> Receives the response from Private message socket.
     */
    socket.on('Display private message', message => {

        // Call Views controllers and Event handlers on response
        if (flacker_sid === message.recipient_sid) {
            // Open the recipient's private channel room but do not activate it yet
            if (($(`#v-pills-${message.recipient_sid}-tab`).length === 0) && ($(`#v-pills-${message.sender_sid}-tab`).length === 0)) {
                displayChannelRoom(message, false, true, true);
                onclickLeaveChannel(message, message.sender_name, true, true);
                onclickSendPrivateMessage(flacker_sid, message.sender_sid);
            }
            displayMessage(message, true, true);
        } else {
            // display the message
            displayMessage(message, true);
        }
        // clear the input field
        $(`#private-message-${flacker_sid}`).val('').focus();
    });

    /**
     *  -> Set up the socket connection to create a channel
     *  I could not figure out if there is an actual method to create channel (the docs
     *  are not the most clear ... ) so I am sending the new channel as a message payload.
     *      - Check if new channel name already exist first THEN create
     *          ELSE flash the existing channel.
     */
    socket.on('connect', () => {
        $('#channel-form').submit(evt => {
            // Stop the form from submitting by default
            evt.preventDefault();
            let channel = `#${$('#name').val().replace(/[^-_a-zA-Z0-9]/g, '').toLowerCase().toString()}`;
            // Channel name has #
            if (typeof channel != "undefined" && channel.length > 1) {
                socket.emit('Create channel', {'channel': channel});
            }
        });
    });

    /**
     *  -> Receives the response payload from the socket
     *      - Strip the # symbol so I can use the channel name inside ids and dataset
     *      -
     */
    socket.on('Display channel link', data => {
        // channelName must be unique
        if (data.open_channels.includes(data.channel)) {
            // Flash existing channel red for 1 second. (remove the # first!!)
            $(`#channel-link-${data.channel.replace('#', '')}`).addClass('channel-link__flash');
            setTimeout(() => {
                $(`#channel-link-${data.channel.replace('#', '')}`).removeClass('channel-link__flash');
            }, 1000);
        }

        // Display channel button
        displayChannelBtn(data.channel, false);
        // Assign click evt to channel link on render
        //onclickChannelBtn(data.channel, username);
        $('#name').val('');
    });


    /**
     *  -> Receives response for joining a room
     */
    socket.on('Room joined', data => {
        let channel = (data.channel.charAt(0) === '#') ? data.channel.substr(1) : data.channel;

        $(`#list_messages-${channel}`).append(
            `
                <div class="comment">
                    <div class="content room-activity pl-3 py-1">
                        <div class="text" >
                            <p class="text-center ">
                            <span class="room-activity  room-joined">@${data.username} joined the room</span>
                            </p>
                        </div>
                    </div>
                </div>
                    `)
    });

    /**
     *  -> Receives response for leaving a room
     */
    socket.on('Room left', data => {
        let channel = (data.channel.charAt(0) === '#') ? data.channel.substr(1) : data.channel;
        $(`#list_messages-${channel}`).append(
            `
                <div class="comment">
                    <div class="content room-activity pl-3 py-1">
                        <div class="text" >
                            <p class="text-center">
                            <span class="room-activity  room-left">@${data.username} left the room</span>
                            </p>
                        </div>
                    </div>
                </div>
                    `)
    });

// =========================================


    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     *  VIEW CONTROLLERS
     /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

//   ~~~~~~  DISPLAY HANDLERS  ~~~~~~ //
    /**
     * Method to display message
     * @param data: object or string
     * @param isPrivate : boolean
     * @param isRecipient: boolean
     */
    const displayMessage = (data, isPrivate = false, isRecipient = false) => {
        let channel;
        if (isPrivate && isRecipient) {
            channel = data.sender_sid;
        } else if (isPrivate) {
            channel = data.recipient_sid;
        } else {
            channel = (data.channel.charAt(0) === '#') ? data.channel.substr(1) : data.channel;
        }

        if (data.sender_name !== undefined && data.sender_name !== '') {
            const avatarLink = Flask.url_for('static', {'filename': 'img/user.svg'});
            $(`#list_messages-${channel}`).append(
                `
                <div class="comment">
                    <a class="avatar">
                      <img src=${avatarLink} alt="avatar">
                    </a>
                    <div class="content pl-3 py-2">
                        <a id="flacker-${data.sender_sid}" class="author" style="color: #1c6d74" data-sid=${data.sender_sid} data-name=${data.sender_name}>@${data.sender_name}</a>
                        <div class="metadata">
                            <span class="date"> ${data.timestamp}</span>
                        </div>
                        <div class="text" >
                            <p>${data.body}</p>
                        </div>
                    </div>
                </div>
                    `)
        }
        // Attach handler event for flacker private messaging
        onclickflacker(data)
    };

    /**
     * Method to display a channel button
     * @param channelName: string
     * @param isjoined: boolean
     */
    const displayChannelBtn = (channelName, isjoined) => {
        let channel = (channelName.charAt(0) === '#') ? channelName.substr(1) : channelName;
        if (typeof channel != "undefined" && channel !== '#' && !$(`#channel-link-${channel}`).length) {
            $('#channelList').append(`
                <button id="channel-link-${channel}" data-channel="${channel}" type="button" class="btn mx-1 ${isjoined ? 'channel-joined' : ''}" ${isjoined ? 'disabled' : ''}>
                    <!-- A very ugly way to make sure # does not get doubled -->
                    #${channel}
                </button>
            `);
        }
        onclickChannelBtn(channel);
    };

    /**
     * Method to display a channel tab and panel
     * @param data: object
     * @param isActive: boolean to check if panel is active
     * @param isPrivate: boolean to check if panel is for private messages
     * @param isRecipient: boolean to set which end of the message the user is
     */
    const displayChannelRoom = (data, isActive = false, isPrivate = false, isRecipient = false) => {
        let channel;
        let displayName;

        // initFlackroom() gets a list of opened channels (string) from the server so check if data is string
        // Once session is started, displayChannelRoom takes data objects.
        if ((typeof data === 'object') && isPrivate && isRecipient) {
            channel = data.sender_sid;
            displayName = data.sender_name;
        } else if ((typeof data === 'object') && isPrivate) {
            channel = data.recipient_sid;
            displayName = data.recipient_name;
        } else if ((typeof data === 'object')) {
            // Make sure the # doest get carried inside ids
            channel = (data.channel.charAt(0) === '#') ? data.channel.substr(1) : data.channel;
        } else {
            channel = (data.charAt(0) === '#') ? data.substr(1) : data;
            socket.emit('get_messages', {'messages': '', 'channel': channel});
        }
        // Add channel tab
        $('#v-pills-tab').append(
            `
                <a class="nav-link mb-2 ${isActive ? 'active' : ''} ${isPrivate ? 'private' : ''}" id="v-pills-${channel}-tab" data-channel=${channel} data-toggle="pill" href="#v-pills-${channel}"
                role="tab" aria-controls="v-pills-${channel}" aria-selected="true">
                    <span class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 py-0">
                        ${isPrivate ? '@' + displayName : '#' + channel}
                    </span>
                </a>
            `);

        // Add message panel
        $('#v-pills-tabContent').append(
            `
                <div class="tab-pane fade ${isActive ? 'show active' : ''}" id="v-pills-${channel}" role="tabpanel" data-channel=${channel}
                     aria-labelledby="v-pills-${channel}-tab">
                    <div class="wrap__channel-info">
                        <h3 id="channelName-${channel}">${isPrivate ? '@' + displayName : '#' + channel}</h3>
                        ${(channel !== 'main') ? `<button id="leave-channel-${channel}" data-channel=${channel}>${isPrivate ? 'Later ' + displayName + '! :)' : 'leave ' + channel}</button>` : ''}
                    </div>
                    <div id="list_messages-${channel}" class="ui comments">
                         
                        <div class="row wrap__message-form">
                            <div class="py-1 col-12">
                                <form id="message-form" class="form-inline py-3" role="form" autocomplete="off" method="POST">
                                <div class="col-9">
                                    <input class="form-control" id="${isPrivate ? 'private-' : ''}message-${isPrivate ? flacker_sid : channel}" name="${isPrivate ? 'private-' : ''}message-${isPrivate ? data.sender_sid : channel}" type="text" required>
                               </div>
                                <div class="col-3">
                                    <input class="btn btn-default" id="${isPrivate ? 'private-' : ''}send-${isPrivate ? flacker_sid : channel}" name="${isPrivate ? 'private-' : ''}send-${isPrivate ? data.sender_sid : channel}" type="submit" value="Send">
                                </div>
                            </form>
                            </div>
                        </div>
                    </div>
                </div>
            `);

    };


//  ~~~~~~  EVENT HANDLERS  ~~~~~~ //
    /**
     * Event handler for join flack form
     */
    const onJoinFlackSubmit = () => {
        $('#register-form').submit(evt => {
                evt.preventDefault();
                if ($('#flackername').val() !== '') {
                    current_flacker = $('#flackername').val();

                    // Call init_room function from server
                    socket.emit('init_room', {'open_channels': ''});
                    // Log the user on the server
                    socket.emit('Register flacker');
                    // Initiate the chat app
                    $('#current_flacker').html(`@${current_flacker}`);
                    $('#JoinPanel').remove();
                    $('#ChannelPanel').css('z-index', '0');
                    $('#overlay').slideUp(325);

                    // Update database
                    session_data.myFlackername = current_flacker;
                    updateLocalStorage()
                }
                // Initiate the chat views and load all saved messages
                initFlackroom(session_data.myFlackername,
                    session_data.last_active_channel,
                    session_data.joined_channels);

            }
        );
    };

    /**
     * Method to emit message payload over the socket
     * @param channelName: takes the channel as parameter
     */
    const onclickSendMessage = channelName => {
        let channel = (channelName.charAt(0) === '#') ? channelName.substr(1) : channelName;
        $(`#send-${channel}`).click(evt => {
            // Stop the form from submitting by default
            evt.preventDefault();
            const body = $(`#message-${channel}`).val();
            if (body !== undefined && body !== '') {
                // call the send message function from the server.
                socket.emit('Send message', {
                    'body': body,
                    'sender_sid': flacker_sid,
                    'sender_name': current_flacker,
                    'recipient_name': channelName,
                    'timestamp': '',
                    'channel': `#${channel}`
                });
            }
        });
    };

    /**
     * Event handler for submitting private message
     * @param sender_sid
     * @param recipient_sid
     */
    const onclickSendPrivateMessage = (sender_sid, recipient_sid) => {
        $(`#private-send-${sender_sid}`).click(evt => {
            let channelName;
            let recipient_name;
            // Stop the form from submitting by default
            evt.preventDefault();
            const body = $(`#private-message-${sender_sid}`).val();
            // Get the message recipient name from the channel info section
            channelName = $(`#channelName-${recipient_sid}`).html();
            recipient_name = (channelName.charAt(0) === '@') ? channelName.substr(1) : channelName;
            // Call the Private message from the server
            if (body !== undefined && body !== '') {
                socket.emit('Private message', {
                    'body': body,
                    'sender_sid': sender_sid,
                    'sender_name': current_flacker,
                    'timestamp': '',
                    'recipient_name': recipient_name,
                    'recipient_sid': recipient_sid
                });
            }
        });
    };


    /**
     * Event handler for channel buttons
     * @param channelName
     * @param user
     * @returns {*|jQuery}
     */
    const onclickChannelBtn = (channelName, user = 'superFlacker') => {
        let channel = (channelName.charAt(0) === '#') ? channelName.substr(1) : channelName;

        return $(`#channel-link-${channel}`).unbind().click(evt => {
            // Channel names has # in the front
            socket.emit('Join channel', {'username': user, 'channel': '#' + channel});
            // Call get_message function from server
            socket.emit('get_messages', {'messages': ''});
            // Display channel tab and panel
            displayChannelRoom(channel);
            // Set tab to active
            $('a.nav-link').removeClass('active');
            $(`#v-pills-${channel}-tab`).addClass('active');
            // Set panel to show and active
            $('div.tab-pane.fade').removeClass('show active');
            $(`#v-pills-${channel}`).addClass('show active');

            // Emit message to active channel
            onclickSendMessage(channel);
            // Assign click event to channel tabs
            onclickTabs(channel);
            // Assign click event to leave channel button on render
            onclickLeaveChannel(channel);

            // Update last active channel name
            session_data.last_active_channel = `#${channel}`;
            // Update the joined channels list for the user
            if (!session_data.joined_channels.includes(`#${channel}`)) {
                session_data.joined_channels.push(`#${channel}`);
            }
            // Update the local storage
            updateLocalStorage();
            // -------------------

            // Deactivate and set channel link to joined
            $(evt.currentTarget).addClass('channel-joined').attr('disabled', 'true');
        });
    };

    /**
     *  Event handler for flacker private message
     *  Gets called by displayMessage()
     * @param data
     * @returns {*|jQuery}
     */
    const onclickflacker = (data) => {
        let flacker = data.recipient_sid;
        return $(`#flacker-${data.sender_sid}`).unbind().click((evt) => {
            // get sender information to create private room tab on the originator side
            const recipient_sid = $(evt.currentTarget).attr('data-sid');
            const recipient_name = $(evt.currentTarget).attr('data-name');
            // save it an object to pass into displayChannelRoom()
            const recipient = {
                'recipient_name': recipient_name,
                'recipient_sid': recipient_sid,
                'sender_sid': flacker_sid
            };

            if ((recipient_sid !== flacker_sid) && ($(`#v-pills-${flacker}`).length === 0)) {
                // Display channel tab and panel
                displayChannelRoom(recipient, false, true);
                // Emit message to active channel
                onclickSendPrivateMessage(flacker_sid, recipient_sid);
                // Assign click event to leave channel button on render
                onclickLeaveChannel(recipient_sid, data.sender_name, true);
                // Set tab to active
                $('a.nav-link').removeClass('active');
                $(`#v-pills-${recipient_sid}-tab`).addClass('active');
                // Set panel to show and active
                $('div.tab-pane.fade').removeClass('show active');
                $(`#v-pills-${recipient_sid}`).addClass('show active');
            }
        });
    };

    /**
     * Event handler for channel tabs
     * @param data: string
     * @returns {*|jQuery}
     */
    const onclickTabs = data => {
        let channel = (data.charAt(0) === '#') ? data.substr(1) : data;
        return $(`#v-pills-${channel}-tab`).click(() => {
            // Update last active channel name
            session_data.last_active_channel = `#${channel}`;
            updateLocalStorage();
        });
    };

    /**
     * Event handler for leave channel button
     * @param data: string or object
     * @param user: string
     * @param isPrivate:  boolean
     * @param isRecipient: boolean
     * @returns {*|jQuery}
     */
    const onclickLeaveChannel = (data, user = 'superFlacker', isPrivate = false, isRecipient = false) => {
        let channel;
        // initFlackroom() gets a list of opened channels (string) from the server so check if data is string
        // Once session is started, displayChannelRoom takes data objects.
        if ((typeof data === 'object') && isPrivate && isRecipient) {
            channel = data.sender_sid;
        } else if ((typeof data === 'object') && isPrivate) {
            channel = data.recipient_sid;
        } else if ((typeof data === 'object') && !isPrivate) {
            // Make sure the # doest get carried inside ids
            channel = (data.channel.charAt(0) === '#') ? data.channel.substr(1) : data.channel;
        } else {
            channel = (data.charAt(0) === '#') ? data.substr(1) : data;
        }
        return $(`#leave-channel-${channel}`).click(() => {
            //Leave the channel
            socket.emit('Leave channel', {'username': user, 'channel': '#' + channel});
            // Re-activate the channel link
            $(`#channel-link-${channel}`).removeClass('channel-joined').removeAttr('disabled');
            // Remove channel tab and panel
            $(`#v-pills-${channel}-tab`).remove();
            $(`#v-pills-${channel}`).remove();
            // Set main channel to active
            $(`#v-pills-main-tab`).addClass('active');
            $(`#v-pills-main`).addClass('show active');

            // Remove channel from joined_channels
            const index = session_data.joined_channels.indexOf(`#${channel}`);
            if (index > -1) {
                session_data.joined_channels.splice(index, 1)
            }
            session_data.last_active_channel = '#main';
            // Update the local storage
            updateLocalStorage();
        })
    };

    /**
     *  Style handlers for input forms
     */
    const inputFields = $('#name, #flackername');
    $(inputFields).focus(() => {
        $('.input-group-text').css('border-color', '#1c6d74')
    });
    $(inputFields).blur(() => {
        $('.input-group-text').css('border-color', 'white')
    });

// =========================================

});
