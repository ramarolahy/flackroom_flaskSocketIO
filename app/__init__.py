import os
from flask_bootstrap import Bootstrap
from flask import Flask
from flask_jsglue import JSGlue


# local imports
from config import app_config


def create_app(config_name):
    # Create and initialize Flask app
    # config.py is locate with instance_relative_config
    app = Flask(__name__, instance_relative_config=True)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY") or "b'_5#y2LF4Q8znxec]/'"
    app.config.from_object(app_config[config_name])
    app.config.from_pyfile('config.py')
    Bootstrap(app)
    jsglue = JSGlue(app)

    from .home import home as home_blueprint
    app.register_blueprint(home_blueprint)

    return app


