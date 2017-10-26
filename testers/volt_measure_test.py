import sys, requests

class voltage_test():

  def __init__(self, base_url='http://beagle01.aeg.lan:8888/api/0.1/qem/'):
    self.voltage_url = base_url + 'current_voltage'
    self.resistors_url = base_url + 'resistors'
    self.metaheaders = {'Accept': 'application/json;metadata=true'}
    self.headers = {'Content-Type': 'application/json'}
    self.expectedVoltage = {'VDDO':2459,'VDD_D18':2459,'VDD_D25':3415,'VDD_P18':2459,'VDD_A18_PLL':2459,
                            'VDD_D18ADC':2459,'VDD_D18_PLL':2459,'VDD_A33':2702,'VDD_D33':2702}
    self.expectedVoltageRange = {'VDD_RST':(1474,2702),'VCTRL_NEG':(0,1638),
                                 'VRESET':(0,2702),'VCTRL_POS':(0,2702)}


  def checkVoltageName(self,name):
  #returns voltage of 'name' supply
    parsedResponse = requests.get(self.voltage_url, headers=self.metaheaders).json()
    for cv in parsedResponse['current_voltage']:
      if cv['name'] == name:
        return cv['voltage_register']['value']
    print 'Name Error, ' +  name + ' is not a valid power supply'
    sys.exit()

  def getResistorData(self,name):
    parsedResponse = requests.get((self.resistors_url), headers={'Accept': 'application/json;metadata=true'}).json()
    for i in range(len(parsedResponse['resistors'])):
      if parsedResponse['resistors'][i]['name'] == name:
       return(i,parsedResponse['resistors'][i]['register_value']['value'])
    print 'Name Error, ' + name + ' is not a valid resistor'
    sys.exit()

  def checkVoltage(self,name):
    expectRange = False
    if name not in self.expectedVoltageRange:
      measured = self.checkVoltageName(name)
      expected = self.expectedVoltage[name]
    else:
      measured = {}
      expected = self.expectedVoltageRange[name]
      expectRange = True
      if name[0:5] == 'VCTRL': resistor = 'VCTRL'
      else: resistor = name
      resistorData = self.getResistorData(resistor)
      resistor_url = self.resistors_url + '/' + str(resistorData[0]) + '/register_value'
      measured[0] = self.checkVoltageName(name)
      requests.put(resistor_url, '0', headers=self.headers)
      measured[1] = self.checkVoltageName(name)
      requests.put(resistor_url, '255', headers=self.headers)
      measured[2] = self.checkVoltageName(name)
      requests.put(resistor_url, str(resistorData[1]), headers=self.headers)
    return (expectRange, expected, measured)

  def voltageTest(self, name):
    if name == 'U46':
      expectRange = []
      expected = []
      measured = []
      for vc in ('VDDO', 'VDD_D18', 'VDD_D25', 'VDD_P18', 'VDD_A18_PLL','VDD_D18ADC', 'VDD_D18_PLL'):
        results = self.checkVoltage(vc)
        expectRange.append(results[0])
        expected.append(results[1])
        measured.append(results[2])
    elif name == 'U40':
      expectRange = []
      expected = []
      measured = []
      for vc in ('VDD_RST', 'VDD_A33', 'VDD_D33', 'VCTRL_NEG', 'VRESET', 'VCTRL_POS'):
        results = self.checkVoltage(vc)
        expectRange.append(results[0])
        expected.append(results[1])
        measured.append(results[2])
    else:
      (expectRange, expected, measured) = self.checkVoltage(name)
    return(name, expectRange, expected, measured)



if __name__ == '__main__':
  if len(sys.argv) < 2:
    print 'please input the name of the current voltage device or set (U46 or U40) of devices to be tested'
    sys.exit()
  name = sys.argv[1].replace(' ', '_')
  base_url = None
  for arg in sys.argv[2:]:
    parsedArg = arg.split('=')
    if parsedArg[0] == 'url':
      base_url = parsedArg[1]
      tester = voltage_test(base_url)
  if not base_url: tester = voltage_test()
  tester.voltageTest(name)
