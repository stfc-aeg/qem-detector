""" AD5694 - 

Sophie Kirkham, STFC Application Engineering Group
"""

WRITE_UPDATE = 0x30

from i2c_device import I2CDevice, I2CException 

class AD5694(I2CDevice):

    def __init__(self, address, **kwargs):

        I2CDevice.__init__(self, address, **kwargs)
        self.address = address
        self.dacs[4] = {0x01, 0x02, 0x04, 0x08}
        #setupdevice

    def set_from_voltage(self, dac, voltage): 
        value = (voltage - 0.1975) / 0.0015
        self.write_from_value(dac, value)
    
    def set_from_value(self, dac, value):
        
        print ("setting dac %d from  value %d" % (dac, value))
        self.write16(WRITE_UPDATE + self.dacs[dac-1], value)

    def read_dac_voltage(sel, dac):

        return ((self.read_dac_value() * 0.0015) + 0.1975)

    def read_dac_value(self, dac):

        return self.readU16(WRITE_UPDATE + self.dacs[dac-1])
