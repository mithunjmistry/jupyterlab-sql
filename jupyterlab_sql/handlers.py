import json
from contextlib import contextmanager

from jupyter_server.utils import url_path_join
from jupyter_server.base.handlers import APIHandler
import tornado.ioloop

from . import responses
from . import schema_loader
from . import request_decoder
from .executor import Executor
import time
import os
import pandas as pd


class SqlQueryHandler(APIHandler):
    def initialize(self, executor):
        self._executor = executor
        self._validator = schema_loader.load("sql-query.json")

    def execute_query(self, connection_url, query):
        result = self._executor.execute_query(connection_url, query)
        return result

    def execute_metadata_query(self, connection_url, query):
        metadata_connection_url = "sqlite:///metadata.db"
        metadata_query, ts = self.metadata_query_builder(connection_url, query)
        result = self._executor.execute_metadata_query(metadata_connection_url, metadata_query)
        return result, ts

    def metadata_query_builder(self, connection_url, query):
        ts = int(time.time())
        metadata_query = f'INSERT INTO metadata (query, ts, connectionUrl) VALUES ("{query}", "{ts}", "{connection_url}")'
        return metadata_query, ts

    def write_to_file(self, file_name, content=''):
        try:
            file = open(file_name, "w+")
            file.write(content)
        finally:
            file.close()

    def write_query_to_file(self, query, ts):
        s3_obj = f'query_{ts}'
        directory = f'queries/{s3_obj}'
        if not os.path.exists(directory):
            os.makedirs(directory)
        file_name = f'queries/{s3_obj}/{s3_obj}.in'
        self.write_to_file(file_name, query)

    def write_output_to_file(self, ts, response=None):
        s3_obj = f'query_{ts}'
        directory = f'queries/{s3_obj}'
        if not os.path.exists(directory):
            os.makedirs(directory)
        file_name = f'queries/{s3_obj}/{s3_obj}.out'
        if response is not None:
            if type(response) == pd.core.frame.DataFrame:
                response.to_csv(file_name, index=False)
            else:
                self.write_to_file(file_name, response)
        else:
            self.write_to_file(file_name)

    @contextmanager
    def decoded_request(self):
        try:
            data = request_decoder.decode(self.request.body, self._validator)
            query = data["query"]
            connection_url = data["connectionUrl"]
            yield query, connection_url
        except request_decoder.RequestDecodeError as e:
            response = responses.error(str(e))
            return self.finish(json.dumps(response))

    async def post(self):
        with self.decoded_request() as (query, connection_url):
            ioloop = tornado.ioloop.IOLoop.current()
            metadata_result_id, ts = self.execute_metadata_query(connection_url, query)
            self.write_query_to_file(query, ts)
            try:
                result = await ioloop.run_in_executor(
                    None, self.execute_query, connection_url, query
                )
                if result.has_rows:
                    keys = [row for row in result.keys]
                    response = responses.success_with_rows(
                        keys, result.rows
                    )
                    df = pd.DataFrame(result.rows, columns=keys)
                    self.write_output_to_file(ts, df)
                else:
                    response = responses.success_no_rows()
                    self.write_output_to_file(ts)
            except Exception as e:
                err = str(e)
                response = responses.error(err)
                self.write_output_to_file(ts, err)
            self.finish(json.dumps(response))


class StructureHandler(APIHandler):
    def initialize(self, executor):
        self._executor = executor
        self._validator = schema_loader.load("database-structure.json")

    def get_table_names(self, connection_url):
        result = self._executor.get_table_names(connection_url)
        return result

    @contextmanager
    def decoded_request(self):
        try:
            data = request_decoder.decode(self.request.body, self._validator)
            connection_url = data["connectionUrl"]
            yield connection_url
        except request_decoder.RequestDecodeError as e:
            response = responses.error(str(e))
            return self.finish(json.dumps(response))

    async def post(self):
        with self.decoded_request() as connection_url:
            ioloop = tornado.ioloop.IOLoop.current()
            try:
                database_objects = await ioloop.run_in_executor(
                    None, self._executor.get_database_objects, connection_url
                )
                response = responses.success_with_database_objects(
                    database_objects
                )
            except Exception as e:
                response = responses.error(str(e))
            return self.finish(json.dumps(response))


class SchemaStructureHandler(APIHandler):
    def initialize(self, executor):
        self._executor = executor
        self._validator = schema_loader.load("schema-structure.json")

    def get_schema_objects(self, connection_url):
        result = self._executor.get_schema_objects(connection_url)
        return result

    @contextmanager
    def decoded_request(self):
        try:
            data = request_decoder.decode(self.request.body, self._validator)
            connection_url = data["connectionUrl"]
            yield connection_url
        except request_decoder.RequestDecodeError as e:
            response = responses.error(str(e))
            return self.finish(json.dumps(response))

    async def post(self):
        with self.decoded_request() as connection_url:
            ioloop = tornado.ioloop.IOLoop.current()
            try:
                schema_objects = await ioloop.run_in_executor(
                    None, self._executor.get_schema_objects, connection_url
                )
                response = responses.success_with_schema_objects(
                    schema_objects
                )
            except Exception as e:
                response = responses.error(str(e))
            return self.finish(json.dumps(response))


class HistoryHandler(APIHandler):
    def initialize(self, executor):
        self._executor = executor

    def execute_history_query(self, connection_url):
        metadata_connection_url = "sqlite:///metadata.db"
        history_query = f'SELECT id, query, ts, connectionUrl from metadata WHERE connectionUrl = "{connection_url}" ORDER BY ts DESC'
        result = self._executor.execute_query(metadata_connection_url, history_query)
        return result

    async def get(self):
        filters = self.request.arguments
        requested_file_name = None
        connection_url = None
        for k, v in filters.items():
            if k == 'fileName':
                requested_file_name = v[0].decode("utf-8")
            if k == 'connectionUrl':
                print(f'ConnectionUrl parameter received is {type(v)}')
                connection_url = v[0].decode("utf-8")
        if connection_url is None and requested_file_name is None:
            self.set_status(400)
            self.finish(json.dumps({'error': 'Connection URL or File Name is needed.'}))
        if connection_url is not None:
            ioloop = tornado.ioloop.IOLoop.current()
            try:
                result = await ioloop.run_in_executor(
                    None, self.execute_history_query, connection_url
                )
                keys = [row for row in result.keys]
                response = responses.history_success(
                    keys, result.rows
                )
            except Exception as e:
                response = responses.error(str(e))
            self.finish(json.dumps(response))
        else:
            file_name = f'queries/{requested_file_name}'
            buf_size = 4096
            self.set_header('Content-Type', 'application/octet-stream')
            self.set_header('Content-Disposition', 'attachment; filename=' + file_name)
            with open(file_name, 'r') as f:
                while True:
                    data = f.read(buf_size)
                    if not data:
                        break
                    self.write(data)
            self.finish()


class TableStructureHandler(APIHandler):
    def initialize(self, executor):
        self._executor = executor
        self._validator = schema_loader.load("table-structure.json")

    def get_table_summary(self, connection_url, table_name):
        result = self._executor.get_table_summary(connection_url, table_name)
        return result

    @contextmanager
    def decoded_request(self):
        try:
            data = request_decoder.decode(self.request.body, self._validator)
            connection_url = data["connectionUrl"]
            table_name = data["table"]
            yield connection_url, table_name
        except request_decoder.RequestDecodeError as e:
            response = responses.error(str(e))
            return self.finish(json.dumps(response))

    async def post(self):
        with self.decoded_request() as (connection_url, table_name):
            ioloop = tornado.ioloop.IOLoop.current()
            try:
                result = await ioloop.run_in_executor(
                    None, self.get_table_summary, connection_url, table_name
                )
                keys = [row for row in result.keys]
                response = responses.success_with_rows(
                    keys, result.rows
                )
            except Exception as e:
                response = responses.error(str(e))
            print(response)
            self.finish(json.dumps(response))


def form_route(web_app, endpoint):
    return url_path_join(
        web_app.settings["base_url"], "/jupyterlab-sql/", endpoint
    )


def register_handlers(nbapp):
    web_app = nbapp.web_app
    host_pattern = ".*$"
    executor = Executor()
    handlers = [
        (
            form_route(web_app, "query"),
            SqlQueryHandler,
            {"executor": executor},
        ),
        (
            form_route(web_app, "database"),
            StructureHandler,
            {"executor": executor},
        ),
        (
            form_route(web_app, "table"),
            TableStructureHandler,
            {"executor": executor},
        ),
        (
            form_route(web_app, "schema"),
            SchemaStructureHandler,
            {"executor": executor},
        ),
        (
            form_route(web_app, "history"),
            HistoryHandler,
            {"executor": executor},
        ),
    ]
    web_app.add_handlers(host_pattern, handlers)
