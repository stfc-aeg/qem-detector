#!/bin/bash
#Run the Odin Server with the QEM Adapter
source venv2.7/bin/activate
cd odin-qem
odin_server --config config/qem.cfg
