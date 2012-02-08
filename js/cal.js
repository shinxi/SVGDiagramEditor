function cal(svgDocument) {
	var svgNode = svgDocument.getElementsByTagName("g")[0]; //outer most g node
	
    /**get current bounds and adjust it to upperLeft == (0,0)*/
    //initialize all SVGShape objects
    this._svgShapes = initSVGShapes(svgDocument);
    
    //get upperLeft and lowerRight of stencil
    var upperLeft = {
        x: undefined,
        y: undefined
    };
    var lowerRight = {
        x: undefined,
        y: undefined
    };
    var me = this;
    console.log(this._svgShapes);
    $(this._svgShapes).each(function(){
        upperLeft.x = (upperLeft.x !== undefined) ? Math.min(upperLeft.x, this.x) : this.x;
        upperLeft.y = (upperLeft.y !== undefined) ? Math.min(upperLeft.y, this.y) : this.y;
        lowerRight.x = (lowerRight.x !== undefined) ? Math.max(lowerRight.x, this.x + this.width) : this.x + this.width;
        lowerRight.y = (lowerRight.y !== undefined) ? Math.max(lowerRight.y, this.y + this.height) : this.y + this.height;
    });
    
    
    //set bounds of shape
    //the offsets are also needed for positioning the magnets and the docker
    var offsetX = upperLeft.x;
    var offsetY = upperLeft.y;
    
    lowerRight.x -= offsetX;
    lowerRight.y -= offsetY;
    upperLeft.x = 0;
    upperLeft.y = 0;
    
    //prevent that width or height of initial bounds is 0
    if (lowerRight.x === 0) {
        lowerRight.x = 1;
    }
    if (lowerRight.y === 0) {
        lowerRight.y = 1;
    }
    console.log(upperLeft, lowerRight);
}

function initSVGShapes(svgNode){
    var svgShapes = [];
    try {
        var svgShape = new SvgShape(svgNode);
        svgShapes.push(svgShape);
    } 
    catch (e) {
        //do nothing
    }
    
    if (svgNode.hasChildNodes()) {
        for (var i = 0; i < svgNode.childNodes.length; i++) {
            svgShapes = svgShapes.concat(initSVGShapes(svgNode.childNodes[i]));
        }
    }
    
    return svgShapes;
}

function SvgShape(svgElem) {
	this.type;
	this.element = svgElem;
	this.x = undefined;
	this.y = undefined;
	this.width = undefined;
	this.height = undefined;
	this.oldX = undefined;
	this.oldY = undefined;
	this.oldWidth = undefined;
	this.oldHeight = undefined;
	this.radiusX = undefined;
	this.radiusY = undefined;
	this.isHorizontallyResizable = false;
	this.isVerticallyResizable = false;
	//this.anchors = [];
	this.anchorLeft = false;
	this.anchorRight = false;
	this.anchorTop = false;
	this.anchorBottom = false;
	
	//attributes of path elements of edge objects
	this.allowDockers = true;
	this.resizeMarkerMid = false;

	this.editPathParser;
	this.editPathHandler;

	this.init(); //initialisation of all the properties declared above.
}

