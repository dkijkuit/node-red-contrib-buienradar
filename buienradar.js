module.exports = function(RED) {
    var xpath = require("xpath");
    var xmldom = require("xmldom").DOMParser;
    var https = require("https");

    function BuienradarNode(config) {
        RED.nodes.createNode(this,config);

        var node = this;
        node.interval_id = null;

        if(config.interval){
			node.interval = config.interval;
		}

        if(config.station){
			node.station = config.station;
		}

        //node.log("Buienradar station set to: "+node.station+", config: "+config.station);

        if(node.interval!="manual"){
            this.interval_id = setInterval( function() {
                node.emit("input",{});
            }, node.interval);
        }

        this.on('input', function(msg) {
            buienradarPoll(node, msg, function(err){
                node.send(msg);
            });
        });

        this.on("close", function() {
            if (this.interval_id !== null) {
                clearInterval(this.interval_id);
            }
        });

        node.emit("input",{});
    }

    function buienradarPoll(node, msg, callback) {
        //wipe clear the payload if it exists, or create it if it doesn't
        msg.payload = {};
        msg.payload.buienradar = {};

        //node.log("Requesting buienradar update ...");

        var url = "https://xml.buienradar.nl";
        if (url) {
            node.status({fill:"blue",shape:"dot",text:"Ophalen weergegevens"});
            var req = https.get(url, function(res) {
                // save the data
                var xml = '';
                res.on('data', function(chunk) {
                    xml += chunk;
                });

                res.on('end', function() {
                    //node.log("Incoming xml size: "+xml.length);
                    var doc = new xmldom().parseFromString(xml)
                    var nodes = xpath.select("//weerstation[@id=\""+node.station+"\"]", doc);

                    //console.log(nodes[0].localName + ": " + nodes[0].firstChild.data);
                    if(nodes!=null && nodes.length>0){
                        var childNodes = nodes[0].childNodes;

                        for(var i=0; i<childNodes.length; i++){
                            var childNode = childNodes[i];
                            //console.log(childNode.localName + ": " + childNode.firstChild.data);
                            switch(childNode.localName){
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
                                default:
                                    break;
                            }
                        }

                        callback();
                    }else{
                        node.log("Failed to parse result from buienradar.nl, is the host still accessible?");
                    }
                });
            });

            req.on('error', function(err) {
                callback(err);
                node.log("Failed: "+err);
            });
            
            node.status({});
        }
    }
    RED.nodes.registerType("buienradar", BuienradarNode);
}
