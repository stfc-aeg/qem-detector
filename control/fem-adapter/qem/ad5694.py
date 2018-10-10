""" AD5694 - 

Sophie Kirkham, STFC Application Engineering Group
"""



from i2c_device import I2CDevice, I2CException 

class AD5694(I2CDevice):

    def __init__(self, address, **kwargs):

        I2CDevice.__init__(self, address, **kwargs)
        self.address = address
        #setupdevice

    def set_from_voltage(self, voltage): 

        value = (voltage - 0.1975) / 0.0015
            
    
    def set_from_value(self, value):
        pass

    def write_dac_reg(self, dac, value):
        pass
        """
        self.write8(0x31)
        self.write16(dac)
        self.write - 
        """

    def read_dac_reg(self):
        pass
    
    