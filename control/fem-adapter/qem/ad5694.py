""" AD5694 - 

Sophie Kirkham,  STFC Application Engineering Group
"""

WRITE_UPDATE = 0x30

from i2c_device import I2CDevice, I2CException 

class AD5694(I2CDevice):

    def __init__(self, address, **kwargs):

        I2CDevice.__init__(self, address, **kwargs)
        self.address = address
        self.dacs = [0x01, 0x02, 0x04, 0x08]
        self.dac_values = [self.read_dac_value(1), 0x00, 0x00, self.read_dac_value(4)]


    def set_from_voltage(self, dac, voltage): 
        if dac == 1:
		value = (voltage - 0.1999) / 0.00002
		print(value)
		self.set_from_value(dac, int(value))
	elif dac == 4:
		value = (voltage - 0.1987) / 0.0004
        	self.set_from_value(dac, int(value))
	else:
		raise I2CException("Choose DAC 1 or 4, 2/3 not currently implemented")    
   
    def set_from_value(self, dac, value):
	
	bytearray = [0x00, 0x00]
	data = (value & 0xFFFF) << 4
	bytearray[0] = (data & 0xFFFF) >> 8
	bytearray[1] = (data & 0x00FF)
	self.writeList(WRITE_UPDATE + self.dacs[dac-1], bytearray)

    def read_dac_voltage(self, dac):
	if dac == 1:
        	return ((self.read_dac_value(dac) * 0.00002) + 0.1999)
	elif dac == 4:
		return ((self.read_dac_value(dac) * 0.0004) + 0.1987)
	else:
		raise I2CException("Choose DAC 1 or 4, 2/3 not currently implemented")

    def read_dac_value(self, dac, force=False):
	
	if dac != 1 | dac != 4:
		raise I2CException("Choose DAC 1 or 4, 2/3 not currently implemented")
	if force:
		result = [0x00, 0x00]
        	byte1, byte2 =  self.readList(WRITE_UPDATE + self.dacs[dac-1], 2)
		self.dac_values[dac-1] = (((byte1 & 0xFF) << 8) + byte2) >> 4
	
	return self.dac_values[dac-1] 
