if (typeof window.PT == "undefined")
    window.PT = { };

PT.mediaQueries = {
    mobileWidth:           matchMedia("(max-width: 649px)"),
    hoverAvailable:        matchMedia("only screen and (hover: hover) and (pointer: fine)"),
    portraitOrientation:   matchMedia("(orientation: portrait)")
};

PT.isMobile = () => {
    return (   (   ('ontouchstart' in document.documentElement)
                && PT.mediaQueries.mobileWidth.matches)
            || !PT.mediaQueries.hoverAvailable.matches);
};

Array.prototype.removeIf = function (test) {
    let index = this.findIndex(test);
    if (index !== -1)
        this.splice(index, 1);
};

function defval(def, val, defval = -1) {
    return (val == defval) ? def : val;
}

function doWhenPageLoaded(f) {
    if (document.readyState == "complete")
        f();
    else
        window.addEventListener("load", () => { f(); });
}

function doWhenMatchMedia(mediaQuery, name, ifMatchesOrAlwaysDo, otherwiseDo = null, whenCanceledDo = null) {
    if (typeof PT.mediaQueryResponders == "undefined")
        PT.mediaQueryResponders = { };

    let mediaQueryResponder = (event, canceling = false) => {
        if (canceling) {
            if (whenCanceledDo != null)
                whenCanceledDo(mediaQuery);
        } else {
            let matches = (typeof event == "undefined") ? mediaQuery.matches : event.matches;

            if (otherwiseDo == null || matches) ifMatchesOrAlwaysDo(mediaQuery);
            else otherwiseDo(mediaQuery);
        }
    };
    mediaQueryResponder();
    mediaQuery.addListener(mediaQueryResponder);

    PT.mediaQueryResponders[name] = mediaQueryResponder;
}

function cancelDoWhenMatchMedia(name) {
    PT.mediaQueryResponders[name](null, true);

    for ([ key, mediaQuery ] of Object.entries(PT.mediaQueries))
        mediaQuery.removeListener(PT.mediaQueryResponders[name]);

    PT.mediaQueryResponders[name] = null;
}

PT.notificationCenter = {
    eventHandlers: { },
    handlerPhaseOrders: {
        "PT.contentDidLoad": [ "rewrite", "eventListeners" ]
    },
    addHandlerForEvent: (eventName, f, options = { }) => {
        if (PT.notificationCenter.eventHandlers[eventName] == null)
            PT.notificationCenter.eventHandlers[eventName] = [ ];

        let handlers = PT.notificationCenter.eventHandlers[eventName];
        if (handlers.findIndex(handler => handler.f == f) !== -1)
            return;

        let insertAt = handlers.length;

        let phaseOrder = PT.notificationCenter.handlerPhaseOrders[eventName];
        if (phaseOrder)
            options.phase = (options.phase || "");
        if (options.phase && phaseOrder) {
            let targetPhase = options.phase.match(/^([<>]?)(.+)/)[2];
            let targetPhaseOrder = defval(phaseOrder.length, phaseOrder.indexOf(targetPhase), -1);

            let phaseAt = (index) => {
                if (index >= handlers.length) return null;
                let parts = handlers[index].options.phase.match(/^([<>]?)(.+)/);
                return {
                    phase: parts[2],
                    before: (parts[1] == "<"),
                    after: (parts[1] == ">")
                };
            };

            if (options.phase.startsWith("<")) {
                for (var i = 0; i < handlers.length; i++) {
                    if (phaseAt(i).phase == targetPhase && !phaseAt(i).before)
                        break;
                    if (phaseOrder.slice(targetPhaseOrder + 1).includes(phaseAt(i).phase))
                        break;
                }
                insertAt = i;
            } else if (options.phase.startsWith(">")) {
                for (var j = handlers.length - 1; j > -1; j--) {
                    if (phaseAt(j).phase == targetPhase) {
                        j++;
                        break;
                    }
                    if (phaseOrder.slice(0, targetPhaseOrder - 1).includes(phaseAt(j).phase)) {
                        j++;
                        break;
                    }
                }
                insertAt = j;
            } else {
                for (var k = 0; k < handlers.length; k++) {
                    if (phaseAt(k).phase == targetPhase && phaseAt(k).after)
                        break;
                    if (phaseOrder.slice(targetPhaseOrder + 1).includes(phaseAt(k).phase))
                        break;
                }
                insertAt = k;
            }
        }

        PT.notificationCenter.eventHandlers[eventName].splice(insertAt, 0, { f: f, options: options });
    },
    removeHandlerForEvent: (eventName, f, options = { }) => {
        if (PT.notificationCenter.eventHandlers[eventName] == null)
            return;

        PT.notificationCenter.eventHandlers[eventName].removeIf(handler => handler.f == f);
    },
    removeAllHandlersForEvent: (eventName) => {
        PT.notificationCenter.eventHandlers[eventName] = null;
    },
    fireEvent: (eventName, eventInfo) => {
        if (PT.notificationCenter.eventHandlers[eventName] == null)
            return;

        for (let i = 0; i < PT.notificationCenter.eventHandlers[eventName].length; i++) {
            let handler = PT.notificationCenter.eventHandlers[eventName][i];
            if (handler.options.condition && !handler.options.condition(eventInfo))
                continue;
            handler.f(eventInfo);
            if (handler.options.once) {
                PT.notificationCenter.eventHandlers[eventName].splice(i, 1);
                i--;
            }
        }
    }
};

PT.DOMContentLoaded = false;

window.addEventListener("DOMContentLoaded", () => {
    PT.DOMContentLoaded = true;
    PT.notificationCenter.fireEvent("PT.contentDidLoad", {
        source: "DOMContentLoaded",
        document: document.firstElementChild,
        isMainDocument: true,
        needsRewrite: true,
        clickable: true,
        collapseAllowed: true,
        isCollapseBlock: false,
        isFullPage: true,
        location: new URL(location.href),
        fullWidthPossible: true
    });
});