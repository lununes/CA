/**
* Jquery
**/

function DragDrop(vars) {
	//constructor
		
	this._screen = vars.element._screen;
	this._element = vars.element;
	this._container = vars.element._container;
	this._xml = vars.element._xml;
	
	this._dropScale = 1;
	this._arDrags = [];
	this._arDrops = [];
	this._arFeedback = [];
	this._feedbackContainer;
	this._maxAttempts = null;
	this._numAttempts = 0;
	this._showGenericFb = true;
	this._forceDragAll = true;
}

DragDrop.prototype = {
	//DragDrop methods
	
	init:function(){
		/**
			<dragdropsettings dropscale="0.6" />

			<drag match="1">dragTxt1</drag>
			<drag match="1">dragTxt2</drag>
			<drag match="1">dragTxt3</drag>
			<drag match="1">dragTxt4</drag>
			<drag match="1">dragTxt5</drag>
			<drag match="2">dragImg6</drag>
			<drag match="2">dragImg7</drag>
			<drag match="2">dragImg8</drag>
			<drag match="2">dragImg9</drag>
			<drag match="-1">Vid1</drag>
			
			<drop id="1" dropposition="over" stack="true" stackpaddingv="2" stackpaddingh="2" maxdrop="5" xoffset="7" yoffset="12">dropBox1</drop>
			<drop id="2" dropposition="over" stack="true" stackpaddingv="2" stackpaddingh="2" maxdrop="5" xoffset="7" yoffset="12">dropBox2</drop>
	
		**/
		
		//read the settings
		var settings = this._xml.find("settings");
		if(settings.length > 0){
			if(xmlAttrNum(settings,"dropscale")){ this._dropScale = parseFloat(settings.attr("dropscale")); }
			if(xmlAttrNum(settings,"attempts")){this._maxAttempts = parseInt(settings.attr("attempts")); }
			if(xmlAttrStr(settings,"forcedragall")){this._forceDragAll = Boolean(settings.attr("forcedragall") == "true"); }
		}
		
		//populate the _arDrags array
		var scope = this;
		$(this._xml).find('drag').each(function () {
			var oDrag = {};
			oDrag.match = $(this).attr("match");
			if(oDrag.match == ""){ oDrag.match = "-1";}
			oDrag.elementId = $(this).text();
			oDrag.element = scope._screen.getElementById(oDrag.elementId);
			oDrag.container = oDrag.element._container;
			oDrag.origX = parseInt($(oDrag.container).css("left"));
			oDrag.origY = parseInt($(oDrag.container).css("top"))
			oDrag.origH = parseInt($(oDrag.container).css("height"));
			oDrag.origW = parseInt($(oDrag.container).css("width"));
			oDrag.origScale = 1;

			oDrag.event = null;
			if($(this).attr("event")){oDrag.event = $(this).attr("event");}
			
			oDrag.dropped = false; //this is set to a drop object when dropped
			scope._arDrags.push(oDrag);
		})
		
		//populate the _arDrops array
		$(this._xml).find('drop').each(function () {
			var oDrop = {};
			oDrop.id = $(this).attr("id");
			oDrop.elementId = $(this).text();
			oDrop.element = scope._screen.getElementById(oDrop.elementId);
			oDrop.container = oDrop.element._container;
			
			//set defaults
			oDrop.dropposition = "over";
			oDrop.stackitems = true;
			oDrop.stackpaddingv = 0;
			oDrop.stackpaddingh = 0;
			oDrop.rowheight = 0;
			oDrop.maxdrop = null;
			oDrop.xoffset = 0;
			oDrop.yoffset = 0;
			oDrop.itemStack = [];
			oDrop.smaItemStack = [];
			
			if(xmlAttrStr($(this),"dropposition")){ oDrop.dropposition = $(this).attr("dropposition").toLowerCase(); }
			if(xmlAttrStr($(this),"stack")){ oDrop.stackitems = Boolean($(this).attr("stack").toLowerCase() === "true"); }
			if(xmlAttrNum($(this),"stackpaddingv")){ oDrop.stackpaddingv = parseInt($(this).attr("stackpaddingv")); }
			if(xmlAttrNum($(this),"stackpaddingh")){ oDrop.stackpaddingh = parseInt($(this).attr("stackpaddingh")); }
			if(xmlAttrNum($(this),"maxdrop")){ oDrop.maxdrop = parseInt($(this).attr("maxdrop")); }
			if(xmlAttrNum($(this),"xoffset")){ oDrop.xoffset = parseInt($(this).attr("xoffset")); }
			if(xmlAttrNum($(this),"yoffset")){ oDrop.yoffset = parseInt($(this).attr("yoffset")); }
			
			scope._arDrops.push(oDrop);		
		})
		
		//create the feedback container
		//so we can empty the container on reset
		this._feedbackContainer = create({type:"div",id:"feedback"});
		$(this._feedbackContainer).css("left",0);
		$(this._feedbackContainer).css("top",0);
		this._screen._container.appendChild(this._feedbackContainer);
		
		//create the feedback array
		$(this._xml).find('fb').each(function () {
			var obj = {};
			obj._id = $(this).attr("id");
			obj._elements = [];
			obj._event = null;
			if($(this).attr("event")) obj._event = $(this).attr("event");
			
			$(this).children().each(function () {
				var fbEl = new Element({screen:scope._screen, xml:this})
				fbEl._target = scope._feedbackContainer;
				obj._elements.push(fbEl);
			})
			
			//each item in the feedback array is an object 
			//with an id, eg, "pass", and an array of elements
			scope._arFeedback.push(obj);
		})
		
		//create any buttons
		$(this._xml).find('button').each(function () {
			var oBtnElement = new Element({screen:scope._screen, xml:this});
			oBtnElement._target = scope._container.id;
			scope._screen.getElementLoaderArray().push(oBtnElement);
		})
		
		this.initDrags();
	},
	
	initDrags:function(){
		//setup dragging
		var drag;
		var scope = this;
		for(var i=0; i<this._arDrags.length; i++){
			drag = this._arDrags[i];
			$(drag.container).data("scope",this);
			$(drag.container).css("cursor", "pointer");
			$(drag.container).children().css("cursor", "pointer");
			
			var sHelper = "original"; //or clone or function
			$(drag.container).draggable({ start: scope.downHandler, drag: scope.dragHandler, stop: scope.upHandler, containment: scope._screen._container, helper: sHelper, revert: false }); 
		}
	},
	
	dragHandler:function(){
		//dragging in progress	
	},
	
	downHandler:function(pDragId){
		//mouse/finger down on a draggable
		
		//note: 
		//when this function is called from jquery UI draggable, the jquery drag object is passed forward
		//when this function is called from jquery touch punch, the id of the drag object is passed forward
		//so resolve the target first
		var dragSprite;
		var dragId;
		
		if(typeof(pDragId) == "object"){
			 dragSprite = $(this);
			 dragId = this.id;
		} else {
			dragSprite = $("#"+pDragId);
			dragId = pDragId;
		}
		
		var scope = dragSprite.data("scope");
		dragSprite.css("z-index",20);
		
		
		//note: keep this as 0 tween time otherwise the mouse can leave the sprite bounds
		//TweenMax.to(dragSprite, 0, {delay:0, scale:1.1, transformOrigin:"center center", ease:"Regular.easeOut", onComplete:null});
		var animobj  = {scale:1.1};
		$(dragSprite).animate(animobj, { duration: 0});
		
		var drag = scope.getDragById(dragId);
		if(drag.dropped){
			scope.removeDrag(drag);
		}
	},
	
	upHandler:function(pDragId) {
		//mouse/finger up on a draggable
		
		//note: 
		//when this function is called from jquery UI draggable, the jquery drag object is passed forward
		//when this function is called from jquery touch punch, the id of the drag object is passed forward
		//so resolve the target first
		var dragSprite;
		var dragId;
		
		if(typeof(pDragId) == "object"){
			 dragSprite = $(this);
			 dragId = this.id;
		} else {
			dragSprite = $("#"+pDragId);
			dragId = pDragId;
		}
				
		var scope = dragSprite.data("scope");
		dragSprite.css("z-index",1);
				
		var drag = scope.getDragById(dragId);
		var drop;
		var hitDrop = null;
		
		//hit test for dragged sprite on all dropzones
		for(var i=0; i<scope._arDrops.length; i++){
			drop = scope._arDrops[i];
			if($(drag.container).hitTestObject($(drop.container))){
				hitDrop = drop;
				break;
			} 
		}
		
		//drop if hittest on a dropzone is successfull 
		//otherwise snap back
		if(hitDrop){
			//check the drop zone is not full and if not: drop it
			var numDropped = hitDrop.itemStack.length;
			var dropFull = false;
			if(hitDrop.maxdrop){ dropFull = Boolean(numDropped >= hitDrop.maxdrop); }
			(dropFull) ? scope.snapBack(drag) : scope.doDrop(drag,hitDrop);
		} else {
			scope.snapBack(drag);
		}
	},
	
	doDrop:function(drag,hitDrop){
		drag.dropped = hitDrop; //make "dropped" the drop object
		this.doDropPosition(drag,hitDrop);
		this.checkAllDropped();
		if(drag.event){this._screen.doClickEventById(drag.event);}
	},
	
	doDropPosition:function(drag,hitDrop) {
		var target_x = parseInt($(hitDrop.container).css("left"));
		var target_y = parseInt($(hitDrop.container).css("top"));
		
		var lrPadding =  parseInt($(drag.container).css("padding-left")) + parseInt($(drag.container).css("padding-right"))
		var tbPadding =  parseInt($(drag.container).css("padding-top")) + parseInt($(drag.container).css("padding-bottom"))
			
		var scaleh = (drag.origH + tbPadding) * this._dropScale;
		var scalew = (drag.origW + lrPadding) * this._dropScale;
		
		if(hitDrop.stackitems){ 
			if(hitDrop.itemStack.length>0){
				var prev_item = hitDrop.itemStack[hitDrop.itemStack.length-1];
				
				var plrPadding =  parseInt($(prev_item.container).css("padding-left")) + parseInt($(drag.container).css("padding-right"))
				var ptbPadding =  parseInt($(prev_item.container).css("padding-top")) + parseInt($(drag.container).css("padding-bottom"))
				
				drag.targX = prev_item.targX + (( $(prev_item.container).width() + plrPadding) * this._dropScale) + hitDrop.stackpaddingh;
				drag.targY = prev_item.targY;
				
				if(drag.targX + scalew > target_x + parseInt($(hitDrop.container).width()) - (hitDrop.xoffset * 2)){
					drag.targX = target_x + hitDrop.xoffset;
					drag.targY = prev_item.targY + hitDrop.rowheight + hitDrop.stackpaddingv;
					hitDrop.rowheight = 0;
				}
			} else {
				drag.targX = target_x + hitDrop.xoffset;
				drag.targY = target_y + hitDrop.yoffset;
			}
		} else {
			drag.targX = target_x + hitDrop.xoffset;
			drag.targY = target_y + hitDrop.yoffset;
		}
		
		hitDrop.itemStack.push(drag);
	
		if(scaleh > hitDrop.rowheight){
			hitDrop.rowheight = scaleh;//set the row height to the largest height;
		}
				
		//the timeout improves smoothness of release on a touch device
		with(this){ setTimeout(function(){setPos(drag, hitDrop, drag.targX, drag.targY)},200) }
	},
	
	setPos:function(drag, hitDrop, tx, ty){
		var iScale = drag.origScale * this._dropScale;
		var alph = 1;
		if(hitDrop.dropposition === "hide" || hitDrop.dropposition === "hidden") {alph = 0;}
		//TweenMax.to(drag.container, 0.3, {scale:iScale, autoAlpha:alph, transformOrigin:"top left"});//keep this seperate
		//TweenMax.to(drag.container, 0.3, {left:tx, top:ty});

		var l = tx - ( $(drag.container).width() * iScale ) /2
		var t = ty - ( $(drag.container).height() * iScale ) /2
		var animobj  = {scale:iScale,opacity:alph,left:l,top:t};
		$(drag.container).animate(animobj, { duration: 300});
	},
	
	snapBack:function(drag){
		drag.dropped = false;
		//TweenMax.to(drag.container, 0.5, {scale:1, autoAlpha:1, transformOrigin:"center center"});//keep this seperate
		//TweenMax.to(drag.container, 0.5, {left:drag.origX, top:drag.origY});
		var animobj  = {scale:1,opacity:1,left:drag.origX,top:drag.origY};
		$(drag.container).animate(animobj, { duration: 500});
	},
	
	removeDrag:function(drag){
		var drop = drag.dropped;
		var dropStack = drop.itemStack
		var newstack = [];
		for(var i = 0;i<dropStack.length; i++){
			if(dropStack[i].elementId != drag.elementId){
				newstack.push(dropStack[i]);
			}
		}
		
		drag.dropped = false;
		this.restack(newstack, drop);
	},

	restack:function(newstack, drop){
		drop.itemStack = [];
		drop.rowheight = 0;
		for(var i=0; i<newstack.length; i++){
			this.doDropPosition(newstack[i],drop);
		}
	},
	
	checkAllDropped:function(){
		var bAllDragged = true;
		for(var i=0;i<this._arDrags.length;i++){
			if(!this._arDrags[i].dropped && this._arDrags[i].match != -1){
				bAllDragged = false;
				break;
			}
		}
		var confirmBtn = this._screen.getElementById("submitBtn");
		
		if(this._forceDragAll){
			(bAllDragged) ? confirmBtn.enableBtn() : confirmBtn.disableBtn();
		} else {
			confirmBtn.enableBtn();
		}
	},
	
	getFeedbackById:function(id){
		for (var i=0;i<this._arFeedback.length;i++){
			if(this._arFeedback[i]._id == id){
				return this._arFeedback[i];
				break;
			}
		}
	},
	
	submit:function(vars){
		var userCorrectCount = 0;
		var allCorrect = false;
		var fb;
		var scope = this;
		
		var confirmBtn = this._screen.getElementById("submitBtn");
		if(confirmBtn){ confirmBtn.disableBtn(); }
		
		var resetBtn = this._screen.getElementById("resetBtn");
		if(resetBtn){ resetBtn.enableBtn(); }
		
		//remember the drop stacks
		for (var i=0;i<this._arDrops.length;i++) {
			var drop = this._arDrops[i];
			drop.smaItemStack = drop.itemStack;
		}
		
		for (var i=0;i<this._arDrags.length;i++) {
			var drag = this._arDrags[i];
			
			//disable drags
			$(drag.container).draggable("destroy");
			$(drag.container).css("cursor","default");
			$(drag.container).children().css("cursor","default");
			
			if(drag.match == -1 && !drag.dropped){
				//no match and not dragged so correct;
				userCorrectCount++;
			} 
			if(drag.match != -1){
				var bCorrect = false;

				if(drag.dropped.id == drag.match) bCorrect = true;
				if (drag.match.indexOf(",") != "-1"){
					var splitArray = drag.match.split(",");
					for (var j=0; j<splitArray.length;j++){
						if(parseInt(splitArray[j]) == drag.dropped.id){
							bCorrect = true;
							break;
						}
					}
				}

				if(bCorrect){
					userCorrectCount++;
				}
			}
		}
		
		//handle feedback
		var arFbElements = [];
				
		if(userCorrectCount == this._arDrags.length){
			//all correct
			fb = this.getFeedbackById("pass");
		} else {
			if(userCorrectCount > 0){
				//some correct
				fb = this.getFeedbackById("partial");
			} else {
				//none correct
				fb = this.getFeedbackById("fail");
			}
		}
		
		//load feedback elements into an array
		//replace any reserved words 		
		$(fb._elements).each(function () {
			var copyNode = this._xml[0].cloneNode(true);
			var xmlNode = replaceXMLStr(copyNode,"[number]",drop.itemStack.length) ; //replaces the value of the original xml node
			var element = new Element({screen:scope._screen, xml:copyNode});
			element._target = scope._feedbackContainer;
			arFbElements.push(element);
		})
		
		//send a copy of the feedback array to the element loader
		//this is so that if the loader array length is increased by box nested elements
		//the copied array is updated not the orginal array
		var fbCopy = [];
		fbCopy = arFbElements.slice();
		arFbElements = [];
		
		//load the feedback elements
		var fbLoader = new ElementLoader({screen:this._screen, elements:fbCopy});
		fbLoader.load();
		
		this._numAttempts++;
		
		//enable sca if appropriate
		if(userCorrectCount != this._arDrags.length){
			var scaBtn = this._screen.getElementById("scaBtn");
			if(scaBtn){ 
				if(this._maxAttempts){
					if(this._numAttempts >= this._maxAttempts){ 
						scaBtn.enableBtn(); 
					}
				} else {
					scaBtn.enableBtn(); 
				}
			}
		}
		
		//fire any events defined for the feedback
		if(fb._event) {
			var str = fb._event.split(" ").join("").toString();
			var arSplit = str.split(",")
			for(var i=0;i<arSplit.length;i++){
				this._screen.doClickEventById(arSplit[i],null);
			}
		}
	},
	
	customSubmit:function(vars){
		//this is left in as an example of adding a custom sumbit function
		//called from an xml event
		var userCorrectCount = 0;
		var allCorrect = false;
		var fb;
		var scope = this;
		
		var confirmBtn = this._screen.getElementById("submitBtn");
		if(confirmBtn){ confirmBtn.disableBtn(); }
		
		var resetBtn = this._screen.getElementById("resetBtn");
		if(resetBtn){ resetBtn.enableBtn(); }
		
		//remember the drop stacks
		for (var i=0;i<this._arDrops.length;i++) {
			var drop = this._arDrops[i];
			drop.smaItemStack = drop.itemStack;
		}
		
		for (var i=0;i<this._arDrags.length;i++) {
			var drag = this._arDrags[i];
			
			//disable drags
			$(drag.container).draggable("destroy");
			$(drag.container).css("cursor","default");
			$(drag.container).children().css("cursor","default");
			
			if(drag.match == -1 && !drag.dropped){
				//no match and not dropped so correct;
				userCorrectCount++;
			} 
			if(drag.match != -1){
				var bCorrect = false;

				if(drag.dropped.id == drag.match) bCorrect = true;
				if (drag.match.indexOf(",") != "-1"){
					var splitArray = drag.match.split(",");
					for (var j=0; j<splitArray.length;j++){
						if(parseInt(splitArray[j]) == drag.dropped.id){
							bCorrect = true;
							break;
						}
					}
				}

				if(bCorrect){
					userCorrectCount++;
				}
			}
		}
		
		//handle feedback
		var arFbElements = [];
				
		//custom
		if(drop.itemStack.length === 1){
			fb = this.getFeedbackById("pass");
		} else if(drop.itemStack.length < 5){
			fb = this.getFeedbackById("fail");
		} else {
			fb = this.getFeedbackById("fail2");
		}
		//end custom
		
		//load feedback elements into an array
		//replace any reserved words 		
		$(fb._elements).each(function () {
			var copyNode = this._xml[0].cloneNode(true);
			var xmlNode = replaceXMLStr(copyNode,"[number]",drop.itemStack.length) ; //replaces the value of the original xml node
			var element = new Element({screen:scope._screen, xml:copyNode});
			element._target = scope._feedbackContainer;
			arFbElements.push(element);
		})
		
		//send a copy of the feedback array to the element loader
		//this is so that if the loader array length is increased by box nested elements
		//the copied array is updated not the orginal array
		var fbCopy = [];
		fbCopy = arFbElements.slice();
		arFbElements = [];
		
		//load the feedback elements
		var fbLoader = new ElementLoader({screen:this._screen, elements:fbCopy});
		fbLoader.load();
		
		//fire any events defined for the feedback
		if(fb._event) {
			var str = fb._event.split(" ").join("").toString();
			var arSplit = str.split(",")
			for(var i=0;i<arSplit.length;i++){
				this._screen.doClickEventById(arSplit[i],null);
			}
		}
	},

	sca:function(vars){
		var scaBtn = this._screen.getElementById("scaBtn");
		if(scaBtn){ scaBtn.hide(); }
		
		var smaBtn = this._screen.getElementById("smaBtn");
		if(smaBtn){ smaBtn.enableBtn(); }
		
		//reset the drops
		for (var i=0;i<this._arDrops.length;i++) {
			var drop = this._arDrops[i];
			drop.itemStack = [];
			drop.rowheight = 0;
		}
			
		//send each drag to its correct dropzone
		for (var i=0;i<this._arDrags.length;i++) {
			var drag = this._arDrags[i];
			if(drag.match != -1){
				var splitArray = drag.match.split(",");
				var correctDrop = this.getDropById(splitArray[0]);//in the case of multiple correct drop zones, sca uses the first in the list
				this.doDropPosition(drag,correctDrop);
			} else {
				//return to orig position
				//TweenMax.to(drag.container, 0.5, {scale:1, autoAlpha:1, transformOrigin:"center center"});//keep this seperate
				//TweenMax.to(drag.container, 0.5, {left:drag.origX, top:drag.origY});
				var animobj  = {scale:1,opacity:1,left:drag.origX,top:drag.origY};
				$(drag.container).animate(animobj, { duration: 500});
			}
		}
		
		var fb = this.getFeedbackById("generic");
		if(fb && this._showGenericFb){
			this._showGenericFb = false; //prevent reloading the generic fb when toggling
			
			//unload the feedback elements
			this._feedbackContainer.innerHTML = "";
			
			//send a copy of the feedback array to the element loader
			//this is so that if the loader array length is increased by box nested elements
			//the copied array is updated not the orginal array
			var fbCopy = [];
			fbCopy = fb._elements.slice();
			
			//load the feedback elements
			var fbLoader = new ElementLoader({screen:this._screen, elements:fbCopy});
			fbLoader.load();
		}
	},
	
	sma:function(vars){
		var scaBtn = this._screen.getElementById("scaBtn");
		if(scaBtn){ scaBtn.enableBtn(); }
		
		var smaBtn = this._screen.getElementById("smaBtn");
		if(smaBtn){ smaBtn.hide(); }
		
		//reset the drops
		for (var i=0;i<this._arDrops.length;i++) {
			var drop = this._arDrops[i];
			drop.itemStack = [];
			drop.rowheight = 0;
		}
		
		//send each drag to the drop zone the user selected (or snap back if not dropped)
		for (var i=0;i<this._arDrags.length;i++) {
			var drag = this._arDrags[i];
			if(drag.dropped){
				this.doDropPosition(drag,drag.dropped)
			} else {
				this.snapBack(drag);
			}
		}
	},
	
	reset:function(vars){
		var confirmBtn = this._screen.getElementById("submitBtn");
		confirmBtn.disableBtn();
		confirmBtn.rollout();
		
		var resetBtn = this._screen.getElementById("resetBtn");
		resetBtn.hide();
		resetBtn.rollout();
		
		var scaBtn = this._screen.getElementById("scaBtn");
		if(scaBtn){ scaBtn.hide(); }
		
		var smaBtn = this._screen.getElementById("smaBtn");
		if(smaBtn){ smaBtn.hide(); }
		
		//reset the drags
		for (var i=0;i<this._arDrags.length;i++) {
			var drag = this._arDrags[i];
			this.snapBack(drag);
		}
		
		//reset the drops
		for (var i=0;i<this._arDrops.length;i++) {
			var drop = this._arDrops[i];
			drop.itemStack = [];
			drop.rowheight = 0;
			drop.smaItemStack = [];
		}
		
		//unload the feedback elements
		this._feedbackContainer.innerHTML = "";
		
		//reinit the draggables
		this.initDrags();
		
		this._showGenericFb = true;
	},
	
	getDragById:function(id){
		var oDrag = null;
		for(var i = 0; i<this._arDrags.length; i++){
			if(this._arDrags[i].elementId == id){
				oDrag = this._arDrags[i];
				break;
			}
		}
		return oDrag;
	},
	
	getDropById:function(id){
		var oDrop = null;
		for(var i = 0; i<this._arDrops.length; i++){
			if(this._arDrops[i].id == parseInt(id)){
				oDrop = this._arDrops[i];
				break;
			}
		}
		return oDrop;
	}

} //end prototype object

$.fn.hitTestObject = function (obj) {
    var bounds = this.offset();
    bounds.right = bounds.left + this.outerWidth();
    bounds.bottom = bounds.top + this.outerHeight();
    var compare = obj.offset();
    compare.right = compare.left + obj.outerWidth();
    compare.bottom = compare.top + obj.outerHeight();
    if (compare.left >= bounds.left && compare.left <= bounds.right) {
        if (compare.top >= bounds.top && compare.top <= bounds.bottom) {
            return true;
        }
        if (bounds.top >= compare.top && bounds.top <= compare.bottom) { return true; }
    } else if (bounds.left >= compare.left && bounds.left <= compare.right) {
        if (compare.top >= bounds.top && compare.top <= bounds.bottom) { return true; }
        if (bounds.top >= compare.top && bounds.top <= compare.bottom) { return true; }
    }
    return false;
}

