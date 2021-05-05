
import json
from pathlib import Path

from .handlers import register_handlers
from ._version import __version__

HERE = Path(__file__).parent.resolve()

with (HERE / "labextension" / "package.json").open() as fid:
    data = json.load(fid)


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "jupyterlab_sql"}]


def _jupyter_server_extension_points():
    return [{"module": "jupyterlab_sql"}]


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.
    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    server_app.log.info("Loading server extension jupyterlab_sql")
    register_handlers(server_app)

# For backward compatibility with the classical notebook
load_jupyter_server_extension = _load_jupyter_server_extension

