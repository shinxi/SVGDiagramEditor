/**
 * Utility functions.
 * Depends:
 *	jquery-1.6.2.min.js, jquery-ui.js
 * @author Shin.Xi
 */
$.widget("editor.utility", {
	options: {
	},
	_create: function() {
		this.svgShapeTags = ["rect", "circle", "ellipse", "line", "polyline", "polygon", "path"];
		this.gradientTags = ["linearGradient", "radialGradient"];
	},
	genUUID: function() {
	    // lower cased
	    var res = [], hex = '0123456789abcdef';
	    for (var i = 0; i < 36; i++) res[i] = Math.floor(Math.random()*0x10);
	    res[14] = 4;
	    res[19] = (res[19] & 0x3) | 0x8;
	    for (var i = 0; i < 36; i++) res[i] = hex[res[i]];
	    res[8] = res[13] = res[18] = res[23] = '-';
	    return res.join('');
	},
	//This function is used to clone an new svg element with different gradient id. That's for fixing wired Chrome gradient behavior.
	newSVGElement: function(origin) {
		var newSVG = $(origin).clone()[0];
		var shapeTags = this.svgShapeTags;
		var nodes;
		var nodeStyle;
		var newId;
		var oldId;
		var result;
		var tool = this;
		var defsEle = newSVG.getElementsByTagName("defs");
		$(shapeTags).each(function() {
			nodes = newSVG.getElementsByTagName(this);
			$(nodes).each(function() {
				nodeStyle = this.getAttribute("style")
				if (result = /fill:url\(#(.+)\)/.exec(nodeStyle)) {
					oldId = result[1];
					newId = tool.genUUID();
					this.setAttributeNS(null, "style", nodeStyle.replace(/fill:url\(#.+\)/, "fill:url(#" + newId + ")"));
					tool.setGradientNewId(oldId, newId, defsEle);
				}
			})
		})
		return newSVG;
	},
	setGradientNewId: function(oldId, newId, defsEle) {
		var def;
		var childNodes;
		$(defsEle).each(function() {
			def = this;
			childNodes = def.childNodes;
			$(childNodes).each(function() {
				if (this.attributes && oldId === this.getAttribute("id")) {
					this.setAttributeNS(null, "id", newId);
				}
			})
		})
	},
	//Parse CSV configue file to get configue information.
	parseCSVFileToJSON: function(csvData) {
		//var startTime = new Date().getTime();
		var csvJSON = {};
		var row;
		var objNames = [];
		var rowResult;
		var colResult;
		var colInQuoteResult;
		var col;
		var nameRow;
		var group;
		var needSort = false;
		
		var rowPattern = /(.+?)(?=\r|\n|$)/g;
		var colPatten = /(".+")\s*(?=,|\r|\n|$)|([^,]+)\s*(?=,|\r|\n|$)|(^,|,$)|(,,)/g;
		var colInQuotesPattern = /"(.*?)"\s*(?=,|$)/g;
		
		rowResult = rowPattern.exec(csvData);
		if(rowResult.length <1){
			return;
		}
		
		nameRow = rowResult[1];
		if (/,order\s*(?=,|$)/.test(nameRow)) {
			needSort = true;
		}
		while (colResult = colPatten.exec(nameRow)) {
			//four groups.
			//1. between double quotes. sample: ...,"11,22,333",... --> "11,22,333"
			//2. plain column, between commas. sample: ...,2344,... --> 2344
			//3. start with black value. sample: ,... --> ,
			//4. column is black value. sample: ...,,... --> ,,
			if (colResult[1]) {
				col = colResult[1];
				col = col.replace(/""/g, "#DQS#");
				while (colInQuoteResult = colInQuotesPattern.exec(col)) {
					objNames.push(colInQuoteResult[1].replace(/#DQS#/,"\""));
				};
			} else if (colResult[2]) {
				objNames.push(colResult[2]);
			} else if (colResult[3]) {
				objNames.push("");
			} else if (colResult[4]) {
				objNames.push("");
			}
		}
		
		while (rowResult = rowPattern.exec(csvData))  {
			row = {};
			var i = 0;
			while (colResult = colPatten.exec(rowResult[1])) {
				var col;
				//four groups.
				//1. between double quotes. sample: ...,"11,22,333",... --> "11,22,333"
				//2. plain column, between commas. sample: ...,2344,... --> 2344
				//3. start with black value. sample: ,... --> ,
				//4. column is black value. sample: ...,,... --> ,,
				if (colResult[1]) {
					col = colResult[1];
					col = col.replace(/""/g, "#DQS#");
					while (colInQuoteResult = colInQuotesPattern.exec(col)) {
						row[objNames[i++]] = colInQuoteResult[1].replace(/#DQS#/g,"\"");
					};
				} else if (colResult[2]) {
					row[objNames[i++]] = colResult[2];
				} else if (colResult[3]) {
					row[objNames[i++]] = "";
				} else if (colResult[4]) {
					row[objNames[i++]] = "";
				}
			}
			group = row.group;
			if (group) {
				if (!csvJSON[group]) {
					csvJSON[group] = [];
				}
				csvJSON[group].push(row);
			}
		}
		
		if (needSort) {
			$.each(csvJSON, function(key, val) {
				val.sort(function(obj1, obj2) {
					return obj1.order - obj2.order;
				});
			})
		}
		
		//var endTime = new Date().getTime();
		//console.log("it takes:", (endTime - startTime), csvJSON);
		return csvJSON;
	}
});
