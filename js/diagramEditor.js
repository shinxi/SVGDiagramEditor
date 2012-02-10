/**
 * diagram editor plugin, based on jquery framework and jquery.svg plugin.
 * If you want to use this plugin, you need import jquery.js and jquery.svg.js to your page first.
 * @author Shin.Xi
 */
(function($) {
	var tool = new Tool();
	if(!Function.prototype.bind) {
		Function.prototype.bind = function(obj) {
	        if(typeof this !== 'function') {
	            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
	        }
	         
	        var fSlice = Array.prototype.slice;
	        var aArgs = fSlice.call(arguments, 1);
	        var fToBind = this;
	        var fBound = function() {
                return fToBind.apply(obj || window, aArgs.concat(fSlice.call(arguments)));
            };
	         
	        return fBound;
	    };
	}
	
	function SVGDiagramEditorContainer() {
		this.palette = new Palette();
		this.canvas = new Canvas();
		this.id;
		/*
		 * example: {width: "800px", height: "600px", palette: {width: "300px", height: "600px"}, canvas: {width: "500px", height: "600px"}}
		 */
		this.settings = {
				id: "diagramEditor",
				html: "<div></div>",
				configPath : "svg/svgConfig.csv"
		};
	}
	
	$.extend(SVGDiagramEditorContainer.prototype, {
		init: function(container, options) {
			var self = this;
			var settings = $.extend( this.settings, options);
			this.id = settings.id;
			container.append($(settings.html).attr("id", this.id));
			this.palette.init(this, settings.palette);
			this.canvas.init(this, settings.canvas);
			$.get(settings.configPath, function(csvData){
				self.svgData = new Tool().parseCSVFileToJSON(csvData);
				self.palette.initPalette(self.svgData.palette);
				self.canvas.initCanvasGizmo(self.svgData.gizmo);
			});
			return container;
		},
		load: function(diagramId) {
			var self = this;
			$.getJSON("test/loadJSON.json", function(response) {
				self.canvas.load(response);
			})
		},
		save: function() {
			/*format:
			 * { 
			 *   "id": "",
			 *   "shapes": [
			 *   			{
			 *   				"id": "object group id",//groupid
			 *   				"name": "object group name",
			 *   				"position": "object group upperleft group",
			 *   				"angle": "angle of rotation",
			 *   				"scale": "scale factor of origin"
			 *   			},
			 *   			{
			 *   			},
			 *   			...
			 *   ]
			 * 
			 */
			console.log(this.canvas.save());
		}
	})
	
	function Palette() {
		this.container;
		this.settings = {
				diagramID: "diagramEditor",
				html: "<div id='palette'><div class='palette-title'><span>PALETTE</span></div><div class='palette-groups'></div></div>"
		};
		this.shapeStencils = {};
	}
	
	$.extend(Palette.prototype, {
		init: function(container, options) {
			this.container = container;
			var settings = $.extend( this.settings, options);
			$("#" + container.id).append(settings.html);
		},
		initPalette: function(paletteJSON) {
			var width = 0;
			var height = 0;
			var shapeStencils = this.shapeStencils;
			var palette = this;
			$(paletteJSON).each(function() {
        		var group = this;
       		 	$.ajax({
       			   	type: "GET",
       				async: false,
       			   	url: group.path,
       			   	dataType: "xml",
       			   	success: function(xml){
	       			   	var groupName = group.name;
	       	        	var svgElement = xml.documentElement;
	       	        	var groupDiv = "<div id='" + groupName + "'name='" + groupName + "' class='palette-group'></div>";
	       	        	$(".palette-groups").append(groupDiv);
	       	        	$(".palette-group:last").append(svgElement);
	       	        	shapeStencils[groupName] = {
	       	        			"origin": svgElement,
	       	        			"new": tool.newSVGElement(svgElement)
	       	        	}
       			   	}
       			});
       			
        	})
        	$(".palette-group svg").draggable({
        		cursor: 'pointer', 
        		helper: function(){
        			var svgDiv = $(this).parent().clone().css({"border":"0px"}).width($(this).width()).height($(this).height());
        			svgDiv.empty().append(shapeStencils[svgDiv.attr("name")]["new"]);
        			return svgDiv;
        		}
        	})
        	$("#" + this.container.id).height($(".palette-groups").height() + $(".palette-title").height());
		}
	})
	
	function Canvas() {
		this.container;
		this.svg;
		this.svgWrapper;
		//this.rootNode = null;
		this.shapes = [];
		this.settings = {
				id: "canvas",
				html: "<div id='canvas'></div>",
				width: 1600,
				height: 1000
		};
		//{"containerNode": svgDoc, "btns": {"copy": svgDoc,...}}
		this.gizmoSVGs;
		this.id;
		this.gizmo;
	}
	
	$.extend(Canvas.prototype, {
		init: function(container, options) {
			var svgWrapper;
			var svgRoot;
			var settings;
			var canvas = this;
			this.container = container;
			this.id = tool.genUUID();
			settings = $.extend(this.settings, options);
			$("#" + container.id).append(settings.html);
			$("#" + settings.id).svg();
			svgWrapper = $("#" + settings.id).svg("get");
			svgRoot = svgWrapper.root();
			svgWrapper.configure(svgRoot, {width: settings.width, height: settings.height});
			
			$("#"+settings.id).droppable({
				tolerance: "fit",
				drop: function( event, ui ) {
					var shapeName = ui.helper.attr("name");
					var svgDocument = tool.newSVGElement(ui.helper.find("svg")[0]);
					var shapeConfig;
					var svgRootElement;
					var width;
					var height;
					var shape;
					var defsElement;
					svgRootElement = svgDocument.getElementsByTagName("g")[0];
					defsElement = svgDocument.getElementsByTagName("defs")[0];
					width = parseInt($(svgDocument).width() || $(svgDocument).attr("width"));
					height = parseInt($(svgDocument).height() || $(svgDocument).attr("height"));
					shapeConfig = {
						rootEle: svgRootElement,
						defsEle: defsElement,
						width: width,
						height: height,
						name: shapeName
					}
					var upperLeft= {x: ui.position.left, y: ui.position.top}
					shape = canvas.addShape(shapeConfig);
					shape.moveByDragPosition(upperLeft);
					//canvas.svgWrapper.add(group);
				}
			});
			this.svgWrapper = svgWrapper;
			$(svgRoot).bind("mouseup",this.reset.bind(canvas));
		},
		load: function(json) {
			var canvas = this;
			canvas.clear();
			canvas.id = json.id;
			var shapes = json.shapes;
			var shapeStencils = this.container.palette.shapeStencils;
			$(shapes).each(function() {
				var name = this.name;
				var stencil = shapeStencils[name];
				var svgElement;
				var config;
				var shape;
				if (!stencil) {
					return;
				}
				svgElement = stencil.getElementsByTagName("g")[0];
				config = {
						rootEle: svgElement,
						width: parseInt($(stencil).width() || $(stencil).attr("width")),
						height: parseInt($(stencil).height() || $(stencil).attr("height")),
						name: name,
						angle: this.angle,
						scale: this.scale,
						upperLeft: this.position
				}
				canvas.addShape(config);
			})
		},
		clear: function() {
			var shapes = this.shapes;
			$(shapes).each(function() {
				$(this.node).remove();
			})
			shapes = [];
		},
		save: function() {
			var json = "{" +
							"\"id\": \"" + this.id + "\"," +
							"\"shapes\": [" + this.shapesJSON() + "]" +
					   "}";
			return json;
		},
		shapesJSON: function() {
			var shapes = this.shapes;
			var json = "";
			$(shapes).each(function() {
				json += this.toJSON() + ",";
			})
			if (json) {
				json = json.substring(0, json.length - 1);
			}
			return json;
		},
		addShape: function(shapeConfig) {
			var shape = new Shape();
			shape.init(this, shapeConfig);
			this.shapes.push(shape);
			return shape;
		},
		initCanvasGizmo: function(gizmoJSON) {
			var start = new Date().getTime();
			var config = {"containerNode": "", "btns": {}};
			var btnName;
			var svgDoc;
			$(gizmoJSON).each(function() {
				var group = this;
       		 	$.ajax({
       			   	type: "GET",
       				async: false,
       			   	url: group.path,
       			   	dataType: "xml",
       			   	success: function(xml){
	       			   	btnName = group.name;
	       			   	svgDoc = xml.documentElement;//.getElementsByTagName("g")[0];
	       	        	if (/GizmoContainer/.test(btnName)) {
	       	        		config["containerNode"] = {"svgDoc": svgDoc, "info": group};//new GizmoButton(gizmo, svgDoc, group);
	       	        		return;
	       	        	}
	       	        	config["btns"][btnName] = {"svgDoc": svgDoc, "info": group};//new GizmoButton(svgDoc, group);
       			   	}
       			});
			})
			this.gizmoSVGs = config;
			var gizmo = new Gizmo();
			gizmo.init(this);
			this.gizmo = gizmo;
			//gizmo.node.style.display = "none";
			var end = new Date().getTime();
			console.log("takes:", (end-start), config, this.gizmoSVGs);
			//this.svgWrapper.add(this.gizmo.node)
		},
		reset: function(){
			var shapes = this.shapes;
			$(shapes).each(function() {
				this.gizmo.reset();
			})
		}
	})
	
	function Shape() {
		this.id;
		this.name;
		this.canvas;
		this.node;
		this.rotateGroup;
		this.gizmo;
		this.objectGroup;
		this.upperLeft = {"x" : 0, "y" : 0};//lower left position
		//this.lowerRight = {"x" : 0, "y" : 0};//lower left position
		this.width;
		this.height;
		this.rotateAngle = 0;
		this.scaleNumber = 1;
		this.shapeConfig;
		this.rotatePoint;
	}
	
	$.extend(Shape.prototype, {
		init: function(canvas, shapeConfig) {
			var svgGroupElement = shapeConfig.rootEle;
			this.canvas = canvas;
			var svgWrapper = canvas.svgWrapper;

			this.shapeConfig = shapeConfig;
			
			this.id = tool.genUUID();
			this.name = shapeConfig.name;
			
			this.node = svgWrapper.group(this.id);
			
			this.rotateGroup = svgWrapper.group(this.node);
			svgWrapper.configure(this.rotateGroup, {"class": "rotateGroup"});
			
			this.objectGroup = svgWrapper.group(this.rotateGroup);
			svgWrapper.configure(this.objectGroup, {"class": "objectGroup"});
			
			//this.gizmo = svgWrapper.group(this.rotateGroup);
			//svgWrapper.configure(this.gizmo, {"class": "gizmo"});
			
			this.width = shapeConfig.width;
			this.height = shapeConfig.height;
			
			this.rotatePoint = {
					x: this.width / 2,
					y: this.height / 2
			}
			
			svgWrapper.add(this.objectGroup, shapeConfig.defsEle);
			svgWrapper.add(this.objectGroup, svgGroupElement);
			
			this.gizmo = this.canvas.gizmo;
			
//			this.node.addEventListener("click", this.moveByDragPosition.bind(this), true);

			var shape = this;
			$(this.node).bind("click", this.showGizmo.bind(shape));
			
			if (shapeConfig.scale) {
				this.scale(shapeConfig.scale);
			}
			if (shapeConfig.angle) {
				this.rotate(shapeConfig.angle);
			}
			if (shapeConfig.upperLeft) {
				this.moveByRelatviePosition(shapeConfig.upperLeft);
			}
			this.refresh();
		},
		showGizmo: function() {
			this.gizmo.show(this);
		},
		hideGizmo: function() {
			this.gizmo.hide();
		},
		moveByRelatviePosition: function(position) {
			var upperLeft = this.upperLeft;
			this.upperLeft = {
					"x" : upperLeft.x + position.x,
					"y"	: upperLeft.y + position.y
			}
			/*
			this.lowerRight = {
					"x" : this.upperLeft.x + this.width * this.scaleNumber,
					"y" : this.upperLeft.y + this.height * this.scaleNumber
			}*/
			this.move();
		},
		moveByDragPosition: function(position) {
			//console.log("position:", position);
			this.adjustPosition(position);
			this.move();
		},
		rotate: function(angle) {
			var rotateAngle = this.rotateAngle + angle;
			var rotatePoint = {
					x: (this.width * this.scaleNumber) / 2,
					y: (this.height * this.scaleNumber) / 2
			}
			this.rotateGroup.setAttributeNS(null, "transform", "rotate(" + rotateAngle + ", " + rotatePoint.x +", " + rotatePoint.y +")");
			this.rotatePoint = rotatePoint;
			this.rotateAngle = rotateAngle;
			//this.calRotatePoint();
		},
		scale: function(scaleNumber) {
			var newNum = this.scaleNumber * scaleNumber;
			this.objectGroup.setAttributeNS(null, "transform", "scale(" + newNum + ")");
			this.scaleNumber = newNum;
			/*this.lowerRight = {
					"x" : this.upperLeft.x + this.width * newNum,
					"y" : this.upperLeft.y + this.height * newNum
			}
			console.log("this.upperLeft", this.upperLeft, "this.lowerRight", this.lowerRight);
			//this.gizmo.moveToShape();*/
			this.adjustShape();
		},
		adjustShape: function() {
			var rotatePoint = this.calRotatePoint();
			var centerPoint = {
				x: this.upperLeft.x + rotatePoint.x,
				y: this.upperLeft.y + rotatePoint.y
			}
			var scaleNumber = this.scaleNumber;
			this.upperLeft = {
					x: centerPoint.x - this.width * scaleNumber / 2,
					y: centerPoint.y - this.height * scaleNumber / 2
			}
			this.move();
			this.rotate(0);
			this.adjustUpperLeft();
		},
		adjustUpperLeft: function() {
			var canvas = $("#canvas");
			var canvasWidth = canvas.width();
			var canvasHeight = canvas.height();
			var scrollTop = canvas.scrollTop();
			var scrollLeft = canvas.scrollLeft();
			var centerPoint = this.center();
			var x = centerPoint.x + 50;
			var y = centerPoint.y + 50;
			var remainX = x - canvasWidth - scrollLeft;
			var remainY = y - canvasHeight - scrollTop;
			var svgWidth = 1600;
			var svgHeight = 1000;
			if (remainX > 0) {
				this.upperLeft.x = this.upperLeft.x - remainX;
				this.move();
			}
			if (remainY > 0) {
				//canvas.scrollTop(scrollTop + remainY);
				//var remanScrollTop = svgHeight - scrollTop - canvasHeight;
				//if (remainY > remanScrollTop) {
				this.upperLeft.y = this.upperLeft.y - remainY;
				this.move();
				//}
			}
			x = centerPoint.x - 50;
			y = centerPoint.y - 50;
			
			if (x < 0) {
				this.upperLeft.x = -(this.width * this.scaleNumber / 2 - 50);
				this.move();
			}
			
			if (y < 0) {
				this.upperLeft.y = -(this.height * this.scaleNumber / 2 - 50);
				this.move();
			}
		},
		move: function() {
			this.node.setAttributeNS(null, "transform", "translate(" + this.upperLeft.x + ", " + this.upperLeft.y +")");
		},
		calRotatePoint: function() {
			var upperLeft = {
					x: 0,
					y: 0
			}
			var lowerRight = {
					"x" : upperLeft.x + this.width,
					"y" : upperLeft.y + this.height
			};
			var rotateAngle = this.rotateAngle;
			var scaleNumber = this.scaleNumber;
			var rotatePoint = this.rotatePoint;
			if (rotateAngle && scaleNumber) {
				if (scaleNumber != 1) {
					upperLeft = this.positionAfterRotateAndScale(upperLeft, rotateAngle, rotatePoint, scaleNumber);
					lowerRight = this.positionAfterRotateAndScale(lowerRight, rotateAngle, rotatePoint, scaleNumber);
					//console.log("upperLeft", upperLeft);
					//console.log("lowerRight", lowerRight);
				} else {
					upperLeft = this.positionAfterRotate(upperLeft, rotateAngle, rotatePoint);
					lowerRight = this.positionAfterRotate(lowerRight, rotateAngle, rotatePoint);
					//console.log("this.upperLeft", this.upperLeft);
					//console.log("upperLeft", upperLeft);
					//console.log("lowerRight", lowerRight);
				}
			}
			
			if (!rotateAngle && scaleNumber && scaleNumber != 1) {
				upperLeft = this.positionAfterScale(upperLeft, scaleNumber);
				lowerRight = this.positionAfterScale(lowerRight, scaleNumber);
			}
			return {
				x: (lowerRight.x + upperLeft.x)/2,
				y: (lowerRight.y + upperLeft.y)/2
			}
		},
		center: function() {
			var upperLeft = this.upperLeft;
			var scaleNumber = this.scaleNumber;
			return {
				x: upperLeft.x + this.width * scaleNumber / 2,
				y: upperLeft.y + this.height * scaleNumber / 2
			}
		},
		positionAfterRotate: function(position, rotateAngle, rotatePoint) {
			var oldX = position.x;
			var oldY = position.y;
			var rotatePointX = rotatePoint.x;
			var rotatePointY = rotatePoint.y;
			rotateAngle = Math.PI * rotateAngle / 180;
			var newX = Math.cos(rotateAngle) * oldX - Math.sin(rotateAngle) * oldY - Math.cos(rotateAngle) * rotatePointX + Math.sin(rotateAngle) * rotatePointY + rotatePointX;
			var newY = Math.sin(rotateAngle) * oldX + Math.cos(rotateAngle) * oldY - Math.sin(rotateAngle) * rotatePointX - Math.cos(rotateAngle) * rotatePointY + rotatePointY;
			return {x: newX, y: newY}
		},
		positionAfterRotateAndScale: function(position, rotateAngle, rotatePoint, scaleNumber) {
			var oldX = position.x;
			var oldY = position.y;
			var rotatePointX = rotatePoint.x;
			var rotatePointY = rotatePoint.y;
			rotateAngle = Math.PI * rotateAngle / 180;
			var newX = scaleNumber * (Math.cos(rotateAngle) * oldX - Math.sin(rotateAngle) * oldY) - Math.cos(rotateAngle) * rotatePointX + Math.sin(rotateAngle) * rotatePointY + rotatePointX;
			var newY = scaleNumber * (Math.sin(rotateAngle) * oldX + Math.cos(rotateAngle) * oldY) - Math.sin(rotateAngle) * rotatePointX - Math.cos(rotateAngle) * rotatePointY + rotatePointY;
			return {x: newX, y: newY}
		},
		positionAfterScale: function(position, scaleNumber) {
			return {
				x: position.x * scaleNumber,
				y: position.y * scaleNumber
			}
		},
		adjustPosition: function(position) {
			var position = this.getCanvasPosition(position);
			this.setPosition(position);
			//console.log(this.upperLeft, this.lowerRight);
		},
		getCanvasPosition: function(position) {
			var screenCTM = this.canvas.svgWrapper.root().getScreenCTM();
			var bodyScrollTop = document.body.scrollTop;
			return {
				"x" : position.x - screenCTM.e,
				"y"	: position.y - screenCTM.f - bodyScrollTop
			}
		},
		setPosition: function(position) {
			this.upperLeft = position; 
			/*
			this.lowerRight = {
					"x" : position.x + this.width,
					"y" : position.y + this.height
			}*/
		},
		getConfig: function(){
			var config = this.shapeConfig;
			config.scale = this.scaleNumber;
			config.angle = this.rotateAngle;
			return config;
		},
		toJSON: function() {
			return "{" +
			"\"id\": \"" + this.id + "\"," +
			"\"name\": \"" + this.name + "\"," +
			"\"position\": { \"x\": " + this.upperLeft.x + ", \"y\": " + this.upperLeft.y + "}," +
			"\"angle\": " + this.rotateAngle + "," +
			"\"scale\": " + this.scaleNumber +
			"}"
		},
		//To avoid weried behavior of those gradient shapes on Chrome browser.
		refresh: function() {
		}
		/*
		move: function(event) {
			event = event || window.event;
			this.adjustPosition({"x" : event.clientX, "y" : event.clientY+50});
			this.moveToCurrentPositon();
		},*/
	})
	
	function Gizmo() {
		this.node;
		this.containerNode;
		this.btnGroup;
		this.btns = {};
		this.shape;
		this.canvas;
		this.upperLeft = {"x" : 0, "y" : 0};
		this.width;
		this.height;
		this.clazz = "gizmo";
		this.mousePressed = false;
		this.scaleNode;
		this.scaleNumber = 1;
		this.rotateGroup;
		this.scaleGroup;
	}
	$.extend(Gizmo.prototype, {
		init: function(canvas){
			var gizmo = this;
			this.canvas = canvas;
			var svgWrapper = canvas.svgWrapper;
			var btnConfigs = canvas.gizmoSVGs.btns;
			var containerNodeConfig = canvas.gizmoSVGs.containerNode;
			var containerNode = new GizmoButton(containerNodeConfig.svgDoc, containerNodeConfig.info);
			this.width = containerNode.width;
			this.height = containerNode.height;
			
			//var gizmoNode = svgWrapper.group(shape.rotateGroup);
			var gizmoNode = svgWrapper.group();
			$(gizmoNode).hide();
			this.rotateGroup = svgWrapper.group(gizmoNode);
			this.scaleGroup = svgWrapper.group(this.rotateGroup);
			svgWrapper.configure(gizmoNode, {"class": this.clazz, "groupType": this.clazz});
			
			this.node = gizmoNode;
			
			containerNode.init(this);
			
			this.btnGroup = svgWrapper.group(this.scaleGroup);
			
			var btns = {};
			$.each(btnConfigs, function(key, gizmoBtnConfig) {
				var gizmoBtn = new GizmoButton(gizmoBtnConfig.svgDoc, gizmoBtnConfig.info);
				gizmoBtn.init(gizmo);
				btns[key] = gizmoBtn;
			})
			
			this.containerNode = containerNode;
			this.btns = btns;
			this.node = gizmoNode;

			$(this.node).bind("mouseleave", this.mouseLeave.bind(this));
		},
		mouseLeave: function() {
			if (!this.mousePressed) {
				this.hide();
			}
		},
		moveToShape: function(shape) {
			this.forward();
			var shapeCenter = shape.center();
			this.upperLeft = {
					"x": shapeCenter.x - this.width / 2,
					"y": shapeCenter.y - this.height / 2
			}
			//console.log(shape.width, this.width, shape.height, this.height);
			this.node.setAttributeNS(null, "transform", "translate(" + this.upperLeft.x + ", " + this.upperLeft.y +")");
		},
		rotateByShape: function(shape) {
			this.rotateGroup.setAttributeNS(null, "transform", "rotate(" + shape.rotateAngle + ", " + this.width / 2 +", " + this.height / 2 +")");
		},
		forward: function() {
			$("#canvas svg").append(this.node);
		},
		show: function(shape) {
			this.shape = shape;
			this.moveToShape(shape);
			this.rotateByShape(shape);
			$(this.node).show();
		},
		hide: function() {
			this.reset();
			$(this.node).hide();
		},
		reset: function() {
			var btns = this.btns;
			$.each(btns, function(key, gizmoBtn) {
				gizmoBtn.setOpacity("1.0");
				gizmoBtn.mousePressed = false;
			})
			this.mousePressed = false;
		}
	})
	
	function GizmoButton(svgDoc, group) {
		
		this.width = parseInt($(svgDoc).width() || $(svgDoc).attr("width"));
		this.height = parseInt($(svgDoc).height() || $(svgDoc).attr("height"));
		
		this.node;
		this.gizmo;
		
		//the center position of a gizmo button.
		this.cPos = {x: 0, y: 0};
		
		this.name = group.name;
		this.svgDoc = svgDoc;
		
		var positionPattern = /\(\s*([\d\-]+)\s*,\s*([\d\-]+)\s*\)/g;
		var xy = positionPattern.exec(group.centerPosition);
		if (xy) {
			this.cPos.x = parseInt(xy[1]);
			this.cPos.y = parseInt(xy[2]);
		}
		this.mousePressed = false;
		this.mousePressedPosition;
		this.rotateCanvasPosition;
		this.mouseOriginAngle = 0;
	}
	$.extend(GizmoButton.prototype, {
		init: function(gizmo) {
			var svgWrapper = gizmo.canvas.svgWrapper;
			var parentGroup = gizmo.btnGroup;
			if (/GizmoContainer/.test(this.name)) {
				parentGroup = gizmo.scaleGroup;
			}
			var btnNode = svgWrapper.group(parentGroup);
			
			if (/scale/.test(this.name)) {
				var scale = svgWrapper.group(btnNode);
				svgWrapper.configure(scale, {"class": "scaleGroup"});
				svgWrapper.add(scale, this.svgDoc.getElementsByTagName("g")[0]);
				var shape = gizmo.shape;
				//var shapeCenter = shape.center();
				var cPos = this.cPos;
				var x = cPos.x - this.width/2;
				var y = cPos.y - this.height/2;
				this.scaleReferPosition = {
						x: x,
						y: y
				}
				gizmo.scaleNode = scale;
			} else {
				svgWrapper.add(btnNode, this.svgDoc.getElementsByTagName("g")[0]);
			}
			svgWrapper.configure(btnNode, {"class": this.name});
			
			var upperLeftX = gizmo.width/2 + (this.cPos.x - this.width/2);
			var upperLeftY = gizmo.height/2 - (this.cPos.y + this.height/2);
			//console.log(upperLeftX, upperLeftY);
			btnNode.setAttributeNS(null, "transform", "translate(" + upperLeftX + ", " + upperLeftY +")");
			
			this.node = btnNode;
			this.gizmo = gizmo;
			
			this.addEvents(svgWrapper);
		},
		addEvents: function(svgWrapper) {
			var gizBtn = this;
			//var node = this.gizmo.shape.node;
			//$( node ).draggable();
			$(this.node).bind("mousedown", this.mouseDown.bind(gizBtn));
			$(this.node).bind("mouseup", this.mouseUp.bind(gizBtn));
			$(this.node).bind("mouseleave", this.mouseLeave.bind(gizBtn));
			if (this.name == 'move') {
				$(this.node).bind("mousemove", this.mouseDrag.bind(gizBtn));
			}
			if (this.name == 'rotate') {
				$(this.node).bind("mousemove", this.mouseRotate.bind(gizBtn));
			}
			if (this.name == 'scale') {
				$(this.node).bind("mousemove", this.mouseScale.bind(gizBtn));
			}
			if (this.name == 'del') {
				$(this.node).bind("click", this.remove.bind(gizBtn));
			}
			if (this.name == 'copy') {
				$(this.node).bind("click", this.copy.bind(gizBtn));
			}
			if (this.name == 'forward') {
				$(this.node).bind("click", this.forward.bind(gizBtn));
			}
			if (this.name == 'backward') {
				$(this.node).bind("click", this.backward.bind(gizBtn));
			}
			$(this.node).bind("mouseout", this.mouseLeave.bind(gizBtn));
			//this.node.addEventListener("mousemove", this.mouseMove.bind(gizBtn), true);
		},
		forward: function() {
			var shape = this.gizmo.shape;
			var canvas = shape.canvas;
			var shapes = canvas.shapes;
			/*
			var relatedShapes = [];
			var shapeUpperLeft = shape.upperLeft;
			var shapeLowerRight = shape.lowerRight;
			$(shapes).each(function() {
				var upperLeft = this.upperLeft;
				var lowerRight = this.lowerRight;
				if (shapeUpperLeft.x < lowerRight.x && shapeUpperLeft.y < lowerRight.y) {
					if (shapeLowerRight.x > upperLeft.x && shapeLowerRight.y > upperLeft.y) {
						relatedShapes.push(this);
					}
				}
			})
			console.log("shape", shape.upperLeft, shape.lowerRight, relatedShapes);
			*/
			shapes.splice($.inArray(shape, shapes), 1);
			shapes.push(shape);
			//$(shape.node).remove();
			$("#canvas svg").append(shape.node);
			shape.gizmo.forward();
			console.log(shapes);
		},
		backward: function() {
			var shape = this.gizmo.shape;
			var shapes = shape.canvas.shapes;
			var shapeIndex = $.inArray(shape, shapes);
			for (var i=shapeIndex; i > 0; i--) {
				shapes[i] = shapes[i-1];
			}
			shapes[0] = shape;
			$("#canvas svg").prepend(shape.node);
			console.log(shapes);
		},
		remove: function() {
			var shape = this.gizmo.shape;
			var shapeRootNode = shape.node;
			var shapes = shape.canvas.shapes;
			$(shapeRootNode).remove();
			shapes.splice($.inArray(shape, shapes), 1);
			this.gizmo.hide();
			console.log(shapes);
		},
		copy: function() {
			var shape = this.gizmo.shape;
			var shapeConfig = shape.getConfig();
			var canvas = shape.canvas;
			var newShape = canvas.addShape(shapeConfig);
			var upperLeftPosition = shape.upperLeft;
			newShape.setPosition({
				x: upperLeftPosition.x,
				y: upperLeftPosition.y + 50
			});
			newShape.move();
		},
		mouseDown: function(event) {
			var gizBtn = this;
			var gizmo = this.gizmo;
			var btns = gizmo.btns;
			var currentBehavior = this.name;
			event = event || window.event;
			this.mousePressed = true;
			gizmo.mousePressed = true;
			this.mousePressedPosition = {
					"x": event.clientX,
					"y": event.clientY
			}
			if (currentBehavior == 'move') {
				$("#canvas").bind("mousemove", this.mouseDrag.bind(gizBtn));
			}
			if (currentBehavior == 'rotate') {
				var shape = gizmo.shape;
				this.rotateCanvasPosition = shape.center();
				$("#canvas").bind("mousemove", this.mouseRotate.bind(gizBtn));
			}
			if (currentBehavior == 'scale') {
				var shape = gizmo.shape;
				var shapeCenter = shape.center();
				var rotateAngle = shape.rotateAngle;
				var angle = Math.PI * rotateAngle / 180;
				var scaleReferPosition = this.scaleReferPosition;
				var x = scaleReferPosition.x;
				var y = scaleReferPosition.y;
				//new coordinate after rotate
				var newX = y * Math.sin(angle) + x * Math.cos(angle);
				var newY = y * Math.cos(angle) - x * Math.sin(angle);
				this.scaleReferCanvasPosition = {
						"x": shapeCenter.x + newX,
						"y": shapeCenter.y - newY
				}
				console.log(x, y, newX, newY, rotateAngle, "scaleReferPosition:", this.scaleReferPosition,"this.scaleReferCanvasPosition",this.scaleReferCanvasPosition);
				this.scaleLastPosition = null;
				$("#canvas").bind("mousemove", this.mouseScale.bind(gizBtn));
			}
			
			$.each(btns, function(key, gizmoBtn) {
				if(gizmoBtn.name != currentBehavior) {
					gizmoBtn.setOpacity("0.6");
				}
			})
			
			gizmo.currentBehavior = currentBehavior;
			$("#canvas").bind("mouseup", this.mouseUp.bind(gizBtn));
			event.preventDefault();
		},
		mouseUp: function() {
			var gizBtn = this;
			var gizmo = this.gizmo;
			gizmo.reset();
			this.mousePressed = false;
			if (this.name == 'move') {
			}
			if (this.name == 'rotate') {
				this.mouseOriginAngle = null;
			}
			if (this.name == 'scale') {
				/*var scaleNumber = this.scaleNumber;
				
				var shapeScaleGroup = this.gizmo.shape.objectGroup; 
				shapeScaleGroup.setAttributeNS(null, "transform", "scale(" + scaleNumber + ")");
				scaleNumber = 1;
				this.scaleNode.setAttributeNS(null, "transform", "scale(" + scaleNumber + ")");
				this.scaleNumber = scaleNumber;*/
			}
			
			if (gizmo.currentBehavior == 'scale') {
				var scaleNumber = gizmo.scaleNumber;
				gizmo.shape.scale(scaleNumber);
				scaleNumber = 1;
				gizmo.scaleNode.setAttributeNS(null, "transform", "scale(" + scaleNumber + ")");
				gizmo.scaleNumber = scaleNumber;
				gizmo.moveToShape(gizmo.shape);
			}

			$("#canvas").unbind("mousemove");
			$("#canvas").unbind("mouseup");
		},
		mouseLeave: function(event) {
			event = event || window.event;
			if (this.mousePressed && this.name == 'move') {
				this.mouseDrag(event);
				event.preventDefault();
			}
		},
		mouseDrag: function(event) {
			event = event || window.event;
			var name = this.name;
			var gizmo = this.gizmo;
			var shape = gizmo.shape;
			var x;
			var y;
			var mousePressedPosition;
			if (this.mousePressed && this.name == 'move') {
				mousePressedPosition = this.mousePressedPosition;
				x = event.clientX - mousePressedPosition.x;
				y = event.clientY - mousePressedPosition.y;
				this.mousePressedPosition = {
						"x": event.clientX,
						"y": event.clientY
				}
				shape.moveByRelatviePosition({"x": x, "y": y});
				gizmo.moveToShape(shape);
				event.preventDefault();
			}
		},
		mouseRotate: function(event) {
			if (this.mousePressed) {
				event = event || window.event;
				var gizmo = this.gizmo;
				var shape = gizmo.shape;
				var btns = gizmo.btns;
				var rotateCanPos = this.rotateCanvasPosition;
				var mouseOriginalPos;
				var mouseCurrentPos;
				var mouseOriginAngle;
				var mouseMoveAngle;
				var mouseOriginAngle = this.mouseOriginAngle;
				var mouseMoveAngle;
				mouseOriginalPos = shape.getCanvasPosition(this.mousePressedPosition);
				mouseCurrentPos = shape.getCanvasPosition({
					"x": event.clientX,
					"y": event.clientY
				});
				//console.log(rotateCanPos, mouseOriginalPos, mouseCurrentPos);
				if (!mouseOriginAngle) {
					mouseOriginAngle = 180 * Math.atan2(rotateCanPos.y - mouseOriginalPos.y, mouseOriginalPos.x - rotateCanPos.x) / Math.PI;;
				}
				mouseMoveAngle = 180 * Math.atan2(rotateCanPos.y - mouseCurrentPos.y, mouseCurrentPos.x - rotateCanPos.x) / Math.PI;
				//console.log(mouseOriginAngle, mouseMoveAngle);
				shape.rotate(mouseOriginAngle - mouseMoveAngle);
				gizmo.rotateByShape(shape);
				mouseOriginAngle = mouseMoveAngle;
				this.mouseOriginAngle = mouseOriginAngle;
				event.preventDefault();
			}
		},
		mouseScale: function(event) {
			if (!this.mousePressed) {
				return;
			}
			event = event || window.event;
			var gizmo = this.gizmo;
			var shape = gizmo.shape;
			var lastLen;
			var curLen;
			var scaleLastPosition;// = this.mousePressedPosition;
			var currentMousePosition = shape.getCanvasPosition({
					"x": event.clientX,
					"y": event.clientY
			})
			var mousePressedPosition = shape.getCanvasPosition(this.mousePressedPosition);
			var referPosition = this.scaleReferCanvasPosition;
			
			if (!this.scaleLastPosition) {
				this.scaleLastPosition = mousePressedPosition;
				return;
			}
			scaleLastPosition = this.scaleLastPosition;
			
			var lastLen = Math.sqrt(Math.pow(scaleLastPosition.y - referPosition.y, 2) +
                                      Math.pow(scaleLastPosition.x - referPosition.x, 2));
			
            var curLen = Math.sqrt(Math.pow(currentMousePosition.y - referPosition.y, 2) +
                                     Math.pow(currentMousePosition.x - referPosition.x, 2));
            
            this.scaleLastPosition = currentMousePosition;
            if (!lastLen) {
				return;
			}
            //console.log("referPosition.x",referPosition.x, "referPosition.y",referPosition.y, "scaleLastPosition.x", scaleLastPosition.x, "scaleLastPosition.y",scaleLastPosition.y,"currentMousePosition.x", currentMousePosition.x, "currentMousePosition.y", currentMousePosition.y);
            //console.log("curLen is:",curLen, "lastLen is:", lastLen);
            var scaleNumber = gizmo.scaleNumber * curLen/lastLen;
            gizmo.scaleNode.setAttributeNS(null, "transform", "scale(" + scaleNumber + ")");
            console.log(scaleNumber);
            shape.objectGroup.setAttributeNS(null, "transform", "scale(" + shape.scaleNumber * scaleNumber  + ")");
            gizmo.scaleNumber = scaleNumber;
			event.preventDefault();
		},
		setOpacity: function(value) {
			this.node.style.opacity = value; 
		}
		
	})
	
	var svgDiagramContainer = new SVGDiagramEditorContainer();
	
	$.fn.SVGDiagram = function(options) {
		var otherArgs = Array.prototype.slice.call(arguments, 1);
		var method = arguments[0] || "";
	    if ( svgDiagramContainer[method] ) {
	      return svgDiagramContainer[method].apply( svgDiagramContainer, otherArgs);
	    } else if ( typeof method === 'object' || !method ) {
	      return svgDiagramContainer.init.apply( svgDiagramContainer, [this].concat(otherArgs));
	    } else {
	      $.error( 'Options ' +  options + ' does not exist on $.diagramEditor' );
	    }
	};
	
	function Tool() {
		this.svgShapeTags = ["rect", "circle", "ellipse", "line", "polyline", "polygon", "path"];
		this.gradientTags = ["linearGradient", "radialGradient"];
	}
	$.extend(Tool.prototype, {
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
		newSVGElement: function(origin) {
			var newSVG = $(origin).clone()[0];
			var shapeTags = this.svgShapeTags;
			var nodes;
			var nodeStyle;
			var newId;
			var oldId;
			var result;
			var palette = this;
			var defsEle = newSVG.getElementsByTagName("defs");
			$(shapeTags).each(function() {
				nodes = newSVG.getElementsByTagName(this);
				$(nodes).each(function() {
					nodeStyle = this.getAttribute("style")
					if (result = /fill:url\(#(.+)\)/.exec(nodeStyle)) {
						oldId = result[1];
						newId = tool.genUUID();
						this.setAttributeNS(null, "style", nodeStyle.replace(/fill:url\(#.+\)/, "fill:url(#" + newId + ")"));
						palette.setGradientNewId(oldId, newId, defsEle);
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
		parseCSVFileToJSON: function(csvData) {
			var startTime = new Date().getTime();
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
			
			var endTime = new Date().getTime();
			console.log("it takes:", (endTime - startTime), csvJSON);
			return csvJSON;
		}
	})
})(jQuery)