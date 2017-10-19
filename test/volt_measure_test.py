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
        return cv['voltage_raw']['value']
    print (name + ' is not a valid current voltage')
    sys.exit()


  def checkVoltage(self,name):
    expectRange = False
    if name in self.expectedVoltage :
      measured = self.checkVoltageName(name)
      expected = self.expectedVoltage[name]
    else:
      measured = {}
      expected = self.expectedVoltageRange[name]
      expectRange = True
      if name[0:5] == 'VCTRL': resistor = 'VCTRL'
      else: resistor = name
      resistorData = self.getResistorData(resistor)
      resistor_url = self.resistors_url + '/' + str(resistorData[0]) + '/raw_value'
      measured[0] = self.checkVoltageName(name)
      requests.put(resistor_url, '0', headers=self.headers)
      measured[1] = self.checkVoltageName(name)
      requests.put(resistor_url, '255', headers=self.headers)
      measured[2] = self.checkVoltageName(name)
      requests.put(resistor_url, str(resistorData[1]), headers=self.headers)
    return (expectRange, expected, measured)

  def getResistorData(self,name):
    parsedResponse = requests.get((self.resistors_url), headers={'Accept': 'application/json;metadata=true'}).json()
    for i in range(len(parsedResponse['resistors'])):
      if parsedResponse['resistors'][i]['name'] == name:
       return(i,parsedResponse['resistors'][i]['raw_value']['value'])
    print (resistor + ' is not a valid resistor')

if __name__ == '__main__':
  if len(sys.argv) < 2:
    print 'please input the name of the current voltage device or set (U46 or U40) of devices to be tested'
    sys.exit()
  base_url = None
  for arg in sys.argv[2:]:
    parsedArg = arg.split('=')
    if parsedArg[0] == 'url':
      base_url = parsedArg[1]
      tester = voltage_test(base_url)
  if not base_url: tester = voltage_test()
  name = sys.argv[1].replace(' ', '_')
  if name == 'U46':
    for vc in ('VDDO', 'VDD_D18', 'VDD_D25', 'VDD_P18', 'VDD_A18_PLL','VDD_D18ADC', 'VDD_D18_PLL'):
      checked = tester.checkVoltage(vc)
      print 'At {}s register:\n    expected {:d}, measured {:d}'.format(vc, checked[1], checked[2])
  elif name == 'U40':
    for vc in ('VDD_RST', 'VDD_A33', 'VDD_D33', 'VCTRL_NEG', 'VRESET', 'VCTRL_POS'):
      checked = tester.checkVoltage(vc)
      if checked[0]:
        print 'At {}s register:\n    expected range {:d} to {:d}, measured range {:d} to {:d}, current {:d}'.format(vc, checked[1][0], checked[1][1], checked[2][1], checked[2][2], checked[2][0])
      else:
        print 'At {}s register:\n    expected {:d}, measured {:d}'.format(vc, checked[1], checked[2])  
  else:
    checked = tester.checkVoltage(name)
    if checked[0]:
        print 'At {}s register:\n    expected range {:d} to {:d}, measured range {:d} to {:d}, current {:d}'.format(name, checked[1][0], checked[1][1], checked[2][1], checked[2][2], checked[2][0])
    else:
      print 'At {}s register:\n    expected {:d}, measured {:d}'.format(name, checked[1], checked[2])  
