/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants
function updateBreakpoints(session){
	session.clearBreakpoints()
	fbs.enumerateBreakpoints(session.url, {call: function(url, line, props, scripts)
	{
		session.setBreakpoint(line-1)
		dump(line)
		/*if (props.disabled)
		if (props.condition)*/				
	}});	
}

Firebug.ScriptPanel.prototype.initialize=function (context, doc) {
    this.panelSplitter = $("fbPanelSplitter");
    this.sidePanelDeck = $("fbSidePanelDeck");   
	
	
	//this.browser = $("fbAceBrowser1");
	this.sessionList={}
	
	this.__defineGetter__('browser', function()Firebug.chrome.$("fbAceBrowser1"))
	
	this.sourceBoxes = {};
    this.decorator = this.getDecorator();
    Firebug.ActivablePanel.initialize.apply(this, arguments);	//
}

Firebug.ScriptPanel.prototype.initializeNode = function(){
}

Firebug.ScriptPanel.prototype.updateLocation = function(compilationUnit)
{
	if (!compilationUnit)
		return;  // XXXjjb do we need to show a blank?

	// Since our last use of the compilationUnit we may have compiled or recompiled the source
	var updatedCompilationUnit = this.context.getCompilationUnit(compilationUnit.getURL());
	if (!updatedCompilationUnit)
		updatedCompilationUnit = this.getDefaultLocation();
	if (!updatedCompilationUnit)
		return;

	

	dispatch(this.fbListeners, "onUpdateScriptLocation", [this, updatedCompilationUnit]);
	
	/******************/
	this.goToCompUnit(compilationUnit)	
}

Firebug.ScriptPanel.prototype.goToCompUnit = function(compilationUnit, row, column, highlight){
	var self=this
	/******************/
	var set=function(){
		var es
		if(es = compilationUnit.session){
			self.goToSession(es, row, column, highlight)
			return
		}
			
		compilationUnit.getSourceLines(null, null, function(compUnit,b,c,lines){
			if(!lines){
				dump('*///*', compUnit.url)				
				return
			}
			es=new Firebug.Ace.win1.EditSession(lines.join(''), Firebug.Ace.win1.getMode(compUnit.url))
			compUnit.session = es;
			es.panel=self
			es.url = compUnit.url
			
			updateBreakpoints(es)
			self.goToSession(es, row, column, highlight)
		})
	}
	if(!Firebug.Ace.win1.editor)
		Firebug.Ace.win1.startAce(set, Firebug.Ace.getOptions())
	else
		set()
}

Firebug.ScriptPanel.prototype.goToSession = function(session, row, column, highlight){
	var win=Firebug.Ace.win1
	if(session){
		win.editor.setSession(session)
		this.currenHref = session.url
	}
	if(row){
		win.editor.selection.moveCursorTo(row-1, column||0)
		win.editor.selection.clearSelection()
		//win.editor.renderer.scrollCursorIntoView()
		//win.editor.scrollToRow(row)
		win.editor.centerSelection()
	}
	//just for fun
	win.editor.session.setAnnotations(highlight?[{row:row-1,type:'warning',text:''}]:[])	
}

Firebug.ScriptPanel.prototype.highlightLine = function(highlight){
	Firebug.Ace.win1.editor.session.setAnnotations(highlight?[{row:row,type:'warning',text:''}]:[])
}

Firebug.ScriptPanel.prototype.showSourceLink = function(sourceLink)
{
	this.scrollToLine(sourceLink.href, sourceLink.line)
	delete this.selection;
}


Firebug.ScriptPanel.prototype.scrollToLine = function(url, row, highlight){
	var compilationUnit = this.context.getCompilationUnit(url);
    if (compilationUnit)
    {        
        if (this.currenHref==url)
               this.goToSession(null, row, null, highlight)
        else
			this.goToCompUnit(compilationUnit, row, null, highlight)          
    }
}

Firebug.ScriptPanel.prototype.setBreakpoint= function(lineNo,state)
{
	var href = this.currenHref;
	var compilationUnit = this.context.getCompilationUnit(href);
	if (state)
		fbs.clearBreakpoint(href, lineNo);
	else
		Firebug.JavaScriptModule.setBreakpoint(compilationUnit, lineNo);
		
	// fbs.enableBreakpoint(href, lineNo);
     //       fbs.disableBreakpoint(href, lineNo);
}

Firebug.ScriptPanel.prototype.search= function(text, reverse){
	var editor = Firebug.Ace.win1.editor
	// Check if the search is for a line number
	var m = Firebug.ScriptPanel.reLineNumber.exec(text);
	if (m)
	{
		if (!m[1])
			return true; // Don't beep if only a # has been typed

		var lineNo = parseInt(m[1])-1;
		if (!isNaN(lineNo) && (lineNo > 0) && (lineNo < editor.session.getLength()) )
		{
			editor.scrollToRow(lineNo)
			return true;
		}
	}

	var curDoc = editor.find(text)||true//ace find should return true if it found something
	if (!curDoc && Firebug.searchGlobal)
	{
		return this.searchOtherDocs(text, reverse);
	}
	return curDoc;
}
// ************************************************************************************************


Firebug.Debugger.onToggleBreakpoint = function(url, lineNo, isSet, props)
{
	if (props.debuggerName != this.debuggerName) // then not for us
	{
		if (FBTrace.DBG_BP)
			FBTrace.sysout("debugger("+this.debuggerName+").onToggleBreakpoint ignoring toggle for "+
				props.debuggerName+" target "+lineNo+"@"+url+"\n");
		return;
	}

	var found = false;
	for (var i = 0; i < Firebug.TabWatcher.contexts.length; ++i)
	{
		var context = Firebug.TabWatcher.contexts[i];
		var sourceFile = context.sourceFileMap[url];
		if (sourceFile)
		{
			if (FBTrace.DBG_BP)
				FBTrace.sysout("debugger("+this.debuggerName+").onToggleBreakpoint found context "+
					context.getName());

			if (!isSet && context.dynamicURLhasBP)
				this.checkDynamicURLhasBP(context);

			var panel = context.getPanel("script", true);
			if (!panel)
				continue;

			panel.context.invalidatePanels("breakpoints");

			var sourceBox = panel.context.compilationUnits[url];
						
			if (!sourceBox || !sourceBox.session)
			{
				if (FBTrace.DBG_BP)
					FBTrace.sysout("debugger("+this.debuggerName+").onToggleBreakpoint context "+
						i+" script panel no sourcebox for url: "+url, panel.sourceBoxes);
				continue;
			}
			
			updateBreakpoints(sourceBox.session)
			/*******************************************
			var row = sourceBox.getLineNode(lineNo);
			if (FBTrace.DBG_BP)
				FBTrace.sysout(i+") onToggleBreakpoint getLineNode="+row+" lineNo="+lineNo+
					" context:"+context.getName()+"\n");

			if (!row)
				continue;  // we *should* only be called for lines in the viewport...

			if (isSet && props)
			{
				row.setAttribute("condition", props.condition ? "true" : "false");
				if (props.condition)  // issue 1371
				{
					var watchPanel = this.ableWatchSidePanel(context);

					if (watchPanel)
					{
						watchPanel.addWatch(props.condition);
					}
					else
					{
						if (FBTrace.DBG_ERRORS)
							FBTrace.sysout("onToggleBreakpoint no watch panel in context "+
								context.getName());
					}
				}
				row.setAttribute("disabledBreakpoint", new Boolean(props.disabled).toString());
			}
			else
			{
				row.removeAttribute("condition");
				if (props.condition)
				{
					var watchPanel = this.ableWatchSidePanel(context);
					watchPanel.removeWatch(props.condition);
					watchPanel.rebuild();
				}
				row.removeAttribute("disabledBreakpoint");
			}*/
			dispatch(this.fbListeners, "onToggleBreakpoint", [context, url, lineNo, isSet]);
			found = true;
			continue;
		}
	}
	if (FBTrace.DBG_BP && !found)
		FBTrace.sysout("debugger("+this.debuggerName+").onToggleBreakpoint no find context");
}

}});
