import sys, requests, json

class voltage_test():

  def __init__(self, base_url='http://beagle01.aeg.lan:8888/api/0.1/qem/'):
    self.voltage_url = base_url + 'current_voltage'
    self.metaheaders = {'Accept': 'application/json;metadata=true'}
    self.expectedVoltage = {'VDD0':2459,'VDD_D18':2459,'VDD_D25':3415,'VDD_P18':2459,'VDD_A18_PLL':2459,
                            'VDD_D18ADC':2459,'VDD_D18_PLL':2459,'VDD_A33':2702,'VDD_D33':2702}
    self.expectedVoltageRange = {'VDD_RST':(1474,2702),'VCTRL_NEG':(0,1638),
                                 'VRESET':(0,2702),'VCTRL_POS':(0,2702)}    


  def checkVoltageName(self,name):
  #returns voltage of 'name' supply
    response = requests.get(self.voltage_url, headers=self.metaheaders)
    parsed = json.loads(response.text)
    for cv in parsed['current_voltage']:
      if cv['name'] == name:
        return cv['voltage_raw']['value']
    print (name + ' is not a valid current voltage')
    sys.exit()


  def checkVoltage(self,name):
    expectRange = False
    measured = self.checkVoltageName(name)
    if name in self.expectedVoltage :
      expected = self.expectedVoltage[name]
    else:
      expected = self.expectedVoltageRange[name]
      expectRange = True
    return (expectRange, expected, measured)

if __name__ == '__main__':
  base_url = None
  if len(sys.argv) < 2:
    print 'please input the name of the current voltage device to be tested'
    sys.exit()
  if len(sys.argv) == 3: base_url = sys.argv(2) 
  tester = voltage_test(base_url)
  name = sys.argv[1].replace(' ', '_')
  checked = tester.checkVoltage(name)
  if checked[0]:
    print 'At {}s register:\n    expected range {:d} to {:d}, measured {:d}'.format(name, checked[1][0], checked[1][1], checked[2])
  else:
    print 'At {}s register:\n    expected {:d}, measured {:d}'.format(name, checked[1], checked[2])
