window.drawcanvas = function(e) {
	function drawcanvas(can, binding, vnode)
	{
		// drawCanvas: function(can, binding, vnode) {
		var self = this;
		//- if (!self.can) self.can = vnode.elm;
		//- console.log(self.can, binding, vnode)
		//- drawThis = self.image;
		//- var drawtype = self.drawtype;//'filling';
		//- var layer = 0;
		var can = (!self.can ? $('#maincanvas')[0] : self.can);
		can.width = self.cW;
		can.height = self.cH;
		//- can.style.width = self.cW + 'px'
		//- can.style.height = self.cH + 'px'
		//- if (!self.ctx) 
		// console.log(can, binding, vnode)
		var ctx = can.getContext('2d');
		//- ctx.imageSmoothingEnabled = false;
		//- if (eventType === "touchend") {
		//self.rX++;
		//self.rY++;
		//- 
		//- }
		self.cursor = 'grabbing'
		//- console.log(self.image)
		if (
			self.drawtype === 'substrates'
			//- $('#erase').val() !== ''
		) {
			//- eventTarget.setAttribute('style', 'cursor: url("/images/icons/tools_'+0+'.svg"), grabbing;');
			ctx.fillStyle = 'rgba(0,0,0,1)';
			ctx.globalCompositeOperation = "destination-out";//context.createPattern(pCanvas, 'no-repeat');
			//- ctx.fill()
		} else {
			//- var c = document.createElement('canvas');
			//- c.width = self.cW;
			//- c.height = self.cH;
			//- c.style.width = self.cW + 'px';
			//- c.style.height = self.cH + 'px';
			//- var cx = c.getContext('2d');
			//- //- ctx.globalCompositeOperation = "source-in";
			//- //- eventTarget.setAttribute('style', 'cursor: url("/images/icons/tools_'+1+'.svg"), grabbing;');
			//- var pCanvas = document.createElement('canvas');
			//- pCanvas.width = self.cW;
			//- pCanvas.height = self.cH;
			//- pCanvas.style.width = self.cW + 'px';
			//- pCanvas.style.height = self.cH + 'px';
			//- var pContext = pCanvas.getContext('2d');
			//- pContext.drawImage(drawThis, 0, 0, self.cW, self.cH);
			//- var pPattern = cx.createPattern(pCanvas, 'repeat');
			ctx.fillStyle = '#000'
			//pPattern;
			//- console.log(ctx)
			//- ctx.fillStyle = pPattern;
			//- ctx.fill()
			//- console.log(ctx)
		}
		//- ctx.beginPath();
		//- ctx.save();
		//- ctx.moveTo(touch.pageX, touch.pageY);
		//- //- ctx.translate(touch.pageX, touch.pageY);
		//- //- ctx.scale(1, self.rY/self.rX);
		//- //- ctx.arc(0, 0, self.rX, 0, 2.0 * Math.PI, false);
		//- ctx.arc(touch.pageX, touch.pageY, self.rX, 0, 2.0 * Math.PI, false);
		//- ctx.fill()
		//- ctx.closePath();
		//- ctx.restore();
		ctx.fill();
		self.can = can
	}
}
// export drawCanvas