def error(message):
    response = {"responseType": "error", "responseData": {"message": message}}
    return response


def success_with_rows(keys, rows):
    response = {
        "responseType": "success",
        "responseData": {"hasRows": True, "keys": keys, "rows": rows},
    }
    return response


def history_success(keys, rows):
    array_list = []
    for row in rows:
        record = dict(zip(keys, row))
        array_list.append(record)
    response = {
        "responseType": "success",
        "responseData": {"hasRows": len(array_list) > 0, "queries": array_list},
    }
    return response


def success_no_rows():
    response = {"responseType": "success", "responseData": {"hasRows": False}}
    return response


def success_with_database_objects(database_objects):
    response_data = {
        "tables": database_objects.tables,
        "views": database_objects.views,
    }
    response = {"responseType": "success", "responseData": response_data}
    return response


def success_with_schema_objects(schema_objects):
    response_data = {
        "schemas": schema_objects
    }
    response = {"responseType": "success", "responseData": response_data}
    return response
