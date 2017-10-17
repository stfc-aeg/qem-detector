import sys, requests

class current_test():

  def __init__(self, base_url='http://beagle01.aeg.lan:8888/api/0.1/qem/'):
    self.current_url = base_url + 'current_voltage'
    self.metaheaders = {'Accept': 'application/json;metadata=true'}
    self.expectedCurrent = {'VDDO':(20,41), 'VDD_D18':(8,16), 'VDD_D25':(9,18), 'VDD_P18':(8,16), 'VDD_A18_PLL':(82,164), 'VDD_D18ADC':(8,16), 'VDD_D18_PLL':(82,164), 'VDD_RST':(20,41), 'VDD_A33':(20,41), 'VDD_D33':(20,41), 'VCTRL_NEG':(49,98), 'VRESET':(20,41), 'VCTRL_POS':(82,164)}
    self.neededVoltage = {'VDD_RST':3.3, 'VCTRL_NEG':-2, 'VRESET':3.3, 'VCTRL_POS':3.3}
    self.neededResistor ={'VDDO':180, 'VDD_D18':180, 'VDD_D25':220, 'VDD_P18':180, 'VDD_A18_PLL':180, 'VDD_D18ADC':180, 'VDD_D18_PLL':180, 'VDD_RST':330, 'VDD_A33':330, 'VDD_D33':330, 'VCTRL_NEG':330, 'VRESET':330, 'VCTRL_POS':330}
    self.plConnector = {'VDDO':75, 'VDD_D18':42, 'VDD_D25':74, 'VDD_P18':41, 'VDD_A18_PLL':76, 'VDD_D18ADC':33, 'VDD_D18_PLL':77, 'VDD_RST':34, 'VDD_A33':36, 'VDD_D33':35, 'VCTRL_NEG':78, 'VRESET':40, 'VCTRL_POS':78}


  def checkCurrentName(self,name):
  #returns the current as voltage of 'name' supply
    parsedResponse = requests.get(self.current_url, headers=self.metaheaders).json()
    measured = []
    for cv in parsedResponse['current_voltage']:
      if cv['name'] == name:
        if name in self.neededVoltage :
          raw_input("Please adjust the relevant resistor so that {} is outputing {}V then press enter to continue".format(name, self.neededVoltage[name]))
        raw_input("Please disconnect PL{} then press enter to continue".format(self.plConnector[name]))
        measured.append(cv['current_raw']['value'])
        raw_input("Please connect an additional {}R Resistor at PL{} then press enter to continue".format(self.neededResistor[name],self.plConnector[name]))
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
  base_url = None
  for arg in sys.argv[2:]:
    parsedArg = arg.split('=')
    if parsedArg[0] == 'url':
      base_url = parsedArg[1]
      tester = current_test(base_url)
  if not base_url: tester = current_test()
  name = sys.argv[1].replace(' ', '_')
  checked = {}
  if name == 'U45':
    for vc in ('VDDO', 'VDD_D18', 'VDD_D25', 'VDD_P18', 'VDD_A18_PLL','VDD_D18ADC', 'VDD_D18_PLL'):
      checked[vc] = tester.checkCurrent(vc) 
  elif name == 'U39':
    for vc in ('VDD_RST', 'VDD_A33', 'VDD_D33', 'VCTRL_NEG', 'VRESET', 'VCTRL_POS'):
      checked[vc] = tester.checkCurrent(vc)
  else:
    checked[name] = tester.checkCurrent(name)
  for name in checked:
    print 'At {}s register:\n    expected {:d}, measured {:d} at default resistance\n    expected {:d}, measured {:d} with added resistor\n'.format(name, checked[name][0][0], checked[name][1][0], checked[name][0][1], checked[name][1][1])

