module.exports = function (RED) {
    var https = require("https");

    function BuienradarNode(config) {
        RED.nodes.createNode(this, config);

        var node = this;
        node.interval_id = null;

        if (config.interval) {
            node.interval = config.interval;
        }

        if (config.station) {
            node.station = config.station;
        }

        if (config.forecast) {
            node.forecast = config.forecast;
        }

        if (node.interval != "manual") {
            this.interval_id = setInterval(function () {
                node.emit("input", {});
            }, node.interval);
        }

        this.on('input', function (msg) {
            buienradarPoll(node, msg, function (err) {
                node.send(msg);
            });
        });

        this.on("close", function () {
            if (this.interval_id !== null) {
                clearInterval(this.interval_id);
            }
        });

        node.emit("input", {});
    }

    function buienradarPoll(node, msg, callback) {
        //wipe clear the payload if it exists, or create it if it doesn't
        msg.payload = {};
        msg.payload.buienradar = {};

        if (node.forecast) {
            msg.payload.buienradar.verwachtingMeerdaags = {};
            msg.payload.buienradar.verwachtingVandaag = {};
        }

        node.status({ fill: "blue", shape: "dot", text: "Ophalen weergegevens" });

        var options = {
            host: 'data.buienradar.nl',
            path: '/2.0/feed/json',
            headers: { 'User-Agent': 'request' }
        };

        https.get(options, function (res) {
            var json = '';
            res.on('data', function (chunk) {
                json += chunk;
            });
            res.on('end', function () {
                if (res.statusCode === 200) {
                    try {
                        var data = JSON.parse(json);
                        processResponse(node, msg, data);
                        node.status({});
                        callback();
                    } catch (e) {
                        node.status({ fill: "red", shape: "dot", text: "Error parsing: " + e });
                    }
                } else {
                    node.status({ fill: "red", shape: "dot", text: "Error response: " + res.statusCode });
                    callback("Error response: " + res.statusCode);
                }
            });
        }).on('error', function (err) {
            node.status({ fill: "red", shape: "dot", text: "Fout:" + err });
            callback(err);
        });
    }

    function processResponse(node, msg, buienradarResponse) {
        var actualWeather = buienradarResponse.actual;

        msg.payload.buienradar.sunrise = actualWeather.sunrise;
        msg.payload.buienradar.sunset = actualWeather.sunset;
        msg.payload.buienradar.radarurl = actualWeather.actualradarurl;

        try {
            var station = actualWeather.stationmeasurements.find(measurement => measurement.stationid == node.station);
            if (station != null) {
                msg.payload.buienradar.stationcode = station.stationid;
                msg.payload.buienradar.stationnaam = station.stationname;
                msg.payload.buienradar.temperatuurGC = station.temperature;
                msg.payload.buienradar.windsnelheidBF = station.windspeedBft;
                msg.payload.buienradar.luchtvochtigheid = station.humidity;
                msg.payload.buienradar.datum = station.timestamp;
                msg.payload.buienradar.zichtmeters = station.visibility;
                msg.payload.buienradar.icoonactueel = station.iconurl;
                msg.payload.buienradar.icoonzin = station.weatherdescription;
                msg.payload.buienradar.regenMMPU = station.rainFallLastHour;
                msg.payload.buienradar.regenMM24U = station.rainFallLast24Hour;
                msg.payload.buienradar.luchtdruk = station.airpressure;
                msg.payload.buienradar.windrichtingGR = station.winddirectiondegrees;
                msg.payload.buienradar.zonintensiteitWM2 = station.sunpower;
                msg.payload.buienradar.windsnelheidMS = station.windspeed;
                msg.payload.buienradar.windstotenMS = station.windgusts;

                var weerVandaag = buienradarResponse.forecast.weatherreport;
                if (weerVandaag != null) {
                    msg.payload.buienradar.verwachtingVandaag = {};
                    msg.payload.buienradar.verwachtingVandaag.titel = weerVandaag.title;
                    msg.payload.buienradar.verwachtingVandaag.tijdweerbericht = weerVandaag.published;
                    msg.payload.buienradar.verwachtingVandaag.samenvatting = weerVandaag.summary;
                    msg.payload.buienradar.verwachtingVandaag.tekst = weerVandaag.text;
                }

                addDeprecatedFields(node, msg);

                if (node.forecast) {
                    process5DayForecast(node, msg, buienradarResponse);
                }
            } else {
                node.log("Unable to find station : " + err);
            }
        } catch (err) {
            node.log("Error: " + err);
        }
    }

    function process5DayForecast(node, msg, buienradarResponse) {
        var verwachtingMeerdaagse = buienradarResponse.forecast.fivedayforecast;

        if (verwachtingMeerdaagse != null) {
            for (var i = 0; i < verwachtingMeerdaagse.length; i++) {
                msg.payload.buienradar.verwachtingMeerdaags[i] = {};

                var verwachtingDag = verwachtingMeerdaagse[i];
                msg.payload.buienradar.verwachtingMeerdaags[i].datum = verwachtingDag.day;
                msg.payload.buienradar.verwachtingMeerdaags[i].dagweek = "VELD_VERVALLEN";
                msg.payload.buienradar.verwachtingMeerdaags[i].kanszon = verwachtingDag.sunChance;
                msg.payload.buienradar.verwachtingMeerdaags[i].kansregen = verwachtingDag.rainChance;
                msg.payload.buienradar.verwachtingMeerdaags[i].minmmregen = verwachtingDag.mmRainMin;
                msg.payload.buienradar.verwachtingMeerdaags[i].maxmmregen = verwachtingDag.mmRainMax;
                msg.payload.buienradar.verwachtingMeerdaags[i].mintemp = verwachtingDag.mintemperatureMin;
                msg.payload.buienradar.verwachtingMeerdaags[i].mintempmax = verwachtingDag.mintemperatureMax;
                msg.payload.buienradar.verwachtingMeerdaags[i].maxtemp = verwachtingDag.maxtemperatureMin;
                msg.payload.buienradar.verwachtingMeerdaags[i].maxtempmax = verwachtingDag.maxtemperatureMax;
                msg.payload.buienradar.verwachtingMeerdaags[i].windrichting = verwachtingDag.windDirection;
                msg.payload.buienradar.verwachtingMeerdaags[i].windkracht = verwachtingDag.wind;
                msg.payload.buienradar.verwachtingMeerdaags[i].icoon = verwachtingDag.iconurl;
                msg.payload.buienradar.verwachtingMeerdaags[i].omschrijving = verwachtingDag.weatherdescription;
            }
        }
    }

    function addDeprecatedFields(node, msg) {
        msg.payload.buienradar.verwachtingVandaag.url = "VELD_VERVALLEN";
        msg.payload.buienradar.verwachtingVandaag.formattedtekst = "VELD_VERVALLEN";
        
        if (node.forecast) {
            msg.payload.buienradar.verwachtingMeerdaags.url = "VELD_VERVALLEN";
            msg.payload.buienradar.verwachtingMeerdaags.tekstMiddelLang = {};
            msg.payload.buienradar.verwachtingMeerdaags.tekstMiddelLang.titel = "VELD_VERVALLEN";
            msg.payload.buienradar.verwachtingMeerdaags.tekstMiddelLang.beschrijving = "VELD_VERVALLEN";
        }
    }

    RED.nodes.registerType("buienradar", BuienradarNode);
}
