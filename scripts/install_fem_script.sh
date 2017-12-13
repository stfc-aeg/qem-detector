#!/bin/bash
#Setup the Odin Server with QEM adapter to run as a service

#Switch to a virtual environment
su -
virtualenv --system-site-packages venv2.7
source venv2.7/bin/activate

#Install the adapter and server
git config --global http.sslVerify false
git clone https://github.com/BenCEdwards/odin-control
git config --global http.sslVerify true
cd odin-qem
python fem_setup.py install
cd ../odin-control
python setup.py install

#Setup the script to run the server
cd ..
mkdir bin
cp odin-qem/scripts/QEM.sh bin
