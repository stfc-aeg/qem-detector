import time
from QemCam import *

class ASIC_Interface():

    def __init__(self):
        self.qemcamera = QemCam()
        self.image = "image1"
        self.qemcamera.connect()
        #increase ifg from minimum
        self.qemcamera.set_ifg()
        self.qemcamera.x10g_stream.check_trailer = True
        self.qemcamera.turn_rdma_debug_0n()
        self.qemcamera.set_10g_mtu('data', 7344)
        self.qemcamera.set_image_size_2(102,288,11,16)
        #set idelay in 1 of 32 80fs steps  - d1, d0, c1, c0
        self.qemcamera.set_idelay(0,0,0,0)
        time.sleep(1)
        # set sub cycle shift register delay in 1 of 8 data clock steps - d1, d0, c1, c0
        self.qemcamera.set_scsr(7,7,7,7)
        # set shift register delay in 1 of 16 divide by 8 clock steps - d1, d0, c1, c0
        self.qemcamera.set_ivsr(0,0,27,27)
        self.qemcamera.turn_rdma_debug_0ff()

#    def __del__(self):
#        del qemcamera

    def get_image(self):
        return unicode(self.image)

    def set_image_capture(self, value):
        self.image = value
        self.qemcamera.display_image_stream(100)
        #        self.qemcamera.log_image_stream('../log/',10)
        time.sleep(1)
        self.qemcamera.disconnect()

    def get_dac_value(self, dac):
        return dac

    def set_dac_value(self, dac, value):
        pass

    def get_dac_name(self, dac):
        return "name"

    def get_capture_run(self):
        return "run"

    def set_capture_run(self, value):
        pass

#        self.qemcamera.connect()
        #increase ifg from minimum
#        self.qemcamera.set_ifg()
#        self.qemcamera.x10g_stream.check_trailer = True
#        self.qemcamera.turn_rdma_debug_0n()
#        self.qemcamera.set_10g_mtu('data', 7344)
#        self.qemcamera.set_image_size_2(102,288,11,16)
        #set idelay in 1 of 32 80fs steps  - d1, d0, c1, c0
#        self.qemcamera.set_idelay(0,0,0,0)
#        time.sleep(1)
        # set sub cycle shift register delay in 1 of 8 data clock steps - d1, d0, c1, c0
#        self.qemcamera.set_scsr(7,7,7,7)
        # set shift register delay in 1 of 16 divide by 8 clock steps - d1, d0, c1, c0
#        self.qemcamera.set_ivsr(0,0,27,27)
#        self.qemcamera.turn_rdma_debug_0ff()
#        self.qemcamera.display_image_stream(100)
#        self.qemcamera.log_image_stream('../log/',10)
#        time.sleep(1)
#        self.qemcamera.disconnect()
