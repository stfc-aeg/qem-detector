
from odin.adapters.adapter import ApiAdapter, ApiAdapterResponse, request_types, response_types
from odin.adapters.metadata_tree import MetadataParameterError
from tornado.escape import json_decode
from test_script import Tester


class TestingAdapter(ApiAdapter):

    def __init__(self, **kwargs):

        super(TestingAdapter, self).__init__(**kwargs)
        self.tester = Tester()

    def get(self, path, request):

        try:
            metadata = False
            if "Accept" in request.headers:
                splitted = request.headers["Accept"].split(';')

                if len(splitted) > 1:
                    splitted = splitted[1:]
                    for arg in splitted:
                        if '=' in arg:
                            arg = arg.split('=')
                            if arg[0] == "metadata":
                                metadata = bool(arg[1])
            response = self.tester.get(path, metadata)
            status_code = 200

        except Exception as e:
            response = {'error': str(e)}
            status_code = 400

        return ApiAdapterResponse(response, status_code=status_code)
    

    def put(self, path, request):

        try:
            data = json_decode(request.body)
            self.testing.set(path, data)
            response = self.tester.get(path, False)
            status_code = 200
        except MetadataParameterError as e:
            response = {'error': str(e)}
            status_code = 400
        except (TypeError, ValueError) as e:
            response = {'error': 'Failed to decode PUT request body: {}'.format(str(e))}
            status_code = 400
        return ApiAdapterResponse(response, status_code=status_code)

