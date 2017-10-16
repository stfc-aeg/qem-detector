
import sys, requests, json

class resistor_test():

  def __init__(self, base_url='http://beagle01.aeg.lan:8888/api/0.1/qem/'):
    self.resistors_url = base_url + 'resistors'
    self.headers = {'Content-Type': 'application/json'}
    self.units = {'AUXSAMPLE':'V','AUXRESET':'V','VCM':'V','DACEXTREF':'uV','VRESET':'V','VDD_RST':'V','VCTRL':'V'}
    self.expectedResistance = {}
    self.expectedResistance['AUXSAMPLE'] = [0,.165,.330,.495,.660,.825,.990,1.154,1.319,1.484,1.649,1.814,1.979,2.144,2.309,2.474]
    self.expectedResistance['AUXRESET'] = [0,.165,.330,.495,.660,.825,.990,1.154,1.319,1.484,1.649,1.814,1.979,2.144,2.309,2.474]
    self.expectedResistance['VCM'] = [0,.165,.330,.495,.660,.825,.990,1.154,1.319,1.484,1.649,1.814,1.979,2.144,2.309,2.474]
    self.expectedResistance['DACEXTREF'] = [0,8.60,16.93,24.87,32.48,39.80,46.83,53.58,60.09,66.36,72.39,78.22,83.84,89.27,94.51,99.98]
    self.expectedResistance['VRESET'] = [0,.58,1.04,1.42,1.73,1.99,2.21,2.40,2.57,2.71,2.85,2.96,3.07,3.16,3.25,3.33]
    self.expectedResistance['VDD_RST'] =[1.8,2.26,2.55,2.73,2.86,2.96,3.04,3.10,3.15,3.19,3.23,3.26,3.29,3.32,3.34,3.36]
    self.expectedResistance['VCTRL'] =[-2.02,-1.66,-1.30,-0.94,-0.58,-0.22,.14,.50,.86,1.22,1.57,1.81,2.29,2.65,3.01,3.37]


  def measureResistor(self,name):
     return(input('please input the measured voltage across {} in {}: '.format(name,self.units[name])))


  def getResistorNum(self,name):
    response = requests.get(self.resistors_url, headers={'Accept': 'application/json;metadata=true'})
    parsed = json.loads(response.text)
    for i in range(len(parsed['resistors'])):
      if parsed['resistors'][i]['name'] == name:
        return i
    print (resistor + ' is not a valid resistor')


  def testResistor(self,name,testCases=None):
    measuredResistance = []
    resistorNum = self.getResistorNum(name)
    if testCases == None:
      resistor_url = self.resistors_url + '/' + str(resistorNum) + '/raw_value'
      for testCase in range(0,256,17):
        changeResistor = requests.put(resistor_url, str(testCase), headers=self.headers)
        measuredResistance.append(self.measureResistor(name))
      return (self.expectedResistance[name], measuredResistance)
    else:
      resistor_url = self.resistors_url + '/' + str(resistorNum) + '/value'
      testCases = json.loads(testCases)
      for testCase in testCases:
        changeResistor = requests.put(resistor_url, str(testCase), headers=self.headers)
        measuredResistance.append(self.measureResistor(name))
      return (testCases, measuredResistance)


if __name__ == '__main__':
  if len(sys.argv) < 2:
    print 'please input the name of the resistor to be tested'
    sys.exit()
  name = sys.argv[1]
  base_url = None
  testCases = None
  for arg in sys.argv[2:]:
    parsedArg = arg.split('=')
    if parsedArg[0] == 'url':
      base_url = parsedArg[1]
      tester = resistor_test()
    elif parsedArg[0] == 'test':
      testCases = parsedArg[1]
    else: 
      print parsedArg[0] + ' is not a valid keyword'
      sys.exit()
  if not base_url: tester = resistor_test()
  results = tester.testResistor(name,testCases)
  print 'At {}, in {}:'.format(name,tester.units[name])
  for i in range(len(results[0])): 
    print '    expected {:.2f}, measured {:.2f}'.format(results[0][i], results[1][i])

