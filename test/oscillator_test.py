import sys, requests

class oscillator_test():

  def __init__(self, base_url='http://beagle01.aeg.lan:8888/api/0.1/qem/'):
    self.clock_url = base_url + 'clock'
    self.baseTestCases = [10,50,100,20]
    self.headers = {'Content-Type': 'application/json'}

  def changeClock(self,newClock):
  #sets the clock frequency to 'newClock' (MHz)
    requests.put(self.clock_url, str(newClock) ,headers=self.headers)
    return

  def measureClock(self):
     return(input('please input the measured frequency in MHz: '))

  def testClock(self,testCases=None):
    currentClock = requests.get(self.clock_url).json()
    measuredTestCases = []
    if testCases is None: testCases = self.baseTestCases
    for testCase in testCases:
      self.changeClock(testCase)
      measuredTestCases.append(self.measureClock())
    self.changeClock(currentClock['clock'])
    return (testCases,measuredTestCases) 

if __name__ == '__main__':
  
  base_url = None
  testCases = None
  for arg in sys.argv[1:]:
    parsedArg = arg.split('=')
    if parsedArg[0] == 'url':
      base_url = parsedArg[1]
      tester = oscillator_test(base_url)
    elif parsedArg[0] == 'test':
      testCases = map(float,parsedArg[1].split(','))
    else: 
      print parsedArg[0] + ' is not a valid keyword'
      sys.exit()
  if not base_url: tester = oscillator_test()
  if not testCases:  results = tester.testClock()
  else: results = tester.testClock(testCases)
  print 'At Crystal Oscillator, in MHz:'
  for i in range(len(results[0])): 
    print '    expected {:.2f}, measured {:.2f}'.format(results[0][i], results[1][i])

