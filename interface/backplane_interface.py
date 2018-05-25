import requests
import json

class Backplane_Interface():

    def __init__(self, address="192.168.0.123", port="8888"):
        self.url = "http://" + address + ":" + port + "/api/0.1/qem/"
        self.put_headers = {'Content-Type': 'application/json'}
        self.meta_headers = {'Accept': 'application/json;metadata=true'}

    def get_resistor_value(self, resistor):
        response = requests.get(self.url + "resistors/" + str(resistor) + "/resistance")
        parsed_response = float(json.loads(response.text)[u'resistance'])
        return parsed_response

    def set_resistor_value(self, resistor, value):
        resistor_url = self.url + "resistors/" + str(resistor)+ "/resistance"
        requests.put(resistor_url, str(value), headers=self.put_headers)

    def get_resistor_name(self, resistor):
        response = requests.get(self.url + "resistors/" + str(resistor) + "/name", headers=self.meta_headers)
        parsed_response = str(json.loads(response.text)[u'name'])
        return parsed_response

    def get_resistor_units(self, resistor):
        response = requests.get(self.url + "resistors/" + str(resistor) + "/resistance", headers=self.meta_headers)
        parsed_response = str(json.loads(response.text)[u'resistance'][u'units'])
        return parsed_response

    def get_resistor_min(self, resistor):
        response = requests.get(self.url + "resistors/" + str(resistor) + "/resistance", headers=self.meta_headers)
        parsed_response = float(json.loads(response.text)[u'resistance'][u'min'])
        return parsed_response

    def get_resistor_max(self, resistor):
        response = requests.get(self.url + "resistors/" + str(resistor) + "/resistance", headers=self.meta_headers)
        parsed_response = float(json.loads(response.text)[u'resistance'][u'max'])
        return parsed_response

    def get_resistor_non_volatile(self):
        response = requests.get(self.url + "non_volatile")
        parsed_response = str(json.loads(response.text)[u'non_volatile'])
        return unicode(parsed_response)

    def set_resistor_non_volatile(self, value):
        requests.put(self.url + "non_volatile", str(value), headers=self.put_headers)

    def get_clock_frequency(self):
        response = requests.get(self.url + "clock")
        parsed_response = float(json.loads(response.text)[u'clock'])
        return parsed_response

    def set_clock_frequency(self, freq):
        requests.put(self.url + "clock", str(freq), headers=self.put_headers)

    def get_sensors_enable(self):
        response = requests.get(self.url + "sensors_enabled")
        parsed_response = str(json.loads(response.text)[u'sensors_enabled'])
        return unicode(parsed_response)

    def set_sensors_enable(self, value):
        requests.put(self.url + "sensors_enabled", str(value), headers=self.put_headers)

    def get_update(self):
        response = requests.get(self.url + "update_required")
        parsed_response = str(json.loads(response.text)[u'update_required'])
        return unicode(parsed_response)

    def set_update(self, value):
        requests.put(self.url + "update_required", str(value), headers=self.put_headers)

    def set_reset(self, value):
        requests.put(self.url + "reset", str(value), headers=self.put_headers)

    def get_current(self, supply):
        response = requests.get(self.url + "current_voltage/" + str(supply) + "/current")
        parsed_response = float(json.loads(response.text)[u'current'])
        return parsed_response

    def get_voltage(self, supply):
        response = requests.get(self.url + "current_voltage/" + str(supply) + "/voltage")
        parsed_response = float(json.loads(response.text)[u'voltage'])
        return parsed_response

    def get_adc_name(self, supply):
        response = requests.get(self.url + "current_voltage/" + str(supply) + "/name", headers=self.meta_headers)
        parsed_response = str(json.loads(response.text)[u'name'])
        return parsed_response
