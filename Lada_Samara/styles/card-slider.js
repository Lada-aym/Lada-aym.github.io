/*! $Id: card-slider.js 6700 2009-10-21 18:26:57Z bhillebrand $ */
/*global $: false, window: false, oCtaHelper: true */
/********************************************
*											*
********************************************/
$(document).ready(function () {
	var bSlideLock, $slideBtnLeft, $slideBtnRight, iMaskWidth,
		$cardsList = $("#cardSlider ul.cards"),
		iCardWidth = $("li.card.first", $cardsList).outerWidth(),
		iListWidth = $("li.card", $cardsList).length * iCardWidth;

	function buttonsToggleActiveState() {
		// Set left button active if the cards are allowed to move to the right
		$slideBtnLeft.toggleClass('active action', parseInt($cardsList.css("marginLeft"), 10) < 0);
		// set right button active if the cards are allowed to move to the left
		$slideBtnRight.toggleClass('active action', iMaskWidth - parseInt($cardsList.css("marginLeft"), 10) < iListWidth);
		// unlock sliding
		bSlideLock = false;
	}
	// Set JS indicator class
	$("body").addClass("jsReady");
	$("#carPicWrp").show();
	$cardsList.wrap('<div class="slideMask"></div>').width((iListWidth) + 'px');

	iMaskWidth = $("#cardSlider .slideMask").width();
	$("#cardSlider").width(iMaskWidth);

	// If the list (all cards) is wider than the visible area - display and activate slider
	if (iMaskWidth < iListWidth) {
		// Set indicator class
		$cardsList.addClass("slideModeActive");
		// Insert the slide buttons html
		$("#cardSlider .slideMask")
			.before('<div class="action slideBtn left"></div>')
			.after('<div class="action slideBtn right"></div>');

		$slideBtnLeft  = $("#cardSlider .slideBtn.left");
		$slideBtnRight = $("#cardSlider .slideBtn.right");

		// Resize the slider to make room for the buttons
		$("#cardSlider").css({width: (iMaskWidth + 2 * $slideBtnLeft.width())});

		// Check and set the buttons active state
		buttonsToggleActiveState();

		// Button click handler
		$("#cardSlider .slideBtn").click(function () {
			if ($(this).hasClass("active") && !bSlideLock) {
			// If the button is active and there is no slide (animation) executed at the moment, do the slide
				bSlideLock = true;
				var sSlideValue = ($(this).hasClass("left") ? '+=' : '-=') + iCardWidth + 'px';
				$cardsList.animate({ marginLeft: sSlideValue }, 300, function () {
					buttonsToggleActiveState();
				});

			}
		});
	} else {
	// If no slider is needed, just apply the corners
		$cardsList.children("li:first-child").addClass("box").append('<div class="corner topLeft"></div><div class="corner bottomLeft"></div>');
		$cardsList.children("li:last-child").addClass("box").append('<div class="corner topRight"></div><div class="corner bottomRight"></div>');
	}

	// If the slider is on the model configure page
	if ($("#cardSlider").is(".modelConfigure #cardSlider")) {
		oCtaHelper.setType($('#cardSlider ul.cards > .card:not(.active) .button'), 'cta2');
		// Apply the hover effect classes...
		$("#cardSlider ul.cards .card").hover(function () {
			$(this).addClass("hover");
		}, function () {
			$(this).removeClass("hover");
		});

		// ... and the cards click handler for displaying the trim images
		$("#cardSlider ul.cards .card").click(function () {
			var sTrimId,
				sCardId = $(this).attr('id');
			// Reset cards and buttons
			oCtaHelper.setType($('#cardSlider ul.cards .card').removeClass('active').find(".button.cta1"), 'cta2');
			// Activate the clicked card and set its button type to cta1
			oCtaHelper.setType($(this).addClass('active').find(".button"), 'cta1');
			sTrimId = sCardId + '_trim';
			// Show the according trim image and hide all others
			$("#carPicWrp .trim.show").removeClass("show");
			$("#" + sTrimId).addClass("show");
		});
	}
});
