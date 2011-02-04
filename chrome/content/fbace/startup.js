define(function(require, exports, module) {

exports.launch = function(env) {
    //since we are using separate window make everything global for now
    window.env = env;
    event = require("pilot/event");
    Editor = require("ace/editor").Editor;
    Renderer = require("ace/virtual_renderer").VirtualRenderer;
    theme = require("ace/theme/textmate");
    EditSession = require("ace/edit_session").EditSession;
    UndoManager = require("ace/undomanager").UndoManager;

    JavaScriptMode = require("ace/mode/javascript").Mode;
    // worker is more of nuisance now
    JavaScriptMode.prototype.createWorker = function(session) {
        return null;
    };

    var vim = require("ace/keyboard/keybinding/vim").Vim;
    var emacs = require("ace/keyboard/keybinding/emacs").Emacs;
    var HashHandler = require("ace/keyboard/hash_handler").HashHandler;

    //empty gutter is annoying, so put space into document
    jsDoc = new EditSession(' ');
    jsDoc.setMode(new JavaScriptMode());
    jsDoc.setUndoManager(new UndoManager());

    var container = document.getElementById("editor");
    editor = env.editor = new Editor(new Renderer(container, theme));
    env.editor.setSession(jsDoc);
    //temporary disable wordwrap since it's throwing on empty documents
    //env.editor.session.setUseWrapMode(true);
    env.editor.setShowPrintMargin(false);

    function onResize() {
        var session = editor.session;
        if(session.getUseWrapMode()) {
            var characterWidth = editor.renderer.layerConfig.characterWidth;
            var contentWidth = editor.container.ownerDocument.getElementsByClassName("ace_scroller")[0].clientWidth;

            session.setWrapLimit(parseInt(contentWidth / characterWidth, 10));
        }
        editor.resize();
    }
    window.onresize = onResize;
    onResize();

    //do we need to prevent dragging?
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

    /**********  handle shortcuts *****/
    // TODO: find better way
    var Search = require("ace/search").Search;
    var canon = require("pilot/canon");

    var customKeySet = {};
    editor.addCommand = function(x) {
        canon.addCommand({
            name: x.name,
            exec: function(env, args, request) {
                x.exec(env, args);
            }
        });
        delete customKeySet.reverse;
        customKeySet[x.name] = x.key;
        env.editor.setKeyboardHandler(new HashHandler(customKeySet));
    };
};

});
