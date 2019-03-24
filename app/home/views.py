from flask import render_template

from . import home


# Flackroom route
# ===============================================
@home.route('/', methods=['GET', 'POST'])
def flackroom():
    """
    INSERT INFO HERE
    """

    return render_template('home/flackroom.html', title="Flackroom")
