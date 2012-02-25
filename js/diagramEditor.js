/**
 * Diagram editor plugin. Five widgets are concluded in this plugin.
 * Widgets:
 *   editor.SVGDiagram: The whole interface to be invoked outside.
 *   editor.palette: palette object. Functions: palette generation, shape drag definition. 
 *   editor.canvas: canvas object. Functions: canvas generation, shape drop definition, add shape into canvas and so on.
 *   editor.shape: shape object. Functions: shape generation, shape move, shape scale, shape rotate, show shape gizmo, and so on.
 *                 When a shape is dragged into a canvas, one shape object will be created. 
 *   editor.gizmo: gizmo object. Functions: show, hide, move and so on. Only one gizmo object will existed in canvas. 
 *   
 * Depends:
 *	jquery.js, jquery.svg.js, jquery-ui.js
 * @author Shin.Xi
 */
(function($) {
	if(!Function.prototype.bind) {
		Function.prototype.bind = function(obj) {
	        if(typeof this !== 'function') {
	            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
	        }
	         
	        var fSlice = Array.prototype.slice;
	        var aArgs = fSlice.call(arguments, 1);
	        var fToBind = this;
	        var fBound = function() {
	        	//such function like click events will add event parameter as an argument at runtime, so aArgs.concat(fSlice.call(arguments));
                return fToBind.apply(obj || window, aArgs.concat(fSlice.call(arguments)));
            };
	         
	        return fBound;
	    };
	}
	
	$.widget("editor.SVGDiagram", {
		options: {
			id: "diagramEditor",
			html: "<div><div id='palette'><div class='palette-title'><span>PALETTE</span></div><div class='palette-groups'></div></div><div id='canvas'></div></div>",
			configPath : "svg/svgConfig.csv"
		},
		_create: function() {
			this.init();
		},
		init: function(container) {
			var options = this.options;
			this.id = options.id;
			this.element.append($(options.html).attr("id", this.id));
			//create palette widget
			$("#canvas").palette({container: this});
			//create canvas widget
			$("#canvas").canvas({container: this});
			//create utility widget on $("#canvas")
			$("#canvas").utility();
			$.get(options.configPath, function(csvData){
				var svgData = $("#canvas").utility("parseCSVFileToJSON", csvData);
				$("#canvas").palette("initPalette", svgData.palette);
				//self.canvas.initCanvasGizmo(self.svgData.gizmo);
				$("#canvas").canvas("initCanvasGizmo", svgData.gizmo);
			});
		},
		load: function(diagramId) {
			var self = this;
			$.getJSON("test/loadJSON.json", function(response) {
				$("#canvas").canvas("load", response);
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
			console.log($("#canvas").canvas("save"));
		}
	});
	
	$.widget("editor.palette", {
		options: {
			"container": null
		},
		_create: function() {
			this.container = this.options.container;
			this.shapeStencils = {};
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
	       	        			"new": $("#canvas").utility("newSVGElement", svgElement)
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
	});
	
	$.widget("editor.canvas", {
		options: {
			"container": null
		},
		_create: function() {
			this.container;
			this.svg;
			this.svgWrapper;
			//this.rootNode = null;
			this.shapes = [];
			this.settings = {
					id: "canvas",
					width: 1600,
					height: 1000
			};
			//{"containerNode": svgDoc, "btns": {"copy": svgDoc,...}}
			this.gizmoSVGs;
			this.id;
			this.gizmo;
			this.init();

		},
		init: function() {
			var svgWrapper;
			var svgRoot;
			var settings = this.settings;
			var canvas = this;
			var container = this.options.container;
			this.container = container;
			this.id = $("#canvas").utility("genUUID");
			$("#" + container.id).append(settings.html);
			$("#" + settings.id).svg();
			svgWrapper = $("#" + settings.id).svg("get");
			svgRoot = svgWrapper.root();
			svgWrapper.configure(svgRoot, {width: settings.width, height: settings.height});
			
			$("#"+settings.id).droppable({
				tolerance: "fit",
				drop: function( event, ui ) {
					var shapeName = ui.helper.attr("name");
					var svgDocument = $("#canvas").utility("newSVGElement", ui.helper.find("svg")[0]);
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
		},
		load: function(json) {
			var canvas = this;
			canvas.clear();
			canvas.id = json.id;
			var shapes = json.shapes;
			var shapeStencils = $("#canvas").data("palette").shapeStencils;
			$(shapes).each(function() {
				var name = this.name;
				var svgDocument = $("#canvas").utility("newSVGElement", shapeStencils[name]["origin"]);
				var svgRootElement;
				var defsElement;
				var config;
				if (!svgDocument) {
					return;
				}
				svgRootElement = svgDocument.getElementsByTagName("g")[0];
				defsElement = svgDocument.getElementsByTagName("defs")[0];
				config = {
						rootEle: svgRootElement,
						defsEle: defsElement,
						width: parseInt($(svgDocument).width() || $(svgDocument).attr("width")),
						height: parseInt($(svgDocument).height() || $(svgDocument).attr("height")),
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
			var node = shapeConfig.rootEle;
			var shape = $(node).shape(shapeConfig).data("shape");
			this.shapes.push(shape);
			return shape;
		},
		initCanvasGizmo: function(gizmoJSON) {
			//var start = new Date().getTime();
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
			
			$("#canvas").gizmo({config: config});
			this.gizmo = $("#canvas").data("gizmo");
			//var end = new Date().getTime();
			//console.log("takes:", (end-start), config, this.gizmoSVGs);
		}
	});
	
	$.widget("editor.shape", {
		options: {
			"name": "",
			"width": "",
			"height": "",
			"defsEle": null,
			"scale": "",
			"angle": "",
			"upperLeft": null
			
		},
		_create: function() {
			this.id;
			this.name;
			this.canvas;
			this.node;
			this.rotateGroup;
			this.gizmo;
			this.objectGroup;
			this.upperLeft = {"x" : 0, "y" : 0};//lower left position
			this.width;
			this.height;
			this.rotateAngle = 0;
			this.scaleNumber = 1;
			this.shapeConfig;
			this.rotatePoint;
			this.init();

		},
		init: function() {
			var shapeConfig = this.options;
			var svgGroupElement = this.element[0];
			var canvas = $("#canvas").data("canvas");
			this.canvas = canvas;
			var svgWrapper = canvas.svgWrapper;

			this.shapeConfig = shapeConfig;
			
			this.id = $("#canvas").utility("genUUID");
			this.name = shapeConfig.name;
			
			this.node = svgWrapper.group(this.id);
			
			this.rotateGroup = svgWrapper.group(this.node);
			svgWrapper.configure(this.rotateGroup, {"class": "rotateGroup"});
			
			this.objectGroup = svgWrapper.group(this.rotateGroup);
			svgWrapper.configure(this.objectGroup, {"class": "objectGroup"});
			
			this.width = shapeConfig.width;
			this.height = shapeConfig.height;
			
			this.rotatePoint = {
					x: this.width / 2,
					y: this.height / 2
			}
			
			svgWrapper.add(this.objectGroup, shapeConfig.defsEle);
			svgWrapper.add(this.objectGroup, svgGroupElement);
			
			this.gizmo = this.canvas.gizmo;
			
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
			this.move();
		},
		moveByDragPosition: function(position) {
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
		},
		scale: function(scaleNumber) {
			var newNum = this.scaleNumber * scaleNumber;
			this.objectGroup.setAttributeNS(null, "transform", "scale(" + newNum + ")");
			this.scaleNumber = newNum;
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
				this.upperLeft.y = this.upperLeft.y - remainY;
				this.move();
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
				} else {
					upperLeft = this.positionAfterRotate(upperLeft, rotateAngle, rotatePoint);
					lowerRight = this.positionAfterRotate(lowerRight, rotateAngle, rotatePoint);
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
		},
		getConfig: function(){
			var config = this.shapeConfig;
			config.rootEle = $(config.rootEle).clone()[0];
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
		}
	});
	
	$.widget("editor.gizmo", {
		options: {
			"config": null
		},
		_create: function() {
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
			this.init(this.options.canvas);

		},
		init: function(canvas){
			var gizmo = this;
			var config = this.options.config;
			this.canvas = this.element.data("canvas");
			var svgWrapper = $("#canvas").svg("get");
			var btnConfigs = config.btns;
			var containerNodeConfig = config.containerNode;
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
			
			this.addEvents(btns);

			$(this.node).bind("mouseleave", this.mouseLeave.bind(this));
		},
		addEvents: function(btns) {
			var node;
			$.each(btns, function(key, gizmoButton) {
				node = gizmoButton.node;
				if (this.name == 'move') {
					$(node).shapeDrag({button: gizmoButton});
				}
				else if (this.name == 'rotate') {
					$(node).shapeRotate({button: gizmoButton});
				}
				else if (this.name == 'scale') {
					var cPos = gizmoButton.cPos;
					var scaleReferPosition = {
							x: cPos.x - gizmoButton.width/2,
							y: cPos.y - gizmoButton.height/2
					}
					$(node).shapeScale({scaleReferPosition: scaleReferPosition});
				}
				else if (this.name == 'del') {
					$(node).shapeDelete({button: gizmoButton});
				}
				else if (this.name == 'copy') {
					$(node).shapeCopy({button: gizmoButton});
				}
				else if (this.name == 'forward') {
					$(node).shapeForward({button: gizmoButton});
				}
				else if (this.name == 'backward') {
					$(node).shapeBackward({button: gizmoButton});
				}
			})
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
		}
	});
	
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
	}
	$.extend(GizmoButton.prototype, {
		init: function(gizmo) {
			var svgWrapper = $("#canvas").svg("get");//gizmo.canvas.svgWrapper;
			var parentGroup = gizmo.btnGroup;
			if (/GizmoContainer/.test(this.name)) {
				parentGroup = gizmo.scaleGroup;
			}
			var btnNode = svgWrapper.group(parentGroup);
			
			if (/scale/.test(this.name)) {
				var scale = svgWrapper.group(btnNode);
				svgWrapper.configure(scale, {"class": "scaleGroup"});
				svgWrapper.add(scale, this.svgDoc.getElementsByTagName("g")[0]);
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
		},
		setOpacity: function(value) {
			this.node.style.opacity = value; 
		}
	})
})(jQuery)