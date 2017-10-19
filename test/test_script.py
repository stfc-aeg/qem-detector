from current_measure_test import current_test
from volt_measure_test import voltage_test
from oscillator_test import oscillator_test 
from resistor_test import resistor_test
import sys

if __name__ == '__main__':
  if len(sys.argv) < 2:
    print 'please input the name of the type of test to be run'
    sys.exit()
  testType = sys.argv[1]
  base_url = None 

  if testType == 'oscillator':
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
    tester.clockTest(testCases)
  elif testType == 'resistor':
    if len(sys.argv) < 3:
      print 'please input the name of the resistor to be tested'
      sys.exit()
    name = sys.argv[2]
    testCases = None
    testRaw = True
    for arg in sys.argv[3:]:
      parsedArg = arg.split('=')
      if parsedArg[0] == 'url':
        base_url = parsedArg[1]
        tester = resistor_test(base_url)
      elif parsedArg[0] == 'test':
        testCases = map(float,parsedArg[1].split(','))
      elif parsedArg[0] == 'raw':
        testRaw = parsedArg[1]
      else: 
        print parsedArg[0] + ' is not a valid keyword'
        sys.exit()
    if not base_url: tester = resistor_test()
    tester.resistorTest(name,testRaw,testCases)
  elif testType == 'voltage_measure':
    if len(sys.argv) < 3
      print 'please input the name of the power supply or set (U46 or U40) of power supplies to be tested'
      sys.exit()
    name = sys.argv[2].replace(' ', '_')
    for arg in sys.argv[3:]:
      parsedArg = arg.split('=')
      if parsedArg[0] == 'url':
        base_url = parsedArg[1]
        tester = voltage_test(base_url)
    if not base_url: tester = voltage_test()
    tester.voltageTest(name)
  elif testType == 'current_measure':
    if len(sys.argv) < 3:
      print 'please input the name of the power supply or set (U45 or U39) of power supplies to be tested'
      sys.exit()
    name = sys.argv[2].replace(' ', '_')
    for arg in sys.argv[3:]:
      parsedArg = arg.split('=')
      if parsedArg[0] == 'url':
        base_url = parsedArg[1]
        tester = current_test(base_url)
    if not base_url: tester = current_test()
    tester.currentTest(name)
  else:
    print 'please input the type of test to run (oscillator, resistor, voltage_measure or current_measure)'
  

