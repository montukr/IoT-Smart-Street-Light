Run Commands-
backend raspi-server
ssh pi@raspi.local
cd /home/pi/mini-p/IoT-Smart-Street-Light-Server
source myenv/bin/activate
python app.py

frontend client
# Change the ip address of the raspberry pi in the client code StreetlightDashboard.jsx
cd client
npm run dev -- --host