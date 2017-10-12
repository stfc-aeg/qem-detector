from lpdpower.i2c_device import I2CDevice, I2CException
from lpdpower.i2c_container import I2CContainer

from tca9548 import TCA9548
from mcp23008 import MCP23008
from tpl0102 import TPL0102
from si570 import SI570
from ad7998 import AD7998

class Backplane(I2CContainer):
    
    CURRENT_MULTIPLIERS = [19.5, 19.5, 1.95, 7.8, 19.5, 19.5, 1.95, 1.2, 1.2, 1.2, 1.2, 0.122, 0.122]

    def __init__(self):

        #Set up I2C devices
        self.tca = TCA9548(0x70, busnum=1)

        self.tpl0102 = []
        for i in range(5):
            self.tpl0102.append(self.tca.attach_device(0, TPL0102, 0x50 + i, busnum=1))
        for i in range(5):
            self.tpl0102[i].set_non_volatile(True)
        self.tpl0102[0].set_terminal_PDs(0, 0, 2.474)
        self.tpl0102[0].set_terminal_PDs(1, 0, 2.474)
        self.tpl0102[1].set_terminal_PDs(0, 0, 99.98)
        self.tpl0102[3].set_terminal_PDs(0, -2.02, 3.37)
        self.tpl0102[4].set_terminal_PDs(0, 0, 2.474)

        self.si570 = self.tca.attach_device(1, SI570, 0x55, busnum=1)
        self.si570.set_frequency(20) #Default to 20MHz

        self.ad7998 = []
        for i in range(4):
            self.ad7998.append(self.tca.attach_device(2, AD7998, 0x24 + i, busnum=1))

        self.mcp23008 = []
        self.mcp23008.append(self.tca.attach_device(3, MCP23008, 0x20, busnum=1))
        self.mcp23008.append(self.tca.attach_device(3, MCP23008, 0x42, busnum=1))
        for i in range(8):
            self.mcp23008[0].setup(i, MCP23008.IN)
        self.mcp23008[1].setup(0, MCP23008.OUT)

        #Sensor readings
        self.voltages = [0.0] * 13
        self.voltages_raw = [0.0] * 13
        self.currents = [0.0] * 13
        self.currents_raw = [0.0] * 13
        self.power_good = [False] * 8
        self.psu_enabled = self.mcp23008[1].input(0)
        self.clock_freq = 21.0
        #Variable resistors
        self.resistors_raw = [
            self.tpl0102[0].get_wiper(0),
            self.tpl0102[0].get_wiper(1),
            self.tpl0102[1].get_wiper(0),
            self.tpl0102[2].get_wiper(0),
            self.tpl0102[2].get_wiper(1),
            self.tpl0102[3].get_wiper(0),
            self.tpl0102[4].get_wiper(0),
        ]
        self.resistors = [
            self.resistors_raw[0] * 0.0097,
            self.resistors_raw[1]* 0.0097,
            self.resistors_raw[2] * 0.29,
            0,
            0,
            self.resistors_raw[5] * 0.021 - 2,
            self.resistors_raw[6] * 0.0097,
        ]
        if not self.resistors_raw[3]==0: self.resistors[3] = 0.0001 / (1.0/49900 + 1.0/self.resistors_raw[3]/390.0)
        if not self.resistors_raw[4]==0: self.resistors[4] =  0.0001 * (17800 + 1 / (1.0/18200 + 1.0/self.resistors_raw[4]/390.0))



    def poll_all_sensors(self):
        #Currents
        for i in range(7):
            self.currents_raw[i] = self.ad7998[0].read_input_raw(i) & 0xfff
            self.currents[i] = self.currents_raw[i] * self.CURRENT_MULTIPLIERS[i] / 4095.0
        for i in range(6):
            self.currents_raw[i + 7] = self.ad7998[2].read_input_raw(i) & 0xfff
            self.currents[i + 7] = self.currents_raw[i + 7] * self.CURRENT_MULTIPLIERS[i + 7] / 4095.0

        #Voltages
        for i in range(7):
            self.voltages_raw[i] = self.ad7998[1].read_input_raw(i) & 0xfff
            self.voltages[i] = self.voltages_raw[i] * 3 / 4095.0
        for i in range(6):
            self.voltages_raw[i + 7] = self.ad7998[3].read_input_raw(i) & 0xfff
            self.voltages[i + 7] = self.voltages_raw[i] * 5 / 4095.0

        #Power good monitors
        self.power_good = self.mcp23008[0].input_pins([0,1,2,3,4,5,6,7,8])

    def set_resistor_value(self, resistor, value):
        if resistor == 0:
            self.tpl0102[0].set_PD(0, value)
        elif resistor == 1:
            self.tpl0102[0].set_PD(1, value)
        elif resistor == 2:
            self.tpl0102[1].set_PD(0, value)
        elif resistor == 3:
            if value == 0: wiper = 0
            else: wiper = int(1.0 / (0.039/value - 390.0/49900))
            self.tpl0102[2].set_wiper(0, wiper)
        elif resistor == 4:
            if value == 1.78: wiper = 0
            else: wiper = int(1.0 / (0.039 / (value - 1.78) - 390.0/18200))
            self.tpl0102[2].set_wiper(1, wiper)
        elif resistor == 5:
            self.tpl0102[3].set_PD(0, value)
        elif resistor == 6:
            self.tpl0102[4].set_PD(0, value)

        self.resistors[resistor] = value

    def set_resistor_value_raw(self, resistor, value):
        if resistor == 0:
            self.tpl0102[0].set_wiper(0, value)
            self.resistors[resistor] = value * 0.0097
        elif resistor == 1:
            self.tpl0102[0].set_wiper(1, value)
            self.resistors[resistor] = value * 0.0097
        elif resistor == 2:
            self.tpl0102[1].set_wiper(0, value)
            self.resistors[resistor] = value * 0.29
        elif resistor == 3:
            self.tpl0102[2].set_wiper(0, value)
            if value == 0: self.resistors[resistor] = 0
            else: self.resistors[resistor] = 0.0001 / (1.0/49900 + 1.0/value/390.0)
        elif resistor == 4:
            self.tpl0102[2].set_wiper(1, value)
            if value == 0: self.resistors[resistor] = 0
            else: self.resistors[resistor] = 0.0001 * (17800 + 1 / (1.0/18200 + 1.0/value/390.0))
        elif resistor == 5:
            self.tpl0102[3].set_wiper(0, value)
            self.resistors[resistor] = value * 0.021 - 2.02
        elif resistor == 6:
            self.tpl0102[4].set_wiper(0, value)
            self.resistors[resistor] = value * 0.0097
        self.resistors_raw[resistor] = value

    def get_resistor_value(self, resistor):
        return self.resistors[resistor]

    def get_resistor_value_raw(self, resistor):
        return self.resistors_raw[resistor]

    def get_resistor_name(self, resistor):
        return ["AUXRESET", "VCM", "DACEXTREF", "VDD_RST", "VRESET", "VCTRL", "AUXSAMPLE"][resistor]

    def get_resistor_units(self, resistor):
        return ["V", "V", "uA", "V", "V", "V", "V"][resistor]

    def get_power_good(self, i):
        return self.power_good[i]

    def get_clock_frequency(self):
        return self.clock_freq

    def set_clock_frequency(self, freq):
        self.clock_freq = freq
        self.si570.set_frequency(freq)

    def get_psu_enable(self):
        return self.psu_enabled

    def set_psu_enable(self, value):
        self.psu_enabled = value
        self.mcp23008[1].output(0, MCP23008.HIGH if value else MCP23008.LOW)

    def get_current(self, i):
        return self.currents[i]

    def get_current_raw(self, i):
        return self.currents_raw[i]

    def get_voltage(self, i):
        return self.voltages[i]

    def get_voltage_raw(self, i):
        return self.voltages_raw[i]

    def get_adc_name(self, i):
        return ["VDD0_D18", "VDD_D25", "VDD_D18_PLL", "VDDO", "VDD_D18ADC",
             "VDD_P18", "VDD_A18_PLL", "VDD_D33", "VDD_RST", "VRESET",
             "VDD_A33", "VCTRL_POS", "VCTRL_NEG"][i]
