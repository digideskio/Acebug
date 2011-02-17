define('fbace/startup', function(require, exports, module) {

exports.launch = function(env, options) {
    env.acebug = {require: require};
    //since we are using separate window make everything global for now
    window.env = env;
    event = require("pilot/event");
    Editor = require("ace/editor").Editor;
    Renderer = require("ace/virtual_renderer").VirtualRenderer;

    EditSession = require("ace/edit_session").EditSession;
    UndoManager = require("ace/undomanager").UndoManager;

    CSSMode = require("ace/mode/css").Mode;
    HTMLMode = require("ace/mode/html").Mode;
    XMLMode = require("ace/mode/xml").Mode;
	JavaScriptMode = require("ace/mode/javascript").Mode;
    // worker is more of nuisance now
    JavaScriptMode.prototype.createWorker = function(session) {
        return null;
    };

    jsDoc = new EditSession('');
    jsDoc.setMode(new JavaScriptMode());
    jsDoc.setUndoManager(new UndoManager());

    var container = document.getElementById("editor");
    editor = env.editor = new Editor(new Renderer(container, options.theme));
	editor.setTheme(options.theme)
    env.editor.setSession(jsDoc);
	
    env.editor.setShowInvisibles(options.showinvisiblecharacters);
    env.editor.setHighlightActiveLine(options.highlightactiveline);
    env.editor.session.setUseSoftTabs(options.softtabs);
    env.editor.session.setTabSize(options.tabsize);
    env.editor.setShowPrintMargin(false);
    env.editor.session.setUseWrapMode(options.wordwrap);
    env.editor.session.setWrapLimitRange(null, null);
	
	env.editor.setHighlightSelectedWord(true);   
    //env.editor.renderer.setHScrollBarAlwaysVisible(false);
	
	// not needed in acebug 
	editor.renderer.moveTextAreaToCursor = 
	editor.textInput.onContextMenu = function(){};


    function onResize() {
        editor.resize();
    }
    window.onresize = onResize;
    onResize();

    event.addListener(container, "dragover", function(e) {
        return event.preventDefault(e);
    });

    event.addListener(container, "drop", function(e) {
        return event.preventDefault(e);
    });

    // global functions
    window.toggleGutter = function() {
        env.editor.renderer.setShowGutter(!env.editor.renderer.showGutter);
    };

    editor.addCommand = function(cmd) {
        var canon = require("pilot/canon");

        canon.addCommand({
            name: cmd.name,
            exec: function(env, args, request) {
                cmd.exec(env, args);
            }
        });

        var HashHandler = require("ace/keyboard/hash_handler").HashHandler;
        var ue = require("pilot/useragent");

        if (ue.isMac)
            var bindings = require("ace/keyboard/keybinding/default_mac").bindings;
        else
            bindings = require("ace/keyboard/keybinding/default_win").bindings;

        delete bindings.reverse;
        bindings[cmd.name] = cmd.key;
        env.editor.setKeyboardHandler(new HashHandler(bindings));
    };
    /**********  handle keyboard *****/	
	var HashHandler = require("ace/keyboard/hash_handler").HashHandler;
	var Search = require("ace/search").Search;
    var canon = require("pilot/canon");

	env.setKeybinding = function(name){
		if(name !='Vim' && name != 'Emacs'){
			env.editor.setKeyboardHandler(null);
			return
		}
		var path = "ace/keyboard/keybinding/" + name
		var module = require(path)
		if(!module)
			require([path], function(module){
				env.editor.setKeyboardHandler(env.editor.normalKeySet = module[name])
			})
		else
			env.editor.setKeyboardHandler(env.editor.normalKeySet = module[name])
	}
	
	env.setKeybinding(options.keybinding)
   
	env.editor.addCommands = function(commandSet) {
		for (var i in commandSet){
			var exec = commandSet[i]
			if(typeof exec == 'function')
				canon.addCommand({name: i, exec: exec})
		}
	}
	
	//add commands to default binding
	editor.keyBinding.$defaulKeyboardHandler.$config
	var bindings = editor.keyBinding.$defaulKeyboardHandler.$config;

	bindings.startAutocompleter = 'Ctrl-Space|Ctrl-.|Alt-.';
	bindings.execute = 'Ctrl-Return'
	delete bindings.reverse;
	new HashHandler(bindings);
	

	editor.autocompletionKeySet = new HashHandler({
		startAutocompleter: 'Ctrl-Space',
		complete: 'Return',
		dotComplete: 'Ctrl-.|Alt-.',
		execute: 'Ctrl-Return',
		cancelCompletion: 'Esc',
		nextEntry: 'Down',
		previousEntry: 'Up',
	});
    
	//editor.setKeyboardHandler(editor.normalKeySet);
	//breakpoint handlers
	event.addListener(editor.renderer.$gutter, 'mousedown', function(e){
		if(e.target.className.indexOf('gutter-cell')==-1)
			return
		var lineNo = parseInt(e.target.textContent)-1,state
		if(state=editor.session.$breakpoints[lineNo])
			editor.session.clearBreakpoint(lineNo)
		else
			editor.session.setBreakpoint(lineNo)
		editor.session.panel.setBreakpoint(lineNo, state)
	})
	
	getMode = function(name){
		if(name.slice(-5)=='.html')
			return new HTMLMode()
		if(name.slice(-4)=='.xml')
			return new XMLMode()
		//if(name.slice(-5)=='.html')
			return new JavaScriptMode()		
	}
};
});
