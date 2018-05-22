from odin.adapters.adapter import ApiAdapter, ApiAdapterResponse, request_types, response_types
from odin.adapters.metadata_tree import MetadataParameterError
from tornado.escape import json_decode
from tornado.ioloop import IOLoop
from interface.interface_data import InterfaceData


class InterfaceAdapter(ApiAdapter):
    """InterfaceAdapter - ODIN API adapter class for the QEM Interface plugin.
    """

    def __init__(self, **kwargs):
        """Initialise the QEMAdapter instance.
        """
        # Initialise the superclass ApiAdapter - this parses the keyword arguments
        # into the options used below.
        super(InterfaceAdapter, self).__init__(**kwargs)

        # Retrieve adapter options from incoming argument list
        self.update_interval = float(self.options.get('update_interval', 0.05))

        self.interface_data = InterfaceData()

        # Start the update loop
        self.update_loop()

    @request_types('application/json')
    @response_types('application/json')
    def get(self, path, request):
        """Handle an HTTP GET request.
        """

        try:
            #Check for metadata argument
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

            #Get response
            response = self.interface_data.get(path, metadata)
            status_code = 200

        except Exception as e:
            #Return the error
            response = {'error': str(e)}
            status_code = 400

        return ApiAdapterResponse(response, status_code=status_code)

    @request_types('application/json')
    @response_types('application/json')
    def put(self, path, request):
        """Handle an HTTP PUT request.
        This method handles an HTTP PUT request routed to the adapter. This decodes the
        JSON body of the request into a dict, and passes the result with the request path, to
        the underlying PSCUData instance set method, where it is parsed and the appropriate
        actions performed on the PSCU.
        :param path: URI path of request
        :param request: HTTP request object
        :return: an ApiAdapterResponse object containing the appropriate response from the PSCU.
        """

        try:
            data = json_decode(request.body)
            self.interface_data.set(path, data)
            response = self.interface_data.get(path, False)
            status_code = 200
        except MetadataParameterError as e:
            response = {'error': str(e)}
            status_code = 400
        except (TypeError, ValueError) as e:
            response = {'error': 'Failed to decode PUT request body: {}'.format(str(e))}
            status_code = 400
        return ApiAdapterResponse(response, status_code=status_code)

    def update_loop(self):
        """Handle background update loop tasks.
        This method polls the sensors in the background and is executed periodically in the tornado
        IOLoop instance.
        """
        # Handle background tasks
        #self.interface_data.backplane.poll_all_sensors()

        # Schedule the update loop to run in the IOLoop instance again after appropriate
        # interval
        IOLoop.instance().call_later(self.update_interval, self.update_loop)
