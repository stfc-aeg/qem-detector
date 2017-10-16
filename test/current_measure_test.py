import sys, requests, json

class current_test():

  def __init__(self, base_url='http://beagle01.aeg.lan:8888/api/0.1/qem/'):
    self.current_url = base_url + 'current_voltage'
    self.metaheaders = {'Accept': 'application/json;metadata=true'}
    self.expectedCurrent = {'VDD0':(20,41), 'VDD_D18':(8,16), 'VDD_D25':(9,18), 'VDD_P18':(8,16), 'VDD_A18_PLL':(82,164), 'VDD_D18ADC':(8,16), 'VDD_D18_PLL':(82,164), 'VDD_RST':(20,41), 'VDD_A33':(20,41), 'VDD_D33':(20,41), 'VCTRL_NEG':(49,98), 'VRESET':(20,41), 'VCTRL_POS':(82,164)}
    self.neededVoltage = {'VDD_RST':3.3, 'VCTRL_NEG':-2, 'VRESET':3.3, 'VCTRL_POS':3.3}
    self.neededResistor ={'VDD0':180, 'VDD_D18':180, 'VDD_D25':220, 'VDD_P18':180, 'VDD_A18_PLL':180, 'VDD_D18ADC':180, 'VDD_D18_PLL':180, 'VDD_RST':330, 'VDD_A33':330, 'VDD_D33':330, 'VCTRL_NEG':330, 'VRESET':330, 'VCTRL_POS':330}


  def checkCurrentName(self,name):
  #returns the current as voltage of 'name' supply
    response = requests.get(self.current_url, headers=self.metaheaders)
    parsed = json.loads(response.text)
    measured = []
    for cv in parsed['current_voltage']:
      if cv['name'] == name:
        if name in self.neededVoltage :
          raw_input("Please adjust the relevant resistor so that {} is outputing {}V then press enter to continue".format(name, self.neededVoltage[name]))
        measured.append(cv['current_raw']['value'])
        raw_input("Please connect the additional {}R Resistor for the appropriate PL connecter for {} then press enter to continue".format(self.neededResistor[name],name))
        measured.append(cv['current_raw']['value'])
        return measured
    print (name + ' is not a valid current voltage')
    sys.exit()


  def checkCurrent(self,name):
    measured = self.checkCurrentName(name)
    expected = self.expectedCurrent[name]
    return (expected, measured)

if __name__ == '__main__':
  if len(sys.argv) < 2:
    print 'please input the name of the current voltage device or set (U45 or U39) of devices to be tested'
    sys.exit()
  if len(sys.argv) == 3: tester = current_test(sys.argv(2))  
  else: tester = current_test()
  name = sys.argv[1].replace(' ', '_')
  checked = {}
  if name == 'U45':
    for vc in ('VDD0', 'VDD_D18', 'VDD_D25', 'VDD_P18', 'VDD_A18_PLL','VDD_D18ADC', 'VDD_D18_PLL'):
      checked[vc] = tester.checkCurrent(vc) 
  elif name == 'U39':
    for vc in ('VDD_RST', 'VDD_A33', 'VDD_D33', 'VCTRL_NEG', 'VRESET', 'VCTRL_POS'):
      checked[vc] = tester.checkCurrent(vc)
  else:
    checked[name] = tester.checkCurrent(name)
  for name in checked:
    print 'At {}s register:\n    expected {:d}, measured {:d} at default resistance\n    expected {:d}, measured {:d} with added resistor\n'.format(name, checked[name][0][0], checked[name][1][0], checked[name][0][1], checked[name][1][1])

