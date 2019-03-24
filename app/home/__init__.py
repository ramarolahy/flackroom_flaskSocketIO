from flask import Blueprint

"""
    The Home blueprint will display books search results and book info
"""
# home Blueprint constructor
home = Blueprint('home', __name__)

# Must come after instantiation
from . import views