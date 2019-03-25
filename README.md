# Project 2
+ By: Mbinintsoa 'Ram' Ramarolahy

# Website description
Flack is a chatroom where users can have live chatting, open and join channels, start private
channels between other users.

# Outside resources
+ http://stewartpark.github.io/Flask-JSGlue/
+ https://pypi.org/project/Flask-JSGlue/
+ https://stackoverflow.com/
+ https://api.jquery.com/
+ https://getbootstrap.com/
+ https://semantic-ui.com/

# Website Structure
```markdown
project1-ramarolahy
|    
├── app
|   |
|   ├── home
|   |   ├── __init__.py
|   |   └── views.py
|   ├── static
|   |   ├── css
|   |   |   └── styles.css
|   |   ├── img
|   |   |   ├── flack-logo.svg
|   |   |   ├── logo-flask.svg
|   |   |   └── user.svg
|   |   └── js
|   |      └── app.js
|   ├── templates
|   |   ├── home
|   |   |   └── flackroom.html
|   |   ├── includes
|   |   |   └── head.html
|   |   └── base.html
|   └── __init__.py
|
├── instance/
├── .gitignore
├── config.py
├── README.md
├── requirements.txt
└── run.py
```

<h3>Global variables</h3>
message_history = {}
open_channels = []
flackers = []

<h3>Personal Touch</h3>
+ Private channel between two users
+ Remembering all open channels in the flackroom
+ Remembering all channels the user joined
+ A great design and UI/UX
+ An awesome Flack logo

<h3>Packages used</h3>
See requirements.txt

<h3>Other notes</h3>
+ Local storage is used to store flackername and channels joined by the user, so using two different browsers for testing
is ideal (eg Chrome and Opera)
+



