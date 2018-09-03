import time
import cv2
import sys
import pprint
import pickle
import h5py
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator
import glob, os
from QemCam import *

class ASIC_Interface():
    """ This class handles communication with the QEM ASIC through use of the QemCam module"""
    def __init__(self, backplane):
        self.imageStore = []
        self.backplane = backplane
        self.adc_delay = 0
        self.adc_frames = 1
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
        self.fine_calibration_complete = False
        self.coarse_calibration_complete = False


    def setup_camera(self):
        """
        Configures the QemCamera object associated with the asic interface
        """

        self.qemcamera.set_ifg()
        self.qemcamera.x10g_stream.check_trailer = True
        self.qemcamera.set_clock()
        self.qemcamera.turn_rdma_debug_0ff()
        self.qemcamera.set_10g_mtu('data', 8000)
        self.qemcamera.x10g_rdma.read(0x0000000C, '10G_0 MTU')
        # N.B. for scrambled data 10, 11, 12, 13 bit raw=> column size 360, 396
        self.qemcamera.set_10g_mtu('data', 7344)
        self.qemcamera.set_image_size_2(102,288,11,16)
        print self.qemcamera.x10g_stream.num_pkt
        #set idelay in 1 of 32 80fs steps  - d1, d0, c1, c0
        self.qemcamera.set_idelay(0,0,0,0)
        time.sleep(1)
        locked = self.qemcamera.get_idelay_lock_status()
        # set sub cycle shift register delay in 1 of 8 data clock steps - d1, d0, c1, c0
        # set shift register delay in 1 of 16 divide by 8 clock steps - d1, d0, c1, c0
        #
        # Shift 72 + 144 bits
        self.qemcamera.set_scsr(7,7,7,7)		# sub-cycle (1 bit)
        self.qemcamera.set_ivsr(0,0,27,27)		# cycle (8 bits)

    def get_image(self):
        """ getter for the latest image generated by the QemCam
        writes the latest image to static/img/temp_img for the front-end
        to get.
        @returns : the length of the imagestore
        """
        if len(self.imageStore) >0:
            img = self.imageStore.pop(0)
            cv2.imwrite('static/img/temp_image.png', img)
        return len(self.imageStore)

    def set_image_capture(self, value):
        """ populates the imageStore with 'value' number of images from the QemCam
        @param value: number of images to capture
        """
        self.imageStore = self.qemcamera.display_image_stream_web(value)

    def get_capture_run(self):
        return u'/aeg_sw/work/projects/qem/images/'

    def set_capture_run(self, config):
        """ set up and log n number of images to a specified directory.
        @param config: configuration string containing the frame num and file location
        sets up the qemcam object and parses the frame num/file location
        calls log_imgage_stream to capture and store fnumber of frames.ss
        """
        fnumber, file_name = config.split(";")
        location = str(file_name) #"/aeg_sw/work/projects/qem/images/" + str(file_name)
        self.setup_camera()
        time.sleep(0.1)
        self.qemcamera.get_aligner_status()
        locked = self.qemcamera.get_idelay_lock_status()
        print "%-32s %-8X" % ('-> idelay locked:', locked)

        self.qemcamera.log_image_stream(location, int(fnumber))

    def set_update_bias(self, update_bias):
        """ Sets the update_bias flag. Flag is used to control when to
            extract bias data from the vector file. When setting the vector
            file in order to create a new vector file, the flag is set to false
            stopping the empty file data from trying to be extracted

        @param update_bias: boolean value to indicate whether to 
                            extract the vector data from the file
        """
        self.update_bias = update_bias

    def get_vector_file(self):
        """ gets the current vector filename being used.

        @returns : self.vector file, the filename of the current vector file
        """
        return self.vector_file
    
    def set_vector_file(self, vector_file):
        """ sets the vector file name
            If the file name has not got a .txt extension
            one is added. If self.update_bias is true, 
            extract_vector_data is called.

        @param vector_file: string name of the vector file
        """
        self.vector_file = vector_file

        if self.update_bias == "true":
            self.extract_vector_data()

    def get_dac_value(self, dac):
        """ gets the dac value for the index provided.

        @param dac: index number to identify the dac
        """

        for key, value in self.bias_dict.iteritems():
            if value[0] == dac:
                return value[1]

    def set_dac_value(self, dac, value):
        """ sets the dac value for the index provided.
            Checks whether all dac values have been set,
            when all have been set the dac settings are 
            written to a new vector file.

        @param dac : index number to identify the dac
        @ param value: the string value to set
        """
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
        """ extracts the 19 dac register values from the vector file
        saves the settings to a temporary pkl file for manipulation later.
        """
        
        abs_path = "/aeg_sw/work/projects/qem/python/03052018/" + self.vector_file
        
        ### Adam Davis Code ###
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
            #print "%-20s%-10i %-5s%s%s%s%s%s%-4s %s%s%s%s%s%s" % (self.bias_names[18-i] ,i+1, clk_ref[i], data_a[i*6 + 0] ,data_a[i*6 + 1],data_a[i*6 + 2] ,data_a[i*6 + 3] ,data_a[i*6 + 4] ,data_a[i*6 + 5] ,data_a[i*6 + 114] ,data_a[i*6 +115],data_a[i*6 + 116] ,data_a[i*6 + 117] ,data_a[i*6 + 118] ,data_a[i*6 + 119])
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
        ### End of Adam Davis Code ###

    def init_bias_dict(self):
        """ initialises the bias_dict holding the bias settings 
            for each 19 dac's along with their index and name.
        """

        for i in range(19):
            self.bias_dict[self.bias_names[18-i]] = [i+1, '000000']
    
    def change_dac_settings(self):
        """ generates a new vector file from the updated bias settings
            Creates a new file with the name of self.vector_file.
        """
        if self.vector_file is "undefined":
            print("no vector file has been loaded, cannot update vector file")
        
        else:
        ### Adam Davis Code ###

            # set filename
            file_name   = "tmp2.pkl"

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
        ### End of Adam Davis Code ###

    def upload_vector_file(self, upload):
        """ uploads the current vector file to the qem camera

        @param uplaod: boolean value when true- the file is uploaded
        """
        abs_path = "/aeg_sw/work/projects/qem/python/03052018/" + self.vector_file
        if upload:
            if self.vector_file is not "undefined":
                
                self.setup_camera()
                self.qemcamera.load_vectors_from_file(abs_path)
                time.sleep(0.1)
                self.qemcamera.get_aligner_status()
                locked = self.qemcamera.get_idelay_lock_status()
                print "%-32s %-8X" % ('-> idelay locked:', locked)
                time.sleep(1)
            else:
                #manage exceptions and errors
                print("No vector file has been loaded, cannot upload vector file")

    def get_coarse_cal_complete(self):
        """ getter method for the coarse calibration completed flag
        @Returns : boolean value to indicate whether the coarse calibration has completed.
        """
        return self.coarse_calibration_complete

    def set_coarse_cal_complete(self, complete):
        """ sets the coarse calibration complete flag 
        @param complete: boolean value to indicate whether the coarse calibration is complete.
        """
        self.coarse_calibration_complete = complete

    def get_fine_cal_complete(self):
        """ getter method for the fine calibration completed flag
        @Returns : boolean value to indicate whether the fine calibration has completed.
        """
        return self.coarse_calibration_complete

    def set_fine_cal_complete(self, complete):
        """ sets the fine calibration complete flag 
        @param complete: boolean value to indicate whether the fine calibration is complete.
        """
        self.fine_calibration_complete = complete

    
    def getfinebitscolumn(self, input):
        """ extracts the fine data bits from the given H5 file.
        @param input: the h5 file to extract the fine bits from.
        @returns fine_data: an array storing the fine bits.
        """
        fine_data = []
        for i in input:
            for j in i:
                fine_data.append((j[33]&63)) # extract the fine bits
        return fine_data

    def generatevoltages(self, length):
        """ generates the voltages for a given length
        @param length: the length to use to generate voltages.
        @returns : an array of voltages
        """
        voltages=[]
        for i in range(length):
            voltages.append(float(1 + (i * 0.00008)))
        return voltages

    def getcoarsebitscolumn(self, input):
        """ extracts the coarse bits for a column for a single adc
        @param input : the h5 file to extract the data from
        @returns : a list of the coarse bits.
        """
        new_list = []
        for i in input:
            for j in i:
                new_list.append((j[33]&1984)>>1) # extract the coarse bits
        return new_list

    def Listh5Files(self, adc_type):
        """ lists all of the H5 files for a given adc cal type in /scratch/qem
        sorts the found files to numerical ascending order.
        @param adc_type : string value - fine/coarse
        @returns : the list of filenames found
        """
        filenames=[]
        for file in glob.glob("/scratch/qem/" + adc_type + "/*.h5"):
            filenames.append(file)
        filenames.sort()
        return filenames

    def generatecoarsevoltages(self, length):
        """ generates the coarse voltages for a given length
        @param length: the length to use for generating the voltages
        @returns: the list of coarse voltages
        """
        voltages=[]
        for i in range(length):
            voltages.append(float(0.3428 + (i * 0.00153)))
        return voltages

    def set_adc_frames(self, frames):
        """ sets the number of frames to use during adc calibration
        @param frames : the number of frames to take during adc calibration
        """
        self.adc_frames = frames

    def set_adc_delay(self, delay):
        """ sets the delay in ms to use during adc calibration
        @param delay: number of ms to wait before taking frames during adc cal
        """
        self.adc_delay = delay

    def get_adc_delay(self):
        """ gets the delay value to be used during adc calibration
        @returns : the delay value.
        """
        return self.adc_delay

    def get_adc_frames(self):
        """ gets the number of frames to use during adc calibrations
        @returns adc_frames: the number of frames to take.
        """
        return self.adc_frames

    def adc_calibrate_coarse(self, calibrate):
        """ perform adc calibration of the coarse values
        @param calibrate: boolean value to trigger calibration
        gets the adc delay value and adc frame value before setting up
        the qemcam. Performs adc calibration sweep from 0-1023 taking images
        and storing them in /scratch/qem/coarse
        calls plotcoarse and sets calibration coarse complete to true when finished.
        """

        delay = self.get_adc_delay()
        frames = self.get_adc_frames()
        if calibrate == "true":
            self.set_coarse_cal_complete(False)
            self.setup_camera()
            
            time.sleep(0.1)
            self.qemcamera.get_aligner_status()
            locked = self.qemcamera.get_idelay_lock_status()
            print "%-32s %-8X" % ('-> idelay locked:', locked)
            print "%-32s" % ('-> Calibration started ...')

            #define number of sweep
            n=1024
            #define i and the starting point of the capture
            i=0
            self.backplane.set_resistor_register(6, 0) #setting AUXSAMPLE FINE to 0
  
            # MAIN loop to capture data
            while i < n:
                #set AUXSAMPLE_COARSE to i
                self.backplane.set_resistor_register(7, i)
                #delay 0 seconds (default) or by number passed to the function
                time.sleep(delay)
                #Save the captured data to here using RAH function
                self.qemcamera.log_image_stream('/scratch/qem/coarse/adc_cal_AUXSAMPLE_COARSE_%04d' %i, frames)
                #increment i
                i=i+1
        
            time.sleep(1)
            self.plot_coarse()
            self.set_coarse_cal_complete(True)
   

    def adc_calibrate_fine(self, calibrate):
        """ perform adc calibration of the fine values
        @param calibrate: boolean value to trigger calibration
        gets the adc delay value and adc frame value before setting up
        the qemcam. Performs adc calibration sweep from 0-1023 taking images
        and storing them in /scratch/qem/fine
        calls pltofine and sets calibration fine complete to true when finished.
        """
        delay = self.get_adc_delay()
        frames = self.get_adc_frames()
        if calibrate == "true":

            print(delay)
            print(frames)
            self.set_fine_cal_complete(False)
            self.setup_camera() 

            time.sleep(0.1)
            self.qemcamera.get_aligner_status()
            locked = self.qemcamera.get_idelay_lock_status()
            print "%-32s %-8X" % ('-> idelay locked:', locked)
            print "%-32s" % ('-> Calibration started ...')

            #define the number of loops for the adc calibration
            n=1024
            #define i and the staring point
            i=0
            #set the default starting point for the COARSE value
            self.backplane.set_resistor_register(7, 435)

            #main loop to capture the data
            while i < n:
                #set the the AUXSAMPLE_FINE resistor to i
                self.backplane.set_resistor_register(6, i)
                #delay by 0 (default) or by the number passed to the function
                time.sleep(delay)
                #capture the data from the stream using rah function
                self.qemcamera.log_image_stream('/scratch/qem/fine/adc_cal_AUXSAMPLE_FINE_%04d' %i, frames)
                i=i+1
            # end of main loop 

            # wait for 1 second
            time.sleep(1)
            self.plot_fine()
            self.set_fine_cal_complete(True)

    def plot_fine(self):
        """ plots the fine bit data from the adc fine calibration onto a graph

        lists all of the h5 files for fine calibration and generates
        voltages and average fine data, plots the results onto a plot, using
        a new set of axes each time to ensure no overwriting.Saves the file to
        /aeg_sw/work/projects/qem/python/03052018/fine.png
        """

        filelist=[]
        filelist = self.Listh5Files("fine")
        # voltages for the plot
        f_voltages = []
        f_voltages = self.generatevoltages(len(filelist))
        # averaged data for the plot 
        f_averages = []

        # extract the data from each file in the folder
        for i in filelist:
            #open the file in the filelist array
            f=h5py.File(i, 'r')
            #extract the data key from the file
            a_group_key = list(f.keys())[0]
            #get the data
            data = list(f[a_group_key])
            #get data for column
            column = self.getfinebitscolumn(data)
            #average the column data
            average = sum(column) / len(column)
            #add the averaged data to the averages[] array
            f_averages.append(average)
            #close the file
            f.close()

        #generate the x / y plot of the data collected
        fig = plt.figure()
        ax = fig.add_subplot(1, 1, 1)
        ax.plot(f_voltages, f_averages, '-')
        ax.grid(True)
        ax.set_xlabel('Voltage')
        ax.set_ylabel('fine value')
        fig.savefig("/aeg_sw/work/projects/qem/python/03052018/fine.png", dpi = 100)
        fig.clf()

    def plot_coarse(self):
        """ plots the coarse bit data from the adc coarse calibration onto a graph

        lists all of the h5 files for coarse calibration and generates
        voltages and average coarse data, plots the results onto a plot, using
        a new set of axes each time to ensure no overwriting.Saves the file to
        /aeg_sw/work/projects/qem/python/03052018/coarse.png
        """

        filelist=[]
        #array of voltages for the plot
        voltages = []
        #array of column averages for the plot
        averages = []
        #generate a list of files to process
        filelist = self.Listh5Files("coarse")
        #populate the voltage array
        voltages = self.generatecoarsevoltages(len(filelist))

        #process the files in filelist
        for i in filelist:
            f=h5py.File(i, 'r')
            a_group_key = list(f.keys())[0]
            data = list(f[a_group_key])
            column = self.getcoarsebitscolumn(data)
            #average the data
            average = sum(column) / len(column)
            averages.append(average)
            f.close()

        #generate and plot the graph
        fig = plt.figure()
        ax = fig.add_subplot(1, 1, 1)
        ax.plot(voltages, averages, '-')
        ax.grid(True)
        ax.set_xlabel('Voltage')
        ax.set_ylabel('coarse value')
        fig.savefig("/aeg_sw/work/projects/qem/python/03052018/coarse.png", dpi = 100)
        fig.clf()
 
    def get_coarse_graph(self):
        """ gets the coarse plot png from /aeg_sw/...etc saves to static 
        for the webpage to be able to view the graph
        """
        coarse_img = plt.imread("/aeg_sw/work/projects/qem/python/03052018/coarse.png")
        plt.imsave('static/img/coarse_graph.png', coarse_img)

    def get_fine_graph(self):
        """ gets the fine plot png from /aeg_sw/...etc saves to static 
        for the webpage to be able to view the graph
        """
        img = plt.imread("/aeg_sw/work/projects/qem/python/03052018/fine.png")
        plt.imsave('static/img/fine_graph.png', img)