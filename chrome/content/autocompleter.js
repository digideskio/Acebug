/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;


// ************************************************************************************************


/*****************************************************************
 *  code completion utils
 ****************/
function treeView(table){
	this.rowCount = table.length;
	this.getCellText  = function(row, col){return table[row][col.id]}
	this.getCellValue = function(row, col){return table[row][col.id]}
	this.setTree = function(treebox){this.treebox = treebox}
	this.isEditable = function(row, col){return false}

	this.isContainer = function(row){return false}
	this.isContainerOpen = function(row){return false}
	this.isContainerEmpty = function(row){return true }
	this.getParentIndex = function(row){ return 0}
	this.getLevel = function(row){return 0}
	this.hasNextSibling = function(row){return false}

	this.isSeparator = function(row){return false}
	this.isSorted = function(){ return false}
	this.getImageSrc = function(row,col){}// return "chrome://global/skin/checkbox/cbox-check.gif"; };
	this.getRowProperties = function(row,props){
		
		//var aserv=Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
		//props.AppendElement(aserv.getAtom(table[row].depth));		
		//props.AppendElement(aserv.getAtom('a'));		
	};
	this.getCellProperties = function(row,col,props){
		var aserv=Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
		props.AppendElement(aserv.getAtom('d'+table[row].depth));
	};
	this.getColumnProperties = function(colid,col,props){}
	this.cycleHeader = function(col, elem){}
}


function parseJSFragment(evalString){
	var i=evalString.length-1,i0
	var rx=/[a-z$_0-9]/i
	var next
	var skipWord=function(){i0=i
		while(rx.test(next=evalString.charAt(i))){
			i--;
		}
	}
	var skipString=function(comma){
		next=evalString.charAt(--i)
		while(next&&(next!=comma||evalString.charAt(i-1)=="\\")){
			next=evalString.charAt(--i)
		}
	}
	var skipStacks=function(){
		var stack=[]
		while(next=evalString.charAt(--i)){
			skipWord();//print(next)
			switch(next){
				case ".":
					skipWord();//print(next)
					break;
				case "'":
				case '"':
					skipString(next);
					break;
				case '}':stack.push("{");break;
				case ']':stack.push("[");break;
				case ')':stack.push("(");break;
					stack.push(next);
					break;
				case '{':
				case '[':
				case '(':
									//print(next+"bb");
					if(stack.pop()!==next)
						return;
									//print(next+"bb2");
					break;
				default:   //print(next+22);
					if(stack.length===0)
						return;
			}
		}
	++i;
	}

	skipWord()
	var it=i
	dump(next)
	if(next==="."){
		skipStacks()
		i+=1
	}else if(next==="("){
		var irestore=i
		i--;skipWord()
		dump('-->',next,i0,i,it)
		var funcName=evalString.substring(i+1,it)
		if(funcName&&"QueryInterface,getAttribute,setAttribute,hasAttribute,getInterface".indexOf(funcName)!=-1){
			var jsf=parseJSFragment(evalString.substring(0,i+1))[0]
			dump(jsf,funcName,evalString.substr(it+1))
			autocompleter.specFunc=[jsf,funcName]
		}else if(funcName=="getElementById"){
			autocompleter.specFunc=['',funcName]
		}
		i=irestore
	}
	return [evalString.substr(i,it-i),evalString.substr(it+1)];
}
/******/
/**************************************/

Firebug.Ace.autocompleter = {
	onEvalSuccess: function(result, context){
		this.object=result		
		this.unfilteredArray=getProps(result)

		if(this.specFunc)
			this.getSpecialEntries()

		
		this.filter(this.unfilteredArray, this.filterText)
		this.showPanel()
	},
	onEvalFail: function(result, context){
		alert(result)
	},
	eval: function(string, context){
		context=context || Firebug.currentContext;
		if(!string)
			this.onEvalSuccess(context.global,context)
		Firebug.CommandLine.evaluate(string, context, context.thisValue, null,
            bind(this.onEvalSuccess, this),
			bind(this.onEvalFail, this)                
        )
	},
	start: function(editor){
		this.editor = editor||this.editor
		var range = editor.selection.getRange()
		range.end.column = range.start.column
		range.start.column = 0
		var evalString=editor.session.getTextRange(range)
	
		var [objString, filterText] = parseJSFragment(evalString);
		
		range.end.column = range.end.column - filterText.length - 1
		range.start.column = range.end.column - objString.length -1
		this.baseRange = range;
		this.text = this.filterText = filterText;
		this.eval(objString)
		
	},
	showPanel: function(){
		var panelH=250, panelW=200
		if(!this.panel){//get domNodes
			this.panel=$("aceAutocompletePanel")
			this.panel.height = panelH;
			this.panel.width = panelW;
			this.tree=this.panel.getElementsByTagName('tree')[0]
			this.number=this.panel.getElementsByTagName('label')[0]

			this.bubble=document.getElementById("autocomplate-bubble")
			//set handlers
			this.panel.setAttribute('onpopupshown','Firebug.Ace.autocompleter.setView(0)')
			this.tree.setAttribute('ondblclick','Firebug.Ace.autocompleter.insertSuggestedText();Firebug.Ace.autocompleter.finish()')
			this.tree.setAttribute('onselect','Firebug.Ace.autocompleter.onSelect()')
		}
		var win =Firebug.Ace.rightWindow
		var editor = Firebug.Ace.env.editor
		var innerPos = editor.renderer.textToScreenCoordinates(editor.getCursorPosition())
		var posX = innerPos.pageX + win.mozInnerScreenX
		var posY = innerPos.pageY + win.mozInnerScreenY
		var maxX = window.screen.width
		var maxY = window.screen.height-50
		
		if(panelH+posY>maxY)
			posY-=panelH+5
		else
			posY+=20

		if(this.panel.state=='open'){
			this.setView(0)
			this.panel.moveTo(posX,posY)
		}else
			this.panel.showPopup(null, posX, posY, "popup")
		// add editor handlers
		this.editor.setKeyboardHandler(this.editor.autocompleteKeySet);
		if(!this.editor.autocompleteCommandsAdded)
			this.addComandsToEditor()					
	},
	
	addComandsToEditor: function(){
		var self = this;
		this.editor.addCommands({
			nextEntry: function(){
				self.moveTreeSelection(1);
			},
			previousEntry: function(){
				self.moveTreeSelection(-1);
			},
			dotComplete: function(){
				var o=self.sortedArray[self.tree.currentIndex]
				if(o){
					self.insertSuggestedText('.')
					self.baseRange.end.column = self.editor.selection.getCursor().column
					self.onEvalSuccess(o.object)
				}					
			},
			complete: function(){
				self.insertSuggestedText();
				self.finish()
			},
			cancelCompletion: function(){
				self.finish();
			}
		});	
		this.editor.autocompleteCommandsAdded = true;
	},
	// *****************
	onSelect: function(immediate){
		if(!immediate){
			if(this.onSelectTimeOut)
				clearTimeout(this.onSelectTimeOut)
			var self = this;
			this.onSelectTimeOut = setTimeout(function(){self.onSelect(true)},10)
			return
		}
		/**	 doOnselect  **/
		this.onSelectTimeOut=null
		
		try{
			var o=this.tree.currentIndex
			if(o<0||o>this.tree.view.rowCount){
				item.textContent=''
				return
			}			
			var o=this.sortedArray[o]
			if(!o)return//why o is undefined
			var text=setget(this.object,o.name)
			if(!text)text=o.object
			this.sayInBubble(text+'\n'+o.description+'\n'+o.depth)
		}catch(e){}
	},
	insertSuggestedText: function(additionalText){
		var c=this.tree.view.selection.currentIndex
		if(c<0) return
		var c=this.sortedArray[c]
		var isSpecial=c.special
		var text=c.name

		var s = this.baseRange.end.column
		if(isSpecial){
			text=text.substr(1)
		}else if(/^\d*$/.test(text)){
			text='['+text+']'
			s--
		}else if(!/^[a-z$_][a-z$_0-9]*$/i.test(text)){
			text='["'+text+'"]'
			s--
		}
		if(additionalText){
			text=text+additionalText
			//l -= additionalText.length + 1
		}
		var range=Firebug.Ace.env.editor.selection.getRange()
		range.start.column = s;
		Firebug.Ace.env.editor.selection.setSelectionRange(range)
		Firebug.Ace.env.editor.onTextInput(text)
	},
	// *****************	
	getSpecialEntries: function(){
		var [spo,funcName]=this.specFunc
		var ans=[]
		try{
			if(funcName=='QueryInterface'){
				var spo = EJS_evalStringOnTarget(spo)
				supportedInterfaces(spo).forEach(function(x){
					ans.push({name:'\u2555Ci.'+x+')',comName: 'ci.'+x.toString().toLowerCase(),description:'interface', depth:-1,special:true})
				})
			}else if(funcName=="getInterface"){
				var spo = EJS_evalStringOnTarget(spo)
				supportedgetInterfaces(spo).forEach(function(x){
					ans.push({name:'\u2555Ci.'+x+')',comName: 'ci.'+x.toString().toLowerCase(),description:'interface', depth:-1,special:true})
				})
			}else if(funcName=='getElementById'){
				ans=getIDsInDoc()
			}else if(funcName=="getAttribute"||funcName=="setAttribute"||funcName=="hasAttribute"){
				var spo = EJS_evalStringOnTarget(spo)
				var att=spo.attributes
				for(var i=0;i<att.length;i++){
					var x=att[i]
					ans.push({name:'\u2555"'+x.nodeName+'")',comName: '"'+x.nodeName.toLowerCase(),description:x.value, depth:-1,special:true})
				}
			}
		}catch(e){Cu.reportError(e)}
		this.unfilteredArray=ans.concat(this.unfilteredArray)
	},
	setView: function(si){
		if(typeof si!='number')
			si=this.tree.currentIndex
		this.tree.view=new treeView(this.sortedArray)
		this.tree.view.selection.select(si);
        this.tree.treeBoxObject.ensureRowIsVisible(si);
		this.number.value=si+':'+this.sortedArray.length+'/'+this.unfilteredArray.length
	},
	moveTreeSelectionLong: function(to){
		var tree=this.tree,view=tree.view
		switch(to){
			case 'end':var c=view.rowCount-1;break
			case 'top':var c=0;break
			case 'pup':var c=view.rowCount-1;break
			default: return
		}
		view.selection.timedSelect(c, tree._selectDelay);
		tree.treeBoxObject.ensureRowIsVisible(c)//(c>0?c:0)
	},
	moveTreeSelection: function(direction){
		var tree=this.tree,view=tree.view,c=view.selection.currentIndex
		c+=direction
		if(c>=view.rowCount)	c=-1
		if(c<-1)				c=view.rowCount-1
		view.selection.timedSelect(c, tree._selectDelay);
		tree.treeBoxObject.ensureRowIsVisible(c>=0?c:(direction>0?0:view.rowCount-1))
	},
	selectedText: function(){
		var c=this.tree.view.selection.currentIndex
		if(c<0) return
		return this.sortedArray[c].name
	},
	filter:function(data,text){
		var table =[];
		if(!text){
			data.forEach(function(val) {table.push(val)})
			table.sort()
			this.sortedArray=table
			return;
		}
		var filterText=text.toLowerCase()
		var filterTextCase=this.text

		//**funcs*****/
		function springyIndex(val){
			var lowVal=val.comName
			var priority=0,lastI=0,ind1=0;
			if(val.name.indexOf(filterTextCase)===0){
				val.priority=-2
				table.push(val);
				return;//exact match
			}
			for(var j=0;j<filterText.length;j++){
				lastI = lowVal.indexOf(filterText[j],ind1);				
				if(lastI===-1)
					break;//doesn't match
				priority += lastI-ind1
				ind1 = lastI+1;
			}
			if(lastI != -1){
				val.priority=priority
				table.push(val);
			}
		}

		function sorter(a,b){

		}
		var sortVals=['priority','depth','comName']

		data.forEach(springyIndex)
		table.sort(function (a, b) {
			if(!a.special&&b.special) return 1;
			if(a.special&&!b.special) return -1;//???
			for each(var i in sortVals){
			  if (a[i]<b[i]) return -1;
			  if (a[i]>b[i]) return 1;
			}
			return 0;
		})
		this.sortedArray=table
	},
	
	finish:function(i){
		this.hidden=true
		this.editor.setKeyboardHandler(this.editor.normalKeySet);
		this.panel.hidePopup()
	},
};







autocompleter2={	
	create: function(inputField){
		if(!this.panel){//get domNodes
			this.inputField=inputField;
			this.panel=document.getElementById("autocomplatePanel")
			this.tree=this.panel.getElementsByTagName('tree')[0]
			this.number=this.panel.getElementsByTagName('label')[0]

			this.bubble=document.getElementById("autocomplate-bubble")
			//set handlers
			this.panel.setAttribute('onpopupshown','autocompleter.setView(0)')
			this.tree.setAttribute('ondblclick','autocompleter.insertSuggestedText(),autocompleter.finish()')
			this.tree.setAttribute('onselect','autocompleter.onSelect()')
		}

		this.inputField.addEventListener("keypress", this, true);
	},
	start:function(evalObj,filterText,posX,posY){
			dump('start',posX,posY)

		if(typeof posX=='undefined'||typeof posY=='undefined'){
			let bo=this.panel.boxObject
			posX=bo.screenX;posY=bo.screenY;

		}
		dump('start',posX,posY);
		this.object=evalObj
		this.text=filterText
		var t=Date.now()
		this.unfilteredArray=getProps(evalObj)

		if(this.specFunc)
			this.getSpecialEntries()
		dump('propsTime',t-Date.now())

		this.filterText=filterText
		this.filter(this.unfilteredArray,filterText)

		if(this.panel.state=='open'){
			this.setView(0)
			this.panel.moveTo(posX,posY)
		}else
			this.panel.showPopup(null,posX,posY, "popup")
	},
	
	

	
	handleEvent: function(event){
		dump('handleEvent---------',event.charCode,String.fromCharCode(event.charCode),event.ctrlKey,event.altKey)
		if(String.fromCharCode(event.charCode)=='t'&&event.ctrlKey){
			event.preventDefault();event.stopPropagation();
		}
		var t
		if(event.ctrlKey||event.altKey){
			if(event.charCode!=0&&(t=String.fromCharCode(event.charCode))){
				if (t=='.'){//complete object and start inspecting it
					var o=this.sortedArray[this.tree.currentIndex]
					if(o){
						this.insertSuggestedText(t)
						this.start(o.object,"")
					}
				}
			}
			return;
		}
		switch(event.keyCode){
			case KeyEvent.DOM_VK_HOME:
				this.moveTreeSelectionBig('top');
				event.preventDefault();event.stopPropagation();
				break
			case KeyEvent.DOM_VK_END:
				this.moveTreeSelectionBig('end');
				event.preventDefault();event.stopPropagation();
				break
			case KeyEvent.DOM_VK_UP:
				this.moveTreeSelection(-1);
				event.preventDefault();event.stopPropagation();
				break
			case KeyEvent.DOM_VK_DOWN:
				this.moveTreeSelection(1);
				event.preventDefault();event.stopPropagation();
				break
			case KeyEvent.DOM_VK_BACK_SPACE:
				this.text=this.text.substr(0,this.text.length-1)
				this.filter(this.unfilteredArray,this.text);
				this.setView(0);
				break
			case KeyEvent.DOM_VK_RETURN:
				this.insertSuggestedText();
				this.finish()
				event.preventDefault();event.stopPropagation();
				break
			case 46:
			this.startMain(this.object[this.selected()],"")
				break;
			case KeyEvent.DOM_VK_RIGHT:
				this.finish();break
			case KeyEvent.DOM_VK_RIGHT:
			default:

				if(event.charCode==0){
					this.finish();event.preventDefault();event.stopPropagation();break
				}
				var t=String.fromCharCode(event.charCode)
				if (!event.ctrlKey&&/[; \+\-\*\:;\]\)\(\)\}\{\?]/.test(t))
					this.finish()

				this.text+=t;
				dump('-===>',t,this.text)

				this.filter(this.unfilteredArray,this.text);
				this.setView(0)
				//break
		}
	},

	
	

	/****helper bubble******/
	onSelect: function(immediate){
		if(!immediate){
			if(this.onSelectTimeOut)
				clearTimeout(this.onSelectTimeOut)
			this.onSelectTimeOut=setTimeout(function(){autocompleter.onSelect(true)},10)
			return
		}
		/**	 doOnselect  **/
		this.onSelectTimeOut=null
		
		try{
			var o=this.tree.currentIndex
			if(o<0||o>this.tree.view.rowCount){
				item.textContent=''
				return
			}			
			var o=this.sortedArray[o]
			if(!o)return//why o is undefined
			var text=setget(this.object,o.name)
			if(!text)text=o.object
			this.sayInBubble(text+'\n'+o.description+'\n'+o.depth)
		}catch(e){}
	},
	sayInBubble: function(text){
		/*if(this.bubble.state=='open'){
			this.bubble.moveTo(0,0)
		}else
			this.bubble.showPopup(null,0,0, "popup")
		var item = this.bubble.firstChild;
		if(!item){
			item=document.createElementNS("http://www.w3.org/1999/xhtml","div");
			this.bubble.appendChild(item);
		}
		item.textContent=text*/
		this.bubble.value=text
	},
}

