/* footnotes.js: heavily based on sidenotes.js from Gwern.net; he describes his as "a standalone JS library for parsing HTML documents with Pandoc-style footnotes and
dynamically repositioning them into the left/right margins, when browser windows are wide enough."

license: MIT (derivative of footnotes.js (Gwern.net), itself a derivative of footnotes.js (Tufte-CSS), which is PD)
*/

Footnotes = {

    /* Relationship to Rest of Page */
    potentialCollisionElements: ".full-width img, .full-width video, .full-width table, .marginnote",
    mediaQueries: {
		viewportWidthBreakpoint: matchMedia("(max-width: 1260px)")
	},

    footnoteSpacing: 60.0,
    footnotePadding: 13.0,
    footnoteMaxHeight: 600.0,


    /* Structure */
    footnoteDivs: null,
    citations: null,

    footnoteColumnLeft: null,
    footnoteColumnRight: null,

    hashNumber: () => {
        if (location.hash.match(/#[sf]n[0-9]/))
            return location.hash.substring(3);
        else if (location.hash.match(/#fnref[0-9]/))
            return location.hash.substring(6);
        else
            return "";
    },


    /* Adding Mouse Listeners */
    bindMouseEvents: () => {
        for (var i = 0; i < Footnotes.citations.length; i++) {
            let citation = Footnotes.citations[i];
            let footnote = Footnotes.footnoteDivs[i];

            footnote.addEventListener("mouseenter", footnote.footnotover = (event) => {
                citation.classList.toggle("highlighted", true);
            });

            footnote.addEventListener("mouseleave", footnote.footnoteout = (event) => {
                citation.classList.toggle("highlighted", false);
            });
        }
    },


    /* Ensure Highlight Target */
    updateTargetCounterpart: () => {
        document.querySelectorAll(".targeted").forEach(element => {
            element.classList.remove("targeted");
        });

        var counterpart;
        if (location.hash.match(/#sn[0-9]/)) {
            counterpart = document.querySelector("#fnref" + Footnotes.hashNumber());
        }
        else if (location.hash.match(/#fnref[0-9]/) && Footnotes.mediaQueries.viewportWidthBreakpoint.matches == false) {
            counterpart = document.querySelector("#sn" + Footnotes.hashNumber());
        }

        if (counterpart) {
            counterpart.classList.toggle("targeted", true);
        }
    },


    /* Hide Footnotes */
    // updatedCollapsedFootnotes: () => {
    //     for (var i = 0; i < Footnotes.citations.length; i++) {
    //         let citation = Footnotes.citations[i];
    //         let footnote = Footnotes.footnoteDivs[i];

    //         footnote.classList.toggle("hidden", isCollapsed(citation));
    //     }
    // },

    getNextVisibleFootnote: (footnote) => {
        var nextFootnoteNumber;

        for (nextFootnoteNumber = footnote.id.substring(2) + 2;
            (nextFootnoteNumber <= Footnotes.citations.length && Footnotes.footnoteDivs[nextFootnoteNumber - 1].classList.contains("hidden"));
            nextFootnoteNumber += 2);
            
        return nextFootnoteNumber <= Footnotes.citations.length
                ? Footnotes.footnoteDivs[nextFootnoteNumber - 1]
                : null;
    },


    /* Set All Footnote Positions */
    updateFootnotePositions: () => {
        
        // Footnotes.updatedCollapsedFootnotes();

        for (var i = 0; i < Footnotes.citations.length; i++) {
            let footnote = Footnotes.footnoteDivs[i];

            if (footnote.classList.contains("hidden"))
                continue;

            let side = (i % 2) ? Footnotes.footnoteColumnLeft : Footnotes.footnoteColumnRight;

            footnote.firstElementChild.style.maxHeight = `${Footnotes.footnoteMaxHeight}px`;

            footnote.style.top = Math.round(((Footnotes.citations[i].getBoundingClientRect().top) - side.getBoundingClientRect().top) + 4) + "px";

            let footnoteOuterWrapper = footnote.firstElementChild;
            footnote.classList.toggle("cut-off", (footnoteOuterWrapper.scrollHeight > footnoteOuterWrapper.offsetHeight + 2));
        }

        /* Check for Collisions w/ Tables */
        var proscribedVerticalRangesLeft = [ ];
        var proscribedVerticalRangesRight = [ ];
        let leftColumnBoundingRect = Footnotes.footnoteColumnLeft.getBoundingClientRect();
        let rightColumnBoundingRect = Footnotes.footnoteColumnRight.getBoundingClientRect();

        document.querySelectorAll(Footnotes.potentialCollisionElements).forEach(potentialCollisionElement => {
            let elementBoundingRect = potentialCollisionElement.getBoundingClientRect();

            if (!(elementBoundingRect.left > leftColumnBoundingRect.right || elementBoundingRect.right < leftColumnBoundingRect.left))
                proscribedVerticalRangesLeft.push({ top: elementBoundingRect.top - leftColumnBoundingRect.top,
                                                    bottom: elementBoundingRect.bottom - leftColumnBoundingRect.top });
            
            if (!(elementBoundingRect.left > rightColumnBoundingRect.right || elementBoundingRect.right < rightColumnBoundingRect.left))
                proscribedVerticalRangesRight.push({ top: elementBoundingRect.top - rightColumnBoundingRect.top,
                                                     bottom: elementBoundingRect.bottom - rightColumnBoundingRect.top });
        });

        proscribedVerticalRangesLeft.push({
            top: Footnotes.footnoteColumnLeft.clientHeight,
            bottom: Footnotes.footnoteColumnLeft.clientHeight
        });
        proscribedVerticalRangesRight.push({
            top: Footnotes.footnoteColumnRight.clientHeight,
            bottom: Footnotes.footnoteColumnRight.clientHeight
        });

        for (var i = 0; i < Footnotes.citations.length; i++) {
            let footnote = Footnotes.footnoteDivs[i];

            let nextFootnote = Footnotes.getNextVisibleFootnote(footnote);

            if (footnote.classList.contains("hidden"))
                continue;

            let side = (i % 2) ? Footnotes.footnoteColumnLeft : Footnotes.footnoteColumnRight;

            let room = {
                ceiling: 0,
                floor: side.clientHeight
            };

            let footnoteFootprint = {
                top:    footnote.offsetTop - Footnotes.footnoteSpacing,
                bottom: footnote.offsetTop + footnote.offsetHeight + Footnotes.footnoteSpacing
            };

            let footnoteFootprintHalfwayPoint = (footnoteFootprint.top + footnoteFootprint.bottom) / 2;

            let proscribedVerticalRanges = [...((i % 2) ? proscribedVerticalRangesLeft : proscribedVerticalRangesRight)];

            proscribedVerticalRanges.sort((a, b) => {
                if (a.bottom < b.bottom) return -1;
                if (a.bottom > b.bottom) return 1;
                return 0;
            });

            var nextProscribedRangeAfterFootnote = -1;
            for (var j = 0; j < proscribedVerticalRanges.length; j++) {
                let rangeCountingUp = {
                    top:    proscribedVerticalRanges[j].top,
                    bottom: proscribedVerticalRanges[j].bottom,
                };

                rangeCountingUp.halfwayPoint = (rangeCountingUp.top + rangeCountingUp.bottom) / 2;
                if (rangeCountingUp.halfwayPoint < footnoteFootprintHalfwayPoint)
                    room.ceiling = rangeCountingUp.bottom;

                let indexCountingDown = proscribedVerticalRanges.length - j - 1;
                let rangeCountingDown = {
                    top:    proscribedVerticalRanges[indexCountingDown].top,
                    bottom: proscribedVerticalRanges[indexCountingDown].bottom
                };

                rangeCountingDown.halfwayPoint = (rangeCountingDown.top + rangeCountingDown.bottom) / 2;
                if (rangeCountingDown.halfwayPoint > footnoteFootprintHalfwayPoint) {
                    room.floor = rangeCountingDown.top;
                    nextProscribedRangeAfterFootnote = indexCountingDown;
                }
            }

            if (i > 1) {
                let previousFootnoteBottom = Footnotes.footnoteDivs[i - 2].offsetTop + Footnotes.footnoteDivs[i - 2].offsetHeight;
                if (previousFootnoteBottom > room.ceiling)
                    room.ceiling = previousFootnoteBottom;
            }
            if (footnoteFootprint.bottom - footnoteFootprint.top > room.floor - room.ceiling)
            {   
                footnote.style.top = (proscribedVerticalRanges[nextProscribedRangeAfterFootnote].bottom + Footnotes.footnoteSpacing) + "px";
                i--;
                continue;
            }
            
            var overlapWithCeiling = room.ceiling - footnoteFootprint.top;
            if (overlapWithCeiling > 0) {
                footnote.style.top = (parseInt(footnote.style.top) + overlapWithCeiling) + "px";
                footnoteFootprint.top += overlapWithCeiling;
                footnoteFootprint.bottom += overlapWithCeiling;
            }

            var overlapWithFloor = footnoteFootprint.bottom - room.floor;
            // if (overlapWithFloor > 0)

            var overlapWithNextFootnote = nextFootnote ?
                                          (footnoteFootprint.bottom - nextFootnote.offsetTop) :
                                          -1;

            // if (overlapWithNextFootnote > 0)

            var overlapBelow = Math.max(overlapWithNextFootnote, overlapWithFloor);

            if (overlapBelow <= 0) {
                continue;
            }

            let previousFootnote = footnote.previousElementSibling;
            let maxHeadroom = footnoteFootprint.top - room.ceiling;
            let headroom = previousFootnote ?
                           Math.min(maxHeadroom, (footnoteFootprint.top - (previousFootnote.offsetTop + previousFootnote.offsetHeight))) :
                           maxHeadroom;
            
            if (headroom >= overlapBelow) {
                footnote.style.top = (parseInt(footnote.style.top) - overlapBelow) + "px";
                continue;
            }
            else {
                if (headroom < overlapwithFloor) {
                    footnote.style.top = (proscribedVerticalRanges[nextProscribedRangeAfterFootnote].bottom + Footnotes.footnoteSpacing) + "px";
                    i--;
                    continue;
                }

                if ((footnoteFootprint.bottom + nextFootnote.offsetHeight + Footnotes.footnoteSpacing - headroom) >
                    proscribedVerticalRanges[nextProscribedRangeAfterFootnote].top) {
                        continue;
                }

                footnote.style.top = (parseInt(footnote.style.top) - headroom) + "px";

                overlapWithNextFootnote -= headroom;

                nextFootnote.style.top = (parseInt(nextFootnote.style.top) + overlapWithNextFootnote) + "px";
            }
        }

        Footnotes.footnoteColumnLeft.style.visibility = "";
        Footnotes.footnoteColumnRight.style.visibility = "";

		PT.notificationCenter.fireEvent("Footnotes.footnotePositionsDidUpdate");
    },


    /* Destroys the HTML of the Footnotes */
    destroyFootnotes: () => {
        Footnotes.footnoteDivs = null;
        Footnotes.citations = null;

        Footnotes.footnoteColumnLeft.remove();
        Footnotes.footnoteColumnLeft = null;
        Footnotes.footnoteColumnRight.remove();
        Footnotes.footnoteColumnRight = null;
    },

    /* Constructs the HTML of the Footnotes */
    constructFootnotes: () => {
        let markdownBody = document.querySelector("#markdownBody");

        if (!markdownBody) {
            setTimeout(function () {
                constructFootnotes();
            }, 2000);
            return;
        }

        if (Footnotes.footnoteColumnLeft) {
            Footnotes.footnoteColumnLeft.remove();
        }
        if (Footnotes.footnoteColumnRight) {
            Footnotes.footnoteColumnRight.remove();
        }

        markdownBody.insertAdjacentHTML("beforeend", 
            "<div id='sidenote-column-left' class='footnotes' style='visibility:hidden'></div>" +
            "<div id='sidenote-column-right' class='footnotes' style='visibility:hidden'></div>");
        Footnotes.footnoteColumnLeft = document.querySelector("#sidenote-column-left");
        Footnotes.footnoteColumnRight = document.querySelector("#sidenote-column-right");

        Footnotes.footnoteDivs = [ ];

        Footnotes.citations = Array.from(document.querySelectorAll("a.footnote-ref"));

        for (var i = 0; i < Footnotes.citations.length; i++) {
            let footnote = document.createElement("div");
            footnote.classList.add("sidenote");
            
            let footnoteNumber = "" + (i + 1);
            footnote.id = "sn" + footnoteNumber;

            let referencedFootnote = document.querySelector("#fn" + footnoteNumber);
            footnote.innerHTML = `<div class="sidenote-outer-wrapper"><div class="sidenote-inner-wrapper">` +
                                 (referencedFootnote ? referencedFootnote.innerHTML : "Loading sidenote contents, please wait…")
                                 + `</div></div>`;

            Footnotes.footnoteDivs.push(footnote);

            let side = (i % 2) ? Footnotes.footnoteColumnLeft : Footnotes.footnoteColumnRight;

            side.appendChild(footnote);
        }

        for (var i = 0; i < Footnotes.citations.length; i++) {
            let footnoteSelfLink = document.createElement("a");

            footnoteSelfLink.classList.add("footnote-self-link");
            footnoteSelfLink.href = "#sn" + (i + 1);
            footnoteSelfLink.textContent = (i + 1);
            Footnotes.footnoteDivs[i].appendChild(footnoteSelfLink);
        }

        PT.notificationCenter.fireEvent("Footnotes.footnotesDidConstruct");
    },

    cleanup: () => {
        cancelDoWhenMatchMedia("Footnotes.rewriteHashForCurrentMode");
		cancelDoWhenMatchMedia("Footnotes.rewriteCitationTargetsForCurrentMode");
		cancelDoWhenMatchMedia("Footnotes.bindOrUnbindEventListenersForCurrentMode");
		cancelDoWhenMatchMedia("Footnotes.addOrRemoveEventHandlersForCurrentMode");

        Footnotes.destroyFootnotes();
    },


    setup: () => {
        doWhenMatchMedia(Footnotes.mediaQueries.viewportWidthBreakpoint, "Footnotes.rewriteHashForCurrentMode", (mediaQuery) => {
            let regex = new RegExp(mediaQuery.matches ? "#sn[0-9]" : "#fn[0-9]");
			// let prefix = (mediaQuery.matches ? "#fn" : "#sn");

            if (location.hash.match(regex)) {
                if (document.readyState == "complete") {
                    history.replaceState(null, null, PT.hashRealignValue);
                    PT.hashRealignValue = null;
                }
            }
        }, null, (mediaQuery) => {
			if (location.hash.match(/#sn[0-9]/)) {
				PT.hashRealignValue = "#fn" + Footnotes.hashNumber();

                if (document.readyState == "complete") {
                    history.replaceState(null, null, PT.hashRealignValue);
                    PT.hashRealignValue = null;
                }
            }
        });

        if (PT.isMobile()) {
            return;
        }

        PT.notificationCenter.addHandlerForEvent("Footnotes.footnotesDidConstruct", () => {
            doWhenMatchMedia(Footnotes.mediaQueries.viewportWidthBreakpoint, "Footnotes.rewriteCitationTargetsForCurrentMode", (mediaQuery) => {
                for (var i = 0; i < Footnotes.citations.length; i++)
                {
                    Footnotes.citations[i].href = (mediaQuery.matches ? "#fn" : "#sn") + (i + 1);
                }
            }, null, (mediaQuery) => {
                for (var i = i; i < Footnotes.citations.length; i++)  {
                    Footnotes.citations[i].href = "#fn" + (i + 1);
                }
            });
        }, { once: true });

        PT.notificationCenter.addHandlerForEvent("Footnotes.footnotesDidConstruct", () => {
			Footnotes.bindMouseEvents();
		}, { once: true });

        PT.notificationCenter.addHandlerForEvent("Footnotes.footnotesDidConstruct", () => {
            doWhenMatchMedia(Footnotes.mediaQueries.viewportWidthBreakpoint, "Footnotes.addOrRemoveEventHandlersForCurrentMode", (mediaQuery) => {
                if (!mediaQuery.matches) {
                    
                    PT.notificationCenter.addHandlerForEvent("Collapse.targetDidRevealOnHashUpdate", Footnotes.updateStateAfterTargetDidRevealOnHashUpdate = (info) => {
						if (location.hash.match(/#sn[0-9]/)) {
							revealElement(document.querySelector("#fnref" + Footnotes.hashNumber()), false);
							scrollElementIntoView(getHashTargetedElement(), (-1 * Footnotes.footnotePadding));
						}

						Footnotes.updateTargetCounterpart();
					});

                    PT.notificationCenter.addHandlerForEvent("Rewrite.fullWidthMediaDidLoad", Footnotes.updateFootnotePositionsAfterFullWidthMediaDidLoad = () => {
						requestAnimationFrame(Footnotes.updateFootnotePositions);
					});

                    PT.notificationCenter.addHandlerForEvent("Collapse.collapseStateDidChange", Footnotes.updateFootnotePositionsAfterCollapseStateDidChange = () => {
						requestAnimationFrame(Footnotes.updateFootnotePositions);
					});
                }
                else {
                    PT.notificationCenter.removeHandlerForEvent("Rewrite.fullWidthMediaDidLoad", Footnotes.updateFootnotePositionsAfterFullWidthMediaDidLoad);
					PT.notificationCenter.removeHandlerForEvent("Collapse.collapseStateDidChange", Footnotes.updateFootnotePositionsAfterCollapseStateDidChange);
					PT.notificationCenter.removeHandlerForEvent("Collapse.targetDidRevealOnHashUpdate", Footnotes.updateStateAfterTargetDidRevealOnHashUpdate);
                }
            }, null, (mediaQuery) => {
                PT.notificationCenter.removeHandlerForEvent("Rewrite.fullWidthMediaDidLoad", Footnotes.updateFootnotePositionsAfterFullWidthMediaDidLoad);
                PT.notificationCenter.removeHandlerForEvent("Collapse.collapseStateDidChange", Footnotes.updateFootnotePositionsAfterCollapseStateDidChange);
                PT.notificationCenter.removeHandlerForEvent("Collapse.targetDidRevealOnHashUpdate", Footnotes.updateStateAfterTargetDidRevealOnHashUpdate);
            });
        }, {once: true });

        PT.notificationCenter.addHandlerForEvent("Footnotes.footnotesDidConstruct", () => {
            Footnotes.updateFootnotePositions();

            if (!PT.pageLayoutComplete) {
                PT.notificationCenter.addHandlerForEvent("Rewrite.pageLayoutDidComplete", () => {
                    requestAnimationFrame(Footnotes.updateFootnotePositions);
                }, { once: true });
            }

            window.addEventListener("resize", Footnotes.windowResized = (event) => {
                requestAnimationFrame(() => {
                    Footnotes.updateFootnotePositions();
                });
            });
        }, { once: true });
        
        PT.notificationCenter.addHandlerForEvent("PT.contentDidLoad", Footnotes.constructFootnotesWhenMainContentLoads = (info) => {
            Footnotes.constructFootnotes();
        }, { phase: "<eventListeners", once: true, condition: (info) => info.isMainDocument });

		PT.notificationCenter.fireEvent("Footnotes.setupDidComplete");
    }
};

PT.notificationCenter.fireEvent("Footnotes.didLoad");

doWhenPageLoaded (() => {
    doWhenMatchMedia(Footnotes.mediaQueries.viewportWidthBreakpoint, "Footnotes.updateMarginNoteStyleForCurrentMode", (mediaQuery) => {
        document.querySelectorAll(".marginnote").forEach(marginNote => {
            marginNote.swapClasses([ "inline", "sidenote" ], (mediaQuery.matches ? 0 : 1));
        });
    });
});

Footnotes.setup();
