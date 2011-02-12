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
	
	env.setKeybinding = function(name){
		if(name !='Vim' && name != 'Emacs'){
			env.editor.setKeyboardHandler(null);
			return
		}
		var path = "ace/keyboard/keybinding/" + name
		var module = require(path)
		if(!module)
			require([path], function(module){
				env.editor.setKeyboardHandler(module[name])
			})
		else
			env.editor.setKeyboardHandler(module[name])
	}
	
	env.setKeybinding(options.keybinding)
   

    var HashHandler = require("ace/keyboard/hash_handler").HashHandler;

    env.editor.setShowInvisibles(options.showinvisiblecharacters);
    env.editor.setHighlightActiveLine(options.highlightactiveline);
    env.editor.session.setUseSoftTabs(options.softtabs);
    env.editor.session.setTabSize(options.tabsize);
    env.editor.setShowPrintMargin(false);
    env.editor.session.setUseWrapMode(options.wordwrap);
    env.editor.session.setWrapLimitRange(null, null);

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
};
});
