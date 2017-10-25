
from odin.adapters.adapter import ApiAdapter, ApiAdapterResponse, request_types, response_types
from odin.adapters.metadata_tree import MetadataParameterError
from tornado.escape import json_decode
from test_script import Testing


class TestingAdapter(ApiAdapter):

    def __init__(self, **kwargs):

        super(TestingAdapter, self).__init__(**kwargs)
        self.testing = Testing()

    def get(self, path, request):

        try:
            response = self.testing.get(path)
            status_code = 200
        except Exception as e:
            #Return the error
            response = {'error': str(e)}
            status_code = 400
        return ApiAdapterResponse(response, status_code=status_code)
    

    def put(self, path, request):

        try:
            data = json_decode(request.body)
            self.testing.set(path, data)
            response = self.testing.get(path, False)
            status_code = 200
        except MetadataParameterError as e:
            response = {'error': str(e)}
            status_code = 400
        except (TypeError, ValueError) as e:
            response = {'error': 'Failed to decode PUT request body: {}'.format(str(e))}
            status_code = 400
        return ApiAdapterResponse(response, status_code=status_code)