SvgShape.prototype.init = function() {
	/**initialize position and size*/
	if(this.checkClassType(this.element, SVGRectElement) || this.checkClassType(this.element, SVGImageElement)) {
		this.type = "Rect";
		
		var xAttr = this.element.getAttributeNS(null, "x");
		if(xAttr) {
			this.oldX = parseFloat(xAttr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		var yAttr = this.element.getAttributeNS(null, "y");
		if(yAttr) {
			this.oldY = parseFloat(yAttr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		var widthAttr = this.element.getAttributeNS(null, "width");
		if(widthAttr) {
			this.oldWidth = parseFloat(widthAttr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		var heightAttr = this.element.getAttributeNS(null, "height");
		if(heightAttr) {
			this.oldHeight = parseFloat(heightAttr);
		} else {
			throw "Missing attribute in element " + this.element;
		}

	} else if(this.checkClassType(this.element, SVGCircleElement)) {
		this.type = "Circle";
		
		var cx = undefined;
		var cy = undefined;
		//var r = undefined;

		var cxAttr = this.element.getAttributeNS(null, "cx");
		if(cxAttr) {
			cx = parseFloat(cxAttr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		var cyAttr = this.element.getAttributeNS(null, "cy");
		if(cyAttr) {
			cy = parseFloat(cyAttr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		var rAttr = this.element.getAttributeNS(null, "r");
		if(rAttr) {
			//r = parseFloat(rAttr);
			this.radiusX = parseFloat(rAttr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		this.oldX = cx - this.radiusX;
		this.oldY = cy - this.radiusX;
		this.oldWidth = 2*this.radiusX;
		this.oldHeight = 2*this.radiusX;

	} else if(this.checkClassType(this.element, SVGEllipseElement)) {
		this.type = "Ellipse";
		
		var cx = undefined;
		var cy = undefined;
		//var rx = undefined;
		//var ry = undefined;
		var cxAttr = this.element.getAttributeNS(null, "cx");
		if(cxAttr) {
			cx = parseFloat(cxAttr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		var cyAttr = this.element.getAttributeNS(null, "cy");
		if(cyAttr) {
			cy = parseFloat(cyAttr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		var rxAttr = this.element.getAttributeNS(null, "rx");
		if(rxAttr) {
			this.radiusX = parseFloat(rxAttr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		var ryAttr = this.element.getAttributeNS(null, "ry");
		if(ryAttr) {
			this.radiusY = parseFloat(ryAttr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		this.oldX = cx - this.radiusX;
		this.oldY = cy - this.radiusY;
		this.oldWidth = 2*this.radiusX;
		this.oldHeight = 2*this.radiusY;

	} else if(this.checkClassType(this.element, SVGLineElement)) {
		this.type = "Line";
		
		var x1 = undefined;
		var y1 = undefined;
		var x2 = undefined;
		var y2 = undefined;
		var x1Attr = this.element.getAttributeNS(null, "x1");
		if(x1Attr) {
			x1 = parseFloat(x1Attr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		var y1Attr = this.element.getAttributeNS(null, "y1");
		if(y1Attr) {
			y1 = parseFloat(y1Attr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		var x2Attr = this.element.getAttributeNS(null, "x2");
		if(x2Attr) {
			x2 = parseFloat(x2Attr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		var y2Attr = this.element.getAttributeNS(null, "y2");
		if(y2Attr) {
			y2 = parseFloat(y2Attr);
		} else {
			throw "Missing attribute in element " + this.element;
		}
		this.oldX = x1;
        this.oldY = y1;
        this.oldWidth = (x2-x1);
        this.oldHeight = (y2-y1);

	} else if(this.checkClassType(this.element, SVGPolylineElement) || this.checkClassType(this.element, SVGPolygonElement)) {
		this.type = "Polyline";
		
		var points = this.element.getAttributeNS(null, "points");

		if(points) {
			points = points.replace(/,/g , " ");
			var pointsArray = points.split(" ");
			pointsArray = pointsArray.without("");

			if(pointsArray && pointsArray.length && pointsArray.length > 1) {
				var minX = parseFloat(pointsArray[0]);
				var minY = parseFloat(pointsArray[1]);
				var maxX = parseFloat(pointsArray[0]);
				var maxY = parseFloat(pointsArray[1]);

				for(var i = 0; i < pointsArray.length; i++) {
					minX = Math.min(minX, parseFloat(pointsArray[i]));
					maxX = Math.max(maxX, parseFloat(pointsArray[i]));
					i++;
					minY = Math.min(minY, parseFloat(pointsArray[i]));
					maxY = Math.max(maxY, parseFloat(pointsArray[i]));
				}

				this.oldX = minX;
				this.oldY = minY;
				this.oldWidth = maxX-minX;
				this.oldHeight = maxY-minY;
			} else {
				throw "Missing attribute in element " + this.element;
			}
		} else {
			throw "Missing attribute in element " + this.element;
		}

	} else if(this.checkClassType(this.element, SVGPathElement)) {
		this.type = "Path";
		var parser = new PathParser();
		var handler = new MinMaxPathHandler();
		parser.setHandler(handler);
		parser.parsePath(this.element);

		this.oldX = handler.minX;
		this.oldY = handler.minY;
		this.oldWidth = handler.maxX - handler.minX;
		this.oldHeight = handler.maxY - handler.minY;

		delete parser;
		delete handler;
	} else {
		throw "Element is not a shape.";
	}

	this.x = this.oldX;
	this.y = this.oldY;
	this.width = this.oldWidth;
	this.height = this.oldHeight;
}

SvgShape.prototype.checkClassType = function(ele, type) {
	/*
	var SVGSVGElement 		= document.createElementNS('http://www.w3.org/2000/svg', 'svg').toString();
	var SVGGElement 		= document.createElementNS('http://www.w3.org/2000/svg', 'g').toString();
	var SVGPathElement 		= document.createElementNS('http://www.w3.org/2000/svg', 'path').toString();
	var SVGTextElement 		= document.createElementNS('http://www.w3.org/2000/svg', 'text').toString();
	//SVGMarkerElement 	= document.createElementNS('http://www.w3.org/2000/svg', 'marker').toString();
	var SVGRectElement 		= document.createElementNS('http://www.w3.org/2000/svg', 'rect').toString();
	var SVGImageElement 	= document.createElementNS('http://www.w3.org/2000/svg', 'image').toString();
	var SVGCircleElement 	= document.createElementNS('http://www.w3.org/2000/svg', 'circle').toString();
	var SVGEllipseElement 	= document.createElementNS('http://www.w3.org/2000/svg', 'ellipse').toString();
	var SVGLineElement	 	= document.createElementNS('http://www.w3.org/2000/svg', 'line').toString();
	var SVGPolylineElement 	= document.createElementNS('http://www.w3.org/2000/svg', 'polyline').toString();
	var SVGPolygonElement 	= document.createElementNS('http://www.w3.org/2000/svg', 'polygon').toString();*/
	return ele instanceof type;
}

function Svg(){}
function PathParser(){this._lexer=new PathLexer();this._handler=null;}
Svg.NAMESPACE="http://www.w3.org/2000/svg";
PathParser.PARAMCOUNT={A:7,C:6,H:1,L:2,M:2,Q:4,S:4,T:2,V:1,Z:0};
PathParser.METHODNAME={A:"arcAbs",a:"arcRel",C:"curvetoCubicAbs",c:"curvetoCubicRel",H:"linetoHorizontalAbs",h:"linetoHorizontalRel",L:"linetoAbs",l:"linetoRel",M:"movetoAbs",m:"movetoRel",Q:"curvetoQuadraticAbs",q:"curvetoQuadraticRel",S:"curvetoCubicSmoothAbs",s:"curvetoCubicSmoothRel",T:"curvetoQuadraticSmoothAbs",t:"curvetoQuadraticSmoothRel",V:"linetoVerticalAbs",v:"linetoVerticalRel",Z:"closePath",z:"closePath"}
PathParser.prototype.parsePath=function(path){if(path==null||path.namespaceURI!=Svg.NAMESPACE||path.localName!="path")throw new Error("PathParser.parsePath: The first parameter must be an SVG path element");this.parseData(path.getAttributeNS(null,"d"));};
PathParser.prototype.parseData=function(pathData){if(typeof(pathData)!="string")throw new Error("PathParser.parseData: The first parameter must be a string");if(this._handler!=null&&this._handler.beginParse!=null)this._handler.beginParse();var lexer=this._lexer;lexer.setPathData(pathData);var mode="BOP";var token=lexer.getNextToken();while(!token.typeis(PathToken.EOD)){var param_count;var params=new Array();switch(token.type){case PathToken.COMMAND:if(mode=="BOP"&&token.text!="M"&&token.text!="m")throw new Error("PathParser.parseData: a path must begin with a moveto command");mode=token.text;param_count=PathParser.PARAMCOUNT[token.text.toUpperCase()];token=lexer.getNextToken();break;case PathToken.NUMBER:break;default:throw new Error("PathParser.parseData: unrecognized token type: "+token.type);}for(var i=0;i<param_count;i++){switch(token.type){case PathToken.COMMAND:throw new Error("PathParser.parseData: parameter must be a number: "+token.text);case PathToken.NUMBER:params[i]=token.text-0;break;default:throw new Errot("PathParser.parseData: unrecognized token type: "+token.type);}token=lexer.getNextToken();}if(this._handler!=null){var handler=this._handler;var method=PathParser.METHODNAME[mode];if(handler[method]!=null)handler[method].apply(handler,params);}if(mode=="M")mode="L";if(mode=="m")mode="l";}};
PathParser.prototype.setHandler=function(handler){this._handler=handler;};
PathLexer.VERSION=1.0;
function PathLexer(pathData){if(pathData==null)pathData="";this.setPathData(pathData);}
PathLexer.prototype.setPathData=function(pathData){if(typeof(pathData)!="string")throw new Error("PathLexer.setPathData: The first parameter must be a string");this._pathData=pathData;};
PathLexer.prototype.getNextToken=function(){var result=null;var d=this._pathData;while(result==null){if(d==null||d==""){result=new PathToken(PathToken.EOD,"");}else if(d.match(/^([ \t\r\n,]+)/)){d=d.substr(RegExp.$1.length);}else if(d.match(/^([AaCcHhLlMmQqSsTtVvZz])/)){result=new PathToken(PathToken.COMMAND,RegExp.$1);d=d.substr(RegExp.$1.length);}else if(d.match(/^(([-+]?[0-9]+(\.[0-9]*)?|[-+]?\.[0-9]+)([eE][-+]?[0-9]+)?)/)){result=new PathToken(PathToken.NUMBER,parseFloat(RegExp.$1));d=d.substr(RegExp.$1.length);}else{throw new Error("PathLexer.getNextToken: unrecognized path data "+d);}}this._pathData=d;return result;};
PathToken.UNDEFINED=0;
PathToken.COMMAND=1;
PathToken.NUMBER=2;
PathToken.EOD=3;
function PathToken(type,text){if(arguments.length>0){this.init(type,text);}}
PathToken.prototype.init=function(type,text){this.type=type;this.text=text;};
PathToken.prototype.typeis=function(type){return this.type==type;}

function MinMaxPathHandler() {
	
	this.minX = undefined;
	this.minY = undefined;
	this.maxX = undefined;
	this.maxY = undefined;
	this._lastAbsX = undefined;
	this._lastAbsY = undefined;
	
}
$.extend(MinMaxPathHandler.prototype, {
	/**
	 * Store minimal and maximal coordinates of passed points to attributes minX, maxX, minY, maxY
	 * 
	 * @param {Array} points Array of absolutePoints
	 */
	calculateMinMax: function(points) {
		if(points instanceof Array) {
			var x, y;
			for(var i = 0; i < points.length; i++) {
				x = parseFloat(points[i]);
				i++;
				y = parseFloat(points[i]);
				
				this.minX = (this.minX !== undefined) ? Math.min(this.minX, x) : x;
				this.maxX = (this.maxX !== undefined) ? Math.max(this.maxX, x) : x;
				this.minY = (this.minY !== undefined) ? Math.min(this.minY, y) : y;
				this.maxY = (this.maxY !== undefined) ? Math.max(this.maxY, y) : y;
					
				this._lastAbsX = x;
				this._lastAbsY = y;
			}
		} else {
			//TODO error
		}
	},

	/**
	 * arcAbs - A
	 * 
	 * @param {Number} rx
	 * @param {Number} ry
	 * @param {Number} xAxisRotation
	 * @param {Boolean} largeArcFlag
	 * @param {Boolean} sweepFlag
	 * @param {Number} x
	 * @param {Number} y
	 */
	arcAbs: function(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
	    this.calculateMinMax([x, y]);
	},

	/**
	 * arcRel - a
	 * 
	 * @param {Number} rx
	 * @param {Number} ry
	 * @param {Number} xAxisRotation
	 * @param {Boolean} largeArcFlag
	 * @param {Boolean} sweepFlag
	 * @param {Number} x
	 * @param {Number} y
	 */
	arcRel: function(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
	    this.calculateMinMax([this._lastAbsX + x, this._lastAbsY + y]);
	},

	/**
	 * curvetoCubicAbs - C
	 * 
	 * @param {Number} x1
	 * @param {Number} y1
	 * @param {Number} x2
	 * @param {Number} y2
	 * @param {Number} x
	 * @param {Number} y
	 */
	curvetoCubicAbs: function(x1, y1, x2, y2, x, y) {
	    this.calculateMinMax([x1, y1, x2, y2, x, y]);
	},

	/**
	 * curvetoCubicRel - c
	 * 
	 * @param {Number} x1
	 * @param {Number} y1
	 * @param {Number} x2
	 * @param {Number} y2
	 * @param {Number} x
	 * @param {Number} y
	 */
	curvetoCubicRel: function(x1, y1, x2, y2, x, y) {
	    this.calculateMinMax([this._lastAbsX + x1, this._lastAbsY + y1,
							  this._lastAbsX + x2, this._lastAbsY + y2,
							  this._lastAbsX + x, this._lastAbsY + y]);
	},

	/**
	 * linetoHorizontalAbs - H
	 * 
	 * @param {Number} x
	 */
	linetoHorizontalAbs: function(x) {
	    this.calculateMinMax([x, this._lastAbsY]);
	},

	/**
	 * linetoHorizontalRel - h
	 * 
	 * @param {Number} x
	 */
	linetoHorizontalRel: function(x) {
	    this.calculateMinMax([this._lastAbsX + x, this._lastAbsY]);
	},

	/**
	 * linetoAbs - L
	 * 
	 * @param {Number} x
	 * @param {Number} y
	 */
	linetoAbs: function(x, y) {
	    this.calculateMinMax([x, y]);
	},

	/**
	 * linetoRel - l
	 * 
	 * @param {Number} x
	 * @param {Number} y
	 */
	linetoRel: function(x, y) {
	    this.calculateMinMax([this._lastAbsX + x, this._lastAbsY + y]);
	},

	/**
	 * movetoAbs - M
	 * 
	 * @param {Number} x
	 * @param {Number} y
	 */
	movetoAbs: function(x, y) {
	    this.calculateMinMax([x, y]);
	},

	/**
	 * movetoRel - m
	 * 
	 * @param {Number} x
	 * @param {Number} y
	 */
	movetoRel: function(x, y) {
	    if(this._lastAbsX && this._lastAbsY) {
			this.calculateMinMax([this._lastAbsX + x, this._lastAbsY + y]);
		} else {
			this.calculateMinMax([x, y]);
		}
	},

	/**
	 * curvetoQuadraticAbs - Q
	 * 
	 * @param {Number} x1
	 * @param {Number} y1
	 * @param {Number} x
	 * @param {Number} y
	 */
	curvetoQuadraticAbs: function(x1, y1, x, y) {
	    this.calculateMinMax([x1, y1, x, y]);
	},

	/**
	 * curvetoQuadraticRel - q
	 * 
	 * @param {Number} x1
	 * @param {Number} y1
	 * @param {Number} x
	 * @param {Number} y
	 */
	curvetoQuadraticRel: function(x1, y1, x, y) {
	    this.calculateMinMax([this._lastAbsX + x1, this._lastAbsY + y1, this._lastAbsX + x, this._lastAbsY + y]);
	},

	/**
	 * curvetoCubicSmoothAbs - S
	 * 
	 * @param {Number} x2
	 * @param {Number} y2
	 * @param {Number} x
	 * @param {Number} y
	 */
	curvetoCubicSmoothAbs: function(x2, y2, x, y) {
	    this.calculateMinMax([x2, y2, x, y]);
	},

	/**
	 * curvetoCubicSmoothRel - s
	 * 
	 * @param {Number} x2
	 * @param {Number} y2
	 * @param {Number} x
	 * @param {Number} y
	 */
	curvetoCubicSmoothRel: function(x2, y2, x, y) {
	    this.calculateMinMax([this._lastAbsX + x2, this._lastAbsY + y2, this._lastAbsX + x, this._lastAbsY + y]);
	},

	/**
	 * curvetoQuadraticSmoothAbs - T
	 * 
	 * @param {Number} x
	 * @param {Number} y
	 */
	curvetoQuadraticSmoothAbs: function(x, y) {
	    this.calculateMinMax([x, y]);
	},

	/**
	 * curvetoQuadraticSmoothRel - t
	 * 
	 * @param {Number} x
	 * @param {Number} y
	 */
	curvetoQuadraticSmoothRel: function(x, y) {
	    this.calculateMinMax([this._lastAbsX + x, this._lastAbsY + y]);
	},

	/**
	 * linetoVerticalAbs - V
	 * 
	 * @param {Number} y
	 */
	linetoVerticalAbs: function(y) {
	    this.calculateMinMax([this._lastAbsX, y]);
	},

	/**
	 * linetoVerticalRel - v
	 * 
	 * @param {Number} y
	 */
	linetoVerticalRel: function(y) {
	    this.calculateMinMax([this._lastAbsX, this._lastAbsY + y]);
	},

	/**
	 * closePath - z or Z
	 */
	closePath: function() {
	    return;// do nothing
	}
});