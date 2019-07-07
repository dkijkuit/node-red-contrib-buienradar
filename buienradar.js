module.exports = function (RED) {
    var xpath = require("xpath");
    var xmldom = require("xmldom").DOMParser;
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

        //node.log("Buienradar station set to: "+node.station+", config: "+config.station);

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

        //node.log("Requesting buienradar update ...");

        var url = "https://data.buienradar.nl/1.0/feed/xml";
        if (url) {
            node.status({ fill: "blue", shape: "dot", text: "Ophalen weergegevens" });
            var req = https.get(url, function (res) {
                // save the data
                var xml = '';
                res.on('data', function (chunk) {
                    xml += chunk;
                });

                res.on('end', function () {
                    if (xml != null && xml.length > 0) {
                        var doc = new xmldom().parseFromString(xml)
                        var nodes = xpath.select("//weerstation[@id=\"" + node.station + "\"]", doc);

                        if (nodes != null && nodes.length > 0) {
                            var childNodes = nodes[0].childNodes;

                            for (var i = 0; i < childNodes.length; i++) {
                                var childNode = childNodes[i];
                                switch (childNode.localName) {
                                    case "stationcode":
                                        msg.payload.buienradar.stationcode = childNode.firstChild.data;
                                        break;
                                    case "stationnaam":
                                        msg.payload.buienradar.stationnaam = childNode.firstChild.data;
                                        break;
                                    case "temperatuurGC":
                                        msg.payload.buienradar.temperatuurGC = childNode.firstChild.data;
                                        break;
                                    case "windsnelheidBF":
                                        msg.payload.buienradar.windsnelheidBF = childNode.firstChild.data;
                                        break;
                                    case "luchtvochtigheid":
                                        msg.payload.buienradar.luchtvochtigheid = childNode.firstChild.data;
                                        break;
                                    case "datum":
                                        msg.payload.buienradar.datum = childNode.firstChild.data;
                                        break;
                                    case "zichtmeters":
                                        msg.payload.buienradar.zichtmeters = childNode.firstChild.data;
                                        break;
                                    case "icoonactueel":
                                        msg.payload.buienradar.icoonactueel = childNode.firstChild.data;
                                        msg.payload.buienradar.icoonzin = childNode.getAttribute('zin');
                                        break;
                                    case "regenMMPU":
                                        msg.payload.buienradar.regenMMPU = childNode.firstChild.data;
                                        break;
                                    case "luchtdruk":
                                        msg.payload.buienradar.luchtdruk = childNode.firstChild.data;
                                        break;
                                    case "windrichtingGR":
                                        msg.payload.buienradar.windrichtingGR = childNode.firstChild.data;
                                        break;
                                    case "windrichting":
                                        msg.payload.buienradar.windrichting = childNode.firstChild.data;
                                        break;
                                    case "zonintensiteitWM2":
                                        msg.payload.buienradar.zonintensiteitWM2 = childNode.firstChild.data;
                                        break;
                                    case "windsnelheidMS":
                                        msg.payload.buienradar.windsnelheidMS = childNode.firstChild.data;
                                        break;
                                    case "windstotenMS":
                                        msg.payload.buienradar.windstotenMS = childNode.firstChild.data;
                                        break;
                                    default:
                                        break;
                                }
                            }

                            if (node.forecast) {
                                nodes = xpath.select("//verwachting_meerdaags", doc);

                                if (nodes != null && nodes.length > 0) {
                                    var childNodes = nodes[0].childNodes;

                                    for (var i = 0; i < childNodes.length; i++) {
                                        var childNode = childNodes[i];
                                        if (childNode != null) {
                                            switch (childNode.localName) {
                                                case "url":
                                                    msg.payload.buienradar.verwachtingMeerdaags.url = childNode.data;
                                                    break;
                                                case "tekst_middellang":
                                                    msg.payload.buienradar.verwachtingMeerdaags.tekstMiddelLang = {};
                                                    msg.payload.buienradar.verwachtingMeerdaags.tekstMiddelLang.titel = childNode.getAttribute("periode");
                                                    msg.payload.buienradar.verwachtingMeerdaags.tekstMiddelLang.beschrijving = childNode.firstChild.data;
                                                    break;
                                                case "dag-plus1":
                                                case "dag-plus2":
                                                case "dag-plus3":
                                                case "dag-plus4":
                                                case "dag-plus5":
                                                    var dayNo = "dag" + childNode.localName.substring(8);
                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo] = {};

                                                    for (var j = 0; j < childNode.childNodes.length; j++) {
                                                        var forecastChildNode = childNode.childNodes[j];
                                                        if (forecastChildNode.localName != null) {
                                                            switch (forecastChildNode.localName) {
                                                                case "datum":
                                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo].datum = forecastChildNode.firstChild.data;
                                                                    break;
                                                                case "dagweek":
                                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo].dagweek = forecastChildNode.firstChild.data;
                                                                    break;
                                                                case "kanszon":
                                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo].kanszon = forecastChildNode.firstChild.data;
                                                                    break;
                                                                case "kansregen":
                                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo].kansregen = forecastChildNode.firstChild.data;
                                                                    break;
                                                                case "minmmregen":
                                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo].minmmregen = forecastChildNode.firstChild.data;
                                                                    break;
                                                                case "maxmmregen":
                                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo].maxmmregen = forecastChildNode.firstChild.data;
                                                                    break;
                                                                case "mintemp":
                                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo].mintemp = forecastChildNode.firstChild.data;
                                                                    break;
                                                                case "mintempmax":
                                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo].mintempmax = forecastChildNode.firstChild.data;
                                                                    break;
                                                                case "maxtemp":
                                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo].maxtemp = forecastChildNode.firstChild.data;
                                                                    break;
                                                                case "maxtempmax":
                                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo].maxtempmax = forecastChildNode.firstChild.data;
                                                                    break;
                                                                case "windrichting":
                                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo].windrichting = forecastChildNode.firstChild.data;
                                                                    break;
                                                                case "windkracht":
                                                                    msg.payload.buienradar.verwachtingMeerdaags[dayNo].windkracht = forecastChildNode.firstChild.data;
                                                                    break;
                                                                default:
                                                                    break;
                                                            }
                                                        }
                                                    }
                                                    break;
                                                default:
                                                    break;
                                            }
                                        }
                                    }
                                }


                                nodes = xpath.select("//verwachting_vandaag", doc);

                                if (nodes != null && nodes.length > 0) {
                                    var childNodes = nodes[0].childNodes;

                                    node.log("Node: " + childNodes.length);

                                    for (var i = 0; i < childNodes.length; i++) {
                                        var childNode = childNodes[i];

                                        if (childNode != null) {
                                            switch (childNode.localName) {
                                                case "url":
                                                    msg.payload.buienradar.verwachtingVandaag.url = childNode.firstChild.data;
                                                    break;
                                                case "titel":
                                                    msg.payload.buienradar.verwachtingVandaag.titel = childNode.firstChild.data;
                                                    break;
                                                case "tijdweerbericht":
                                                    msg.payload.buienradar.verwachtingVandaag.tijdweerbericht = childNode.firstChild.data;
                                                    break;
                                                case "samenvatting":
                                                    msg.payload.buienradar.verwachtingVandaag.samenvatting = childNode.firstChild.data;
                                                    break;
                                                case "formattedtekst":
                                                    msg.payload.buienradar.verwachtingVandaag.formattedtekst = childNode.firstChild.data;
                                                    break;
                                                case "tekst":
                                                    msg.payload.buienradar.verwachtingVandaag.tekst = childNode.firstChild.data;
                                                    break;
                                                default:
                                                    break;
                                            }
                                        }
                                    }
                                }
                            }
                            callback();
                        } else {
                            node.log("Failed to parse result from buienradar.nl, is the host still accessible?");
                        }
                    } else {
                        node.log("Failed to parse result from buienradar.nl, is the host still accessible?");
                    }
                });
            });

            req.on('error', function (err) {
                callback(err);
                node.log("Failed: " + err);
            });

            node.status({});
        }
    }

    RED.nodes.registerType("buienradar", BuienradarNode);
}
