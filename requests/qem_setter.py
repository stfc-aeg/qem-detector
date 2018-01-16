import requests

class QemSetter:

    def __init__(self, url='http://localhost', port=8888):
        self.headers = {'Content-Type': 'application/json'}
        self.url = '{}:{}/api/0.1/qem/'.format(url, str(port))

    def setClock(self, frequency):
    #sets the clock frequency to 'frequency' (MHz)
        requests.put(self.url + 'clock', str(frequency) ,headers=self.headers)

    def __findResistor(self, resistor):
    #returns the base Url for the named 'resistor'
        resistorLookup = {'AUXRESET':'0', 'VCM':'1', 'DACEXTREF':'2', 'VDD_RST':'3', 'VRESET':'4', 'VCTRL':'5', 'AUXSAMPLE':'6'}
        resistorLocation = resistorLookup(resistor.strip().upper().replace(' ', '_'))
        resistorUrl = self.url + 'resistors/{}/'.format(url, str(port), resistorLocation)
        return resistorUrl

    def setResistorValue(self, resistor, value):
    #sets the resistor given name or location 'resistor' to 'value' in V (uA for DACEXTREF)
        resistorUrl = __findResistor(resistor, url, port) + 'resistance'
        requests.put(resistorUrl, str(value), headers=self.headers)

    def setResistorRegister(self, resistor, value):
    #sets the resistor given name or location 'resistor' to 'value'
        resistorUrl = __findResistor(resistor, url, port) + 'register'
        requests.put(resistorUrl, str(value), headers=self.headers)

    def enablePSU(self):
    #sets the psu to enabled
        requests.put(self.url + 'psu_enabled', 'true', headers=self.headers)
