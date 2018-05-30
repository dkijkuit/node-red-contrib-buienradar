node-red-contrib-buienradar
============================

A <a href="http://nodered.org" target="_new">Node-RED</a> node that gets the
weather from buienradar.nl.

Install
-------

Run the following command in the root directory of your Node-RED install

        npm install node-red-contrib-buienradar

Usage
-----

Only one node with an input/output is available. More to come in near future. Only use this for personal use. This node depends on the data from buienradar.nl, for commercial use of their service please contact them directly. I am not related to buienradar.nl in any way.


### Buienradar Node

Fetches the current weather for the selected weather station and polls it for the specified interval.
Outputs a **msg.payload.buienradar** object which holds all the data.

### Results

Current conditions will return

- **stationcode** - unique station code which corresponds to a weather station
- **stationnaam** - the weather station name
- **temperatuurGC** - temperature in degrees celsius
- **windsnelheidBF** - windspeed in beaufort
- **luchtvochtigheid** - humidity in percentage
- **datum** - the datetime of the measurement
- **zichtmeters** - sight in meters
- **icoonactueel** - an URL to the current weather icon
- **icoonzin** - short description of the current weather
- **regenMMPU** - rain in millimeters per hour
- **luchtdruk** - air pressure
- **windrichtingGR** - wind direction in degrees
- **windrichting** - wind direction
- **zonintensiteitWM2** - sun intensity in watt per square meter
- **windsnelheidMS** - wind speed in meters per second
- **windstotenMS** - winds in meters per second

Weather data provided by <a href="http://www.buienradar.nl/" target="_blank">Buienradar</a>
