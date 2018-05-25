from backplane_interface import Backplane_Interface
from asic_interface import ASIC_Interface
from odin.adapters.metadata_tree import MetadataTree

class CurrentVoltage(object):
    def __init__(self, backplane_interface, i):
        self.index = i
        self.backplane_interface = backplane_interface

        self.param_tree = MetadataTree({
            "name" : self.backplane_interface.get_adc_name(i),
            "current" : (self.get_current, {"units" : "mA"}),
            "voltage" : (self.get_voltage, {"units" : "V", "dp":3}),
        })

    def get_current(self):
        return self.backplane_interface.get_current(self.index)

    def get_voltage(self):
        return self.backplane_interface.get_voltage(self.index)

class Resistor(object):
    def __init__(self, backplane_interface, i):
        self.index = i
        self.backplane_interface = backplane_interface

        self.param_tree = MetadataTree({
            "name" : self.backplane_interface.get_resistor_name(self.index),
            "resistance" : (self.get, self.set, {"units" : self.backplane_interface.get_resistor_units(self.index), "min" : self.backplane_interface.get_resistor_min(self.index), "max" : self.backplane_interface.get_resistor_max(self.index)}),
       })

    def get(self):
        return self.backplane_interface.get_resistor_value(self.index)

    def set(self, value):
        self.backplane_interface.set_resistor_value(self.index, value)


class DAC(object):
    def __init__(self, asic_interface, i):
        self.index = i
        self.asic_interface = asic_interface

        self.param_tree = MetadataTree({
            "name" : self.asic_interface.get_dac_name(self.index),
            "value" : (self.get, self.set),
       })

    def get(self):
        return self.asic_interface.get_dac_value(self.index)

    def set(self, value):
        self.asic_interface.set_dac_value(self.index, value)

class InterfaceData(object):

    def __init__(self):
        self.backplane_interface = Backplane_Interface()
        self.asic_interface = ASIC_Interface()

        self.current_voltage = []
        for i in range(13):
            self.current_voltage.append(CurrentVoltage(self.backplane_interface, i))

        self.resistors = []
        for i in range(7):
            self.resistors.append(Resistor(self.backplane_interface, i))

        self.dacs = []
        for i in range(19):
            self.dacs.append(DAC(self.asic_interface, i))

        self.param_tree = MetadataTree({
            "name" : "QEM Interface",
            "description" : " ",

            #Backplane
            "clock" : (self.backplane_interface.get_clock_frequency, self.backplane_interface.set_clock_frequency, {"units" : "MHz", "description" : "Clock frequency for the SI570 oscillator", "min" : 10, "max":945}),
            "sensors_enabled":(self.backplane_interface.get_sensors_enable, self.backplane_interface.set_sensors_enable, {"name" : "sensors updating"}),
            "update_required" : (self.backplane_interface.get_update, self.backplane_interface.set_update,{"name" : "Update Once"}),
            "non_volatile" : (self.backplane_interface.get_resistor_non_volatile, self.backplane_interface.set_resistor_non_volatile, {"name": "Set Defaults", "description":"When setting resistor values determines if the new value should be set as a temporary value or as the new default"}),
            "reset" : (u'False', self.backplane_interface.set_reset,{"name" : "Reset Backplane"}),

            "current_voltage" : [cv.param_tree for cv in self.current_voltage],
            "resistors" : [r.param_tree for r in self.resistors],

            #ASIC
            "image" : (self.asic_interface.get_image, self.asic_interface.set_image_capture),
            "capture_run": (self.asic_interface.get_capture_run, self.asic_interface.set_capture_run, {"name": "Capture Run"}),

            "dacs" : [d.param_tree for d in self.dacs],

            #ASIC and Backplane
            #"configuration_run": (self.asic_interface.get_configuration_run, self.asic_interface.set_configuration_run)
        })

    def get(self, path, metadata):
        return self.param_tree.get(path, metadata=metadata)

    def set(self, path, value):
        self.param_tree.set(path, value)
