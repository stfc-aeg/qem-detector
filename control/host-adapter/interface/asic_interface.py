import time
import cv2
import sys
import pprint
import pickle
from QemCam import *

class ASIC_Interface():
    """ This class handles communication with the QEM ASIC through use of the QemCam module"""
    def __init__(self):
        self.imageStore = []
        """ Set up the ASIC as per QemCamTest """
        #Set up QEM sensor/camera
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
        self.vector_file = u'undefined'
        self.bias_dict = {}
        self.bias_names = ["iBiasPLL",# 010100
                            "iBiasLVDS",# 101101
                            "iBiasAmpLVDS",# 010000
                            "iBiasADC2",# 010100
                            "iBiasADC1",# 010100
                            "iBiasCalF",#  010010
                            "iFbiasN",#  011000
                            "vBiasCasc",#  100000
                            "iCbiasP",#  011010
                            "iBiasRef",#  001010
                            "iBiasCalC",#  001100
                            "iBiasADCbuffer",#  001100
                            "iBiasLoad",#  010100
                            "iBiasOutSF",#  011001
                            "iBiasSF1",#  001010
                            "iBiasPGA",#  001100
                            "vBiasPGA",#  000000
                            "iBiasSF0",#  000101
                            "iBiasCol"]#  001100

        self.init_bias_dict()
        self.update_bias = False
        self.updated_registers = [False] * 20


    def get_image(self):
        if len(self.imageStore) >0:
            img = self.imageStore.pop(0)
            cv2.imwrite('static/img/temp_image.png', img)
        return len(self.imageStore)

    def set_image_capture(self, value):
        self.imageStore = self.qemcamera.display_image_stream_web(value)

    def get_capture_run(self):
        return u'/aeg_sw/work/projects/qem/images/'

    def set_capture_run(self, config):
        fnumber, file_name = config.split(";")
        location = "/aeg_sw/work/projects/qem/images/" + str(file_name)
        self.qemcamera.log_image_stream(location, int(fnumber))

    def set_update_bias(self, update_bias):
       
        self.update_bias = update_bias

    def get_vector_file(self):
        return self.vector_file
    
    def set_vector_file(self, vector_file):

        self.vector_file = vector_file

        if self.update_bias == "true":
            self.extract_vector_data()

    def get_dac_value(self, dac):

        for key, value in self.bias_dict.iteritems():
            if value[0] == dac:
                return value[1]

    def set_dac_value(self, dac, value):

        this_value = value
        for key, value in self.bias_dict.iteritems():
            if value[0] == dac:
                self.updated_registers[dac] = True
                value[1] = this_value
        
        complete = True
        for reg in self.updated_registers:
            complete = reg

        if complete:
            self.change_dac_settings()

    def extract_vector_data(self):

        abs_path = "/aeg_sw/work/projects/qem/python/03052018/" + self.vector_file

        print(abs_path)
        #extract lines into array
        with open(abs_path, 'r') as f:
            data = f.readlines()
            init_length  = int(data[0])
            loop_length  = int(data[1])
            signal_names = data[2].split()

        #close file
        f.close()

        #define an empty array for clock references
        clk_ref = []

        #this latch signal is needed to prevent the following function from recording the position of all 0's.
        #in the column.  it only records the location of the first transition from 1 to 0 
        latch = '1'

        #find how many -ve clock edges and create a list of references
        for i in range(init_length):
            line = data[i+3].split()
            format_line = "%64s" % line[0]
  
            #this this is 41st (dacCLKin) or 22nd depending on what end is 0
            y = format_line[63-22] 
            #check if character is a 0
            if y == '0':
                #check if latch has been set
                if latch == '0':
                    # if not append to clk_ref[] and set latch
                    clk_ref.append(i+3)
                    latch = '1'
            #if y is not a 0 then it must be a 1, set latch back to 0
            else :
                latch = '0'

        #define an array base on number of clocks / references
        length = len(clk_ref)
        data_a = [0] * length

        #extract data from -ve clock refereces
        for i in range(length) :
            line = data[clk_ref[i]].split()
            format_line = "%64s" % line[0]
            y = format_line[63-20] #this this is 41 (dacCLKin) or 22 depending on what end is 0
            data_a[i]= y

        #print the output to the screen
        for i in range(19):
            print "%-20s%-10i %-5s%s%s%s%s%s%-4s %s%s%s%s%s%s" % (self.bias_names[18-i] ,i+1, clk_ref[i], data_a[i*6 + 0] ,data_a[i*6 + 1],data_a[i*6 + 2] ,data_a[i*6 + 3] ,data_a[i*6 + 4] ,data_a[i*6 + 5] ,data_a[i*6 + 114] ,data_a[i*6 +115],data_a[i*6 + 116] ,data_a[i*6 + 117] ,data_a[i*6 + 118] ,data_a[i*6 + 119])
            binary_string = data_a[i*6 + 0] + data_a[i*6 + 1] + data_a[i*6 + 2] + data_a[i*6 + 3] + data_a[i*6 + 4] + data_a[i*6 + 5] 
            self.bias_dict[self.bias_names[18-i]] = [i+1, binary_string]
        
        #define an array to build reference of clock position and value at that position
        l=[]
        #set i to 0
        i=0
        #build an array of references
        while i < length:
            l.append([clk_ref[i], data_a[i]])
            i+=1

        t = open ("tmp2.pkl", 'wb')
        pickle.dump(l, t)
        t.close()

    def init_bias_dict(self):

        for i in range(19):
            self.bias_dict[self.bias_names[18-i]] = [i+1, '000000']
    
    def change_dac_settings(self):

        # set filename
        file_name   = "tmp2.pkl"

        #print the file used
        print "%s %s\n" % ("pkl file used: ",file_name)

        # extract the data
        pkl_file = open(file_name, 'rb')
        new_data = pickle.load(pkl_file)

        #close file
        pkl_file.close()
        
        #define l as an array
        l=[]
        # set i = 0 and append l with the values in new_data
        i = 0
        while i < len(new_data):
            l.append([new_data[i][0], new_data[i][1]])
            i+=1

        print("The old settings\n")
        for i in range(19):
            print "%-20s%-10i %s%s%s%s%s%-4s %s%s%s%s%s%s" % (self.bias_names[18-i] ,i+1 ,new_data[i*6 + 0][1] ,new_data[i*6 + 1][1],new_data[i*6 + 2][1] ,new_data[i*6 + 3][1] ,new_data[i*6 + 4][1] ,new_data[i*6 + 5][1] ,new_data[i*6 + 114][1] ,new_data[i*6 +115][1],new_data[i*6 + 116][1] ,new_data[i*6 + 117][1] ,new_data[i*6 + 118][1] ,new_data[i*6 + 119][1])

        
        for i in range(19):
            #set the values passed to the function to internal variables
            reg = int(i+1)

            for key, data in self.bias_dict.iteritems():
                if data[0] == reg:
                    value = list(data[1])
                    #print(value)

            #value = list(value)
 
            # update variable l with the new values
            for i in range(6):
                l[((reg-1)*6)+i][1]=value[i]
                l[(((reg-1)+19)*6)+i][1]=value[i]

        print("\nThe new settings\n")
        for i in range(19):
	        print "%-20s%-10i %s%s%s%s%s%-4s %s%s%s%s%s%s" % (self.bias_names[18-i] ,i+1 ,l[i*6 + 0][1] ,l[i*6 + 1][1],l[i*6 + 2][1] ,l[i*6 + 3][1] ,l[i*6 + 4][1] ,l[i*6 + 5][1] ,l[i*6 + 114][1] ,l[i*6 +115][1],l[i*6 + 116][1] ,l[i*6 + 117][1] ,l[i*6 + 118][1] ,l[i*6 + 119][1])

        #save the new data
        t = open ("tmp3.pkl", 'wb')
        pickle.dump(l, t)
        t.close()
        
        #extract lines into array
        with open('/aeg_sw/work/projects/qem/python/03052018/QEM_D4_198_ADC_10_icbias28_ifbias14.txt', 'r') as f:
            data = f.readlines()
        f.close()

        length=len(data)

        #extract the data from tmp3.pkl (new settings)
        pkl_file = open('tmp3.pkl', 'rb')
        new_data = pickle.load(pkl_file)

        #close file
        pkl_file.close()

        #open a newfle with the orifional name appended with _mod.txt
        f=open("/aeg_sw/work/projects/qem/python/03052018/" + self.vector_file, 'w')

        #write the first three lines, don't change!!
        f.write(data[0]) #
        f.write(data[1])
        f.write(data[2])
        k=len(new_data) # assign k to the length of the new data array
        j=0   		# number used to increment through the new_data array
        m=0   		# number that increments by o after changing the lines
        n=5  		# change number of lines before -ve clock edge
        p=3  		# number of lines to change from to new value after the -ve clock edge
        o=n+1+p  	# total number of lines to change from 'n' to new value, default is 1 extra + p

        for i in range((length-3)-(k*(o-1))):
            if (j < k) : 			# if array increment value of new data is less than k (length of new data) do this, else just write the line to file
                if((i+m+n) == new_data[j][0]):  # looking forward by n, if the line number is equal to the first elemnt of array do this, else just write data to the file
                    for l in range(o):	        # do this for the next 'o' number of lines
                        line = data[(i+m+l+3)]  # extract line from origional file
                        f.write(line[0:43]) 	# write up to the reference point
                        f.write(new_data[j][1]) # add new data from the file
                        f.write(line[44:]) 	# add the rest of the origional line
                    j=j+1
                    m=m+(o-1)
                else:	
                    f.write(data[i+m+3])
            else:	
                f.write(data[i+m+3])
        f.close()
        print("\nNew file has been created, check folder")