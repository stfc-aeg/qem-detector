""" AD5694 - 

Sophie Kirkham, STFC Application Engineering Group
"""

WRITE_UPDATE = 0x30

from i2c_device import I2CDevice, I2CException 

class AD5694(I2CDevice):

    def __init__(self, address, **kwargs):

        I2CDevice.__init__(self, address, **kwargs)
        self.address = address
        self.dacs = [0x01, 0x02, 0x04, 0x08]
        #setupdevice

    def set_from_voltage(self, dac, voltage): 
        value = (voltage - 0.1975) / 0.0015
        self.write_from_value(dac, value)
    
    def set_from_value(self, dac, value):
	
	bytearray = [0x00, 0x00]        
        print ("setting dac %d from  value %d" % (dac, value))
	data = (value & 0xFFFF) << 4
	print data
	bytearray[0] = (data & 0xFFFF) >> 8
	bytearray[1] = (data & 0x00FF)
	print bytearray	
	self.writeList(WRITE_UPDATE + self.dacs[dac-1], bytearray)

    def read_dac_voltage(sel, dac):

        return ((self.read_dac_value() * 0.0015) + 0.1975)

    def read_dac_value(self, dac):
	
	result = [0x00, 0x00]
        byte1, byte2 =  self.readList(WRITE_UPDATE + self.dacs[dac-1], 2)
	print byte1, byte2
	result = (((byte1 & 0xFF) << 8) + byte2) >> 4
	return result