var getIDsInDoc=function(){
	var doc=EJS_currentTargetWin.document
	var xpe = new XPathEvaluator();
	var nsResolver = xpe.createNSResolver(doc.documentElement);
	result = xpe.evaluate('//*[@id]', doc.documentElement, nsResolver,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

	var ans=[]
    for(var i = 0; i < result.snapshotLength; i++){
		var x=result.snapshotItem(i).id
		ans[i]={name:' "'+x+'")',comName: 'ci.'+x.toString().toLowerCase(),description:'id', depth:-1,special:true}
    }
	return ans
}

var getClassesInDoc=function(doc){
	var xpe = new XPathEvaluator();
	var nsResolver = xpe.createNSResolver(doc.documentElement);
	result = xpe.evaluate('//*[@class]', doc.documentElement, nsResolver,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

	var ans=[]
    for(var i = 0; i < result.snapshotLength; i++){
		var x=result.snapshotItem(i).className
		if(ans.indexOf(x)==-1)ans.push(x)
    }
	return ans
}




var modernfox=!!Object.getOwnPropertyNames
/**============-=========-===============**/
if(!modernfox)//for old versions
	var getProps=function(targetObj){//var t=Date.now()
		var data=[],x=targetObj.wrappedJSObject
		if(x){
			data.push({name:'wrappedJSObject', comName: 'wrappedjsobject',description:'', depth:-1})
			targetObj=x
		}

		var protoList=[targetObj]
		var p=targetObj
		if(typeof p!='xml')
			while(p=p.__proto__)
				protoList.push(p)
		for(var i in targetObj){
			for(var depth in protoList){
				try{if(protoList[depth].hasOwnProperty(i))
					break
				}catch(e){Cu.reportError(depth+protoList+i)}
			}
			/* data.push({name:i, comName: i.toLowerCase(),get description
function(){dump(this.name); delete this.description; this.description=jn.inspect(autocompleter.object[this.name]); return this.description}
			, depth:depth}) */
			try{var o=targetObj[i];d=jn.inspect(o)}catch(e){var d=e.message,o='error'}
			data.push({name:i, comName: i.toLowerCase(), description:d, depth:depth, object:o})
		}//dump('-----------------------------**',t-Date.now())
		//special cases
		try{if('QueryInterface' in targetObj){i='QueryInterface'
			try{var d=jn.inspect(targetObj[i])}catch(e){var d=e.message}
			data.push({name:i, comName: i.toLowerCase(),description:d, depth:0})
		}}catch(e){}
		return data;
	}
else//4.0b2+
	var getProps=function(targetObj){
		var x= targetObj.wrappedJSObject,data=[],protoList=[],depth=0,allProps=[]
		if(x)
			data.push({name:'wrappedJSObject', comName: 'wrappedjsobject',description:'', depth:-1})
		else x=targetObj

		if(typeof x!='object'&&typeof x!='function'){
			x=x.constructor
			jn.say(x,targetObj)
		}
		if(typeof x=='xml')return []
		while(x){
			var props=Object.getOwnPropertyNames(x)
			outerloop:for each(var i in props){
				if(allProps.indexOf(i)>-1)
					continue outerloop
				/*if(!x.hasOwnProperty(i)){
					data.push({name:i+'---', comName: i+'---',description:i, depth:depth})
					continue outerloop
				}
				for(var p in protoList){//dont show same prop twice
					if(protoList[p].hasOwnProperty(i))
						continue outerloop
				}*/
				/* data.push({name:i, comName: i.toLowerCase(),get description function(){
					dump(this.name);
					delete this.description;
					this.description=jn.inspect(autocompleter.object[this.name]);
					return this.description}
					, depth:depth}) */
				try{var o=targetObj[i];d=jn.inspect(o)}catch(e){var d=e.message,o='error'}
				data.push({name:i, comName: i.toLowerCase(), description:d, depth:depth, object:o})

			}
			protoList.push(x);x=x.__proto__;depth++;allProps=allProps.concat(props)
		}
		try{if(targetObj instanceof Ci.nsIDOMWindow&&'Components' in targetObj){i='Components'
			try{var d=jn.inspect(targetObj[i])}catch(e){var d=e.message}
			data.push({name:i, comName: i.toLowerCase(),description:d, depth:0})
		}}catch(e){}
		try{if('QueryInterface' in targetObj){i='QueryInterface'
			try{var d=jn.inspect(targetObj[i])}catch(e){var d=e.message}
			data.push({name:i, comName: i.toLowerCase(),description:d, depth:0})
		}}catch(e){}
		return data
	}

/**======================-==-======================*/

/**======================-==-======================*/


// todo: cleanup 
var jn={};
jn.say=function(a){
	EJS_appendToConsole(a?a.toString():a)
}

jn.inspect=function(x,long){	
	if(x == null) return String(x);
	var c, nameList=[], t = typeof x, 
		Class=Object.prototype.toString.call(x),
		string=x.toString()
	if(Class==string)
		string=''//most objects have same class and toString
	
	Class=Class.slice(8,-1)
	
	if(Class=='Function'){
		var isNative=/\[native code\]\s*}$/.test(string)//is native function		
		if(!long){
			var i=string.indexOf("{")
			t=isNative?'function[n]': 'function'
			return t+string.substring(string.indexOf(" "),i-1)+'~'+x.length		
		}
		if(isNative){
			return string+'~'+x.length
		}		
		return	string		
	}
	if(Class=='XML')
		return Class+'` '+x.toXMLString();
	if(t!='object')
		return Class+'` '+string
	
	if(Class=='Array'){
		var l=x.length
		nameList.push('`'+Class+'` ~'+l)
		l=Math.min(long?100:10,l)
		for(var i=0;i<l;i++){
			nameList.push(x[i].toString())
		}
		return nameList.join(',\n   ');
	}
	
	
	nameList.push('`',Class,'` ',string)
	//special cases
	var h=InspectHandlers[Class]
	if(h)return nameList.join('')+h(x)
	
	try{
		var l=x.length
	}catch(e){}
	//if(typeof l==='number' && l>0) 
	
	
	//d.constructor
	
	//\u25b7'\u25ba'
	if(Class=='Object'){
		c=x.constructor
		c=c.name
		if(c&&c!='Object')
			nameList.push(':',c,':')
	}
	try{
		//for files		
		if(c=x.spec||x.path)
			nameList.push(" ",c)
		//for dom nodes
		if((c=x.nodeName||x.name)&&(c!=string))
			nameList.push(c)
				
		if(c=x.id)
			nameList.push("#",c)
		
		if(c=x.className)
			if(typeof c=='string')
				nameList.push(".",c.replace(" ",".",'g'))
		
		if((c=x.value||x.nodeValue)&&typeof c=='string'){
			if(c.length>50)
				c=c.substring(0,50)+'...'
			nameList.push(" =",c.toSource().slice(12,-2) )		
		}
		if(typeof l==='number')
			nameList.push(' ~',l)
	}catch(e){}

	if(nameList.length<6){
		nameList.push('{')
		for(var i in x){
			if(nameList.length>12)
				break
			nameList.push(i,',')
		}
		nameList.push('}')
	}

	return nameList.join('')
}

var InspectHandlers={
	 CSSStyleSheet:function(x)'~'+x.cssRules.length+' ->'+x.href
	,CSSNameSpaceRule:function(x)x.cssText
	,CSSStyleRule:function(x)x.cssText
}

var getParent=function(a){
	var utils=(window.getInterface ||
		window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface)(Ci.nsIDOMWindowUtils);


	function handlerMaker(obj) {
	  return {
	   getOwnPropertyDescriptor: function(name) {
		 var desc = Object.getOwnPropertyDescriptor(obj, name);
		 // a trapping proxy's properties must always be configurable
		 desc.configurable = true;
		 return desc;
	   },
	   getPropertyDescriptor:  function(name) {
		 var desc = Object.getPropertyDescriptor(obj, name); // assumed
		 // a trapping proxy's properties must always be configurable
		 desc.configurable = true;
		 return desc;
	   },
	   getOwnPropertyNames: function() {
		 return Object.getOwnPropertyNames(obj);
	   },
	   defineProperty: function(name, desc) {
		 Object.defineProperty(obj, name, desc);
	   },
	   delete:       function(name) { return delete obj[name]; },
	   fix:          function() {
		 if (Object.isFrozen(obj)) {
		   return Object.getOwnProperties(obj); // assumed
		 }
		 // As long as obj is not frozen, the proxy won't allow itself to be fixed
		 return undefined; // will cause a TypeError to be thrown
	   },

	   has:          function(name) { return name in obj; },
	   hasOwn:       function(name) { return ({}).hasOwnProperty.call(obj, name); },
	   get:          function(receiver, name) { return name=='toString'?function(){return '[object functionCall proxy]'}:obj[name]; },
	   set:          function(receiver, name, val) { obj[name] = val; return true; }, // bad behavior when set fails in non-strict mode
	   enumerate:    function() {
		 var result = [];
		 for (var name in obj) { result.push(name); };
		 return result;
	   },
	   keys: function() { return Object.keys(obj); }

	  };
	}

	var parent=utils.getParent(a)
	if(parent.toString) return parent
	return Proxy.create(handlerMaker(parent))
}
jn.getClass=function(x) {
    return Object.prototype.toString.call(x).slice(8,-1)
}


function setget(object,prop){
	object=object.wrappedJSObject||object
	var ans='',s
	try{
		s=object.__lookupSetter__(prop)
		if(s)ans+=s.toString().replace(/^.*()/,'set '+prop+'()')
		s=object.__lookupGetter__(prop)
		if(s)ans+=s.toString().replace(/^.*()/,'\nget '+prop+'()')
	}catch(e){Components.utils.reportError(e)}
	return ans
}


jn.compare=function(a,b){
	var ans=[]
	for(var i in a)try{
		var ai=a[i],bi=b[i]
		
		if(ai!=bi){
			if(typeof(ai)=='function'&&ai.toString()==bi.toString())
				continue
			ans.push([i,a[i],b[i]])
		}
	}catch(e){ans.push([i,ai,bi])}
return ans
}

jn.setget=setget





// ************************************************************************************************

}});
