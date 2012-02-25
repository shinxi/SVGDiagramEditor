/**
 * This plugin is to operate mouse behavior on the gizmo. Eight widgets are concluded in this js plugin.
 * Widgets:
 *   editor.editorMouse: The base object to operate mouse operation: mousedown, mouseup, mousemove. All behaviors like drag/scale/rotate/forward/backward/copy/delete a shape 
 *                       will be defined in other widgets inherited from this widget.
 *   editor.shapeBackward: backward a shape.
 *   editor.shapeCopy: copy a shape.
 *   editor.shapeDelete: delete a shape.
 *   editor.shapeDrag: drag a shape.
 *   editor.shapeForward: forward a shape.
 *   editor.shapeRotate: rotate a shape.
 *   editor.shapeScale: scale a shape.
 * Depends:
 *	jquery.js, jquery.svg.js, jquery-ui.js
 * @author Shin.Xi
 */
(function($) {
	var mouseHandled = false;
	$( document ).mouseup( function( e ) {
		mouseHandled = false;
	});
	$.widget("editor.editorMouse", {
		options: {
		},
		_create: function() {
		},
		_mouseInit: function() {
			this.gizmo = $("#canvas").data("gizmo");
			var self = this;

			this.element
				.bind('mousedown.'+this.widgetName, function(event) {
					return self._mouseDown(event);
				})

			this.started = false;
		},

		// TODO: make sure destroying one instance of mouse doesn't mess with
		// other instances of mouse
		_mouseDestroy: function() {
			this.element.unbind('.'+this.widgetName);
		},

		_mouseDown: function(event) {
			// don't let more than one widget handle mouseStart
			if( mouseHandled ) { return };
			
			var self = this;
			var btns = this.gizmo.btns;
			var name = this.options.name;
			this._mouseStarted = (this._mouseStart(event) !== false);
			this.gizmo.mousePressed = this._mouseStarted;
			this.mousePressedPosition = {
					"x": event.clientX,
					"y": event.clientY
			}

			$.each(btns, function(key, gizmoBtn) {
				if(gizmoBtn.name != name) {
					gizmoBtn.setOpacity("0.6");
				}
			})
			
			// these delegates are required to keep context
			this._mouseMoveDelegate = function(event) {
				return self._mouseMove(event);
			};
			this._mouseUpDelegate = function(event) {
				return self._mouseUp(event);
			};
			
			$(document)
				.bind('mousemove.'+this.widgetName, this._mouseMoveDelegate)
				.bind('mouseup.'+this.widgetName, this._mouseUpDelegate);
			
			event.preventDefault();
			mouseHandled = true;
			return true;
		},

		_mouseMove: function(event) {
			// IE mouseup check - mouseup happened when mouse was out of window
			if ($.browser.msie && !(document.documentMode >= 9) && !event.button) {
				return this._mouseUp(event);
			}

			if (this._mouseStarted) {
				this._mouseDrag(event);
				return event.preventDefault();
			}

			return !this._mouseStarted;
		},

		_mouseUp: function(event) {
			$(document)
				.unbind('mousemove.'+this.widgetName, this._mouseMoveDelegate)
				.unbind('mouseup.'+this.widgetName, this._mouseUpDelegate);

			if (this._mouseStarted) {
				this._mouseStarted = false;
				this.gizmo.mousePressed = this._mouseStarted;
				this.gizmo.reset();
				this._mouseStop(event);
			}

			return false;
		},

		// These are placeholder methods, to be overriden by extending plugin
		_mouseStart: function(event) {},
		_mouseDrag: function(event) {},
		_mouseStop: function(event) {},
		_mouseCapture: function(event) { return true; }

	});
	
	$.widget("editor.shapeBackward", $.editor.editorMouse, {
		options: {
			"name": "backward"
		},
		_create: function() {
			//_mouseInit method is in mouse.js
			this._mouseInit();

		},

		destroy: function() {
			this._mouseDestroy();
			return this;
		},

		_mouseUp: function(event) {
			var shape = this.gizmo.shape;
			var shapes = shape.canvas.shapes;
			var shapeIndex = $.inArray(shape, shapes);
			for (var i=shapeIndex; i > 0; i--) {
				shapes[i] = shapes[i-1];
			}
			shapes[0] = shape;
			$("#canvas svg").prepend(shape.node);
			return $.editor.editorMouse.prototype._mouseUp.call(this, event);
		}

	});
	
	$.widget("editor.shapeCopy", $.editor.editorMouse, {
		options: {
			"name": "copy"
		},
		_create: function() {
			//_mouseInit method is in mouse.js
			this._mouseInit();

		},

		destroy: function() {
			this._mouseDestroy();
			return this;
		},

		_mouseUp: function(event) {
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
			
			return $.editor.editorMouse.prototype._mouseUp.call(this, event);
		}

	});
	
	$.widget("editor.shapeDelete", $.editor.editorMouse, {
		options: {
			"name": "del"
		},
		_create: function() {
			//_mouseInit method is in mouse.js
			this._mouseInit();

		},

		destroy: function() {
			this._mouseDestroy();
			return this;
		},

		_mouseUp: function(event) {
			var shape = this.gizmo.shape;
			var shapeRootNode = shape.node;
			var shapes = shape.canvas.shapes;
			$(shapeRootNode).remove();
			shapes.splice($.inArray(shape, shapes), 1);
			this.gizmo.hide();
			return $.editor.editorMouse.prototype._mouseUp.call(this, event);
		}

	});
	
	$.widget("editor.shapeDrag", $.editor.editorMouse, {
		options: {
			"name": "move"
		},
		_create: function() {
			//_mouseInit method is in mouse.js
			this._mouseInit();

		},

		destroy: function() {
			this._mouseDestroy();
			return this;
		},

		_mouseDrag: function(event, noPropagation) {
			var gizmo = this.gizmo;
			var shape = gizmo.shape;
			var x;
			var y;
			var mousePressedPosition = this.mousePressedPosition;
			x = event.clientX - mousePressedPosition.x;
			y = event.clientY - mousePressedPosition.y;
			this.mousePressedPosition = {
					"x": event.clientX,
					"y": event.clientY
			}
			shape.moveByRelatviePosition({"x": x, "y": y});
			gizmo.moveToShape(shape);
			event.preventDefault();
			return false;
		},

		_mouseUp: function(event) {
			return $.editor.editorMouse.prototype._mouseUp.call(this, event);
		}

	});
	
	$.widget("editor.shapeForward", $.editor.editorMouse, {
		options: {
			"name": "forward"
		},
		_create: function() {
			//_mouseInit method is in mouse.js
			this._mouseInit();

		},

		destroy: function() {
			this._mouseDestroy();
			return this;
		},

		_mouseUp: function(event) {
			var shape = this.gizmo.shape;
			var canvas = shape.canvas;
			var shapes = canvas.shapes;
			shapes.splice($.inArray(shape, shapes), 1);
			shapes.push(shape);
			$("#canvas svg").append(shape.node);
			shape.gizmo.forward();
			return $.editor.editorMouse.prototype._mouseUp.call(this, event);
		}

	});
	
	$.widget("editor.shapeRotate", $.editor.editorMouse, {
		options: {
			"name": "rotate"
		},
		_create: function() {
			this.mouseOriginAngle = 0;
			//_mouseInit method is in mouse.js
			this._mouseInit();
		},

		destroy: function() {
			this._mouseDestroy();
			return this;
		},

		_mouseStart: function(event) {
			var shape = this.gizmo.shape;
			this.rotateCanvasPosition = shape.center();
			return true;
		},

		_mouseDrag: function(event, noPropagation) {
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
			if (!mouseOriginAngle) {
				mouseOriginAngle = 180 * Math.atan2(rotateCanPos.y - mouseOriginalPos.y, mouseOriginalPos.x - rotateCanPos.x) / Math.PI;;
			}
			mouseMoveAngle = 180 * Math.atan2(rotateCanPos.y - mouseCurrentPos.y, mouseCurrentPos.x - rotateCanPos.x) / Math.PI;
			shape.rotate(mouseOriginAngle - mouseMoveAngle);
			gizmo.rotateByShape(shape);
			mouseOriginAngle = mouseMoveAngle;
			this.mouseOriginAngle = mouseOriginAngle;
			event.preventDefault();

			return false;
		},

		_mouseUp: function(event) {
			this.mouseOriginAngle = 0;
			return $.editor.editorMouse.prototype._mouseUp.call(this, event);
		}

	});
	
	$.widget("editor.shapeScale", $.editor.editorMouse, {
		options: {
			"name": "scale",
			"scaleReferPosition": null
		},
		_create: function() {
			//_mouseInit method is in mouse.js
			this._mouseInit();

		},

		destroy: function() {
			this._mouseDestroy();
			return this;
		},

		_mouseStart: function(event) {
			var shape = this.gizmo.shape;
			var shapeCenter = shape.center();
			var rotateAngle = shape.rotateAngle;
			var angle = Math.PI * rotateAngle / 180;
			var scaleReferPosition = this.options.scaleReferPosition;
			var x = scaleReferPosition.x;
			var y = scaleReferPosition.y;
			//new coordinate after rotate
			var newX = y * Math.sin(angle) + x * Math.cos(angle);
			var newY = y * Math.cos(angle) - x * Math.sin(angle);
			this.scaleReferPosition = {
					"x": shapeCenter.x + newX,
					"y": shapeCenter.y - newY
			}
			this.scaleLastPosition = null;
			return true;
		},

		_mouseDrag: function(event, noPropagation) {
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
			var referPosition = this.scaleReferPosition;
			
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
            //console.log(scaleNumber);
            shape.objectGroup.setAttributeNS(null, "transform", "scale(" + shape.scaleNumber * scaleNumber  + ")");
            gizmo.scaleNumber = scaleNumber;
			event.preventDefault();

			return false;
		},

		_mouseUp: function(event) {
			var gizmo = this.gizmo;
			var scaleNumber = gizmo.scaleNumber;
			gizmo.shape.scale(scaleNumber);
			scaleNumber = 1;
			gizmo.scaleNode.setAttributeNS(null, "transform", "scale(" + scaleNumber + ")");
			gizmo.scaleNumber = scaleNumber;
			gizmo.moveToShape(gizmo.shape);
			
			return $.editor.editorMouse.prototype._mouseUp.call(this, event);
		}

	});
})(jQuery);