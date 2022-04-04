type ZoomOptionsDefault = {
	url			: string | false;
	on			: 'mouseover' | 'grab' | 'click' | 'toggle';
	target		: HTMLElement | false;
	magnify		: number;
	callback	: ((this: HTMLImageElement) => any) | false;
	onZoomIn	: ((this: HTMLImageElement) => any) | false;
	onZoomOut	: ((this: HTMLImageElement) => any) | false;
};
type ZoomOptions = Partial<ZoomOptionsDefault>;

interface Zoom {
	init	: () => any;
	move	: (e: JQuery.MouseMoveEvent | Touch) => any;
}
interface JQueryStatic {
	zoom	: (target: HTMLElement, source: HTMLElement, img: HTMLImageElement, magnify: number) => Zoom;
}

// noinspection JSUnusedGlobalSymbols
interface Window {
	jQuery: JQueryStatic;
}
// noinspection JSUnusedGlobalSymbols
interface JQuery {
	zoom	: {
		(options?: ZoomOptions): JQuery;
		defaults: ZoomOptionsDefault;
	};
}
declare namespace JQuery {
	// noinspection JSUnusedGlobalSymbols
	interface TypeToTriggeredEventMap<TDelegateTarget, TData, TCurrentTarget, TTarget> {
		'touchstart.zoom'	: JQuery.TouchStartEvent<TDelegateTarget, TData, TCurrentTarget, TTarget>;
		'touchmove.zoom'	: JQuery.TouchMoveEvent<TDelegateTarget, TData, TCurrentTarget, TTarget>;
		'touchend.zoom'		: JQuery.TouchEndEvent<TDelegateTarget, TData, TCurrentTarget, TTarget>;
		'mousemove.zoom'	: JQuery.MouseMoveEvent<TDelegateTarget, TData, TCurrentTarget, TTarget>;
	}
}

/*!
	Zoom 1.7.21
	license: MIT
	http://www.jacklmoore.com/zoom
*/
(function ($: JQueryStatic) {
	const defaults = {
		url: false,
		callback: false,
		target: false,
		on: 'mouseover', // other options: grab, click, toggle
		onZoomIn: false,
		onZoomOut: false,
		magnify: 1
	} as ZoomOptionsDefault;

	// Core Zoom Logic, independent of event listeners.
	$.zoom = function(target, source, img, magnify) {
		let targetHeight,
			targetWidth,
			sourceHeight: number,
			sourceWidth: number,
			xRatio: number,
			yRatio: number,
			offset: JQuery.Coordinates | undefined,
			$target = $(target),
			$source = $(source);

		img.style.width = img.style.height = '';

		$(img)
			.addClass('zoomImg')
			.css({
				top: 0,
				left: 0,
				width: img.width * magnify,
				height: img.height * magnify,
			})
			.appendTo(target);

		let eLatestMove: JQuery.MouseMoveEvent | Touch | undefined;
		const updatePosition = () => {
			let left = (eLatestMove!.pageX! - offset!.left),
				top = (eLatestMove!.pageY! - offset!.top);

			top = Math.max(Math.min(top, sourceHeight), 0);
			left = Math.max(Math.min(left, sourceWidth), 0);

			img.style.left = (left * -xRatio) + 'px';
			img.style.top = (top * -yRatio) + 'px';

			eLatestMove = undefined;
		};

		return {
			init: function() {
				targetWidth = $target.outerWidth()!;
				targetHeight = $target.outerHeight()!;

				if (source === target) {
					sourceWidth = targetWidth!;
					sourceHeight = targetHeight!;
				} else {
					sourceWidth = $source.outerWidth()!;
					sourceHeight = $source.outerHeight()!;
				}

				xRatio = (img.width - targetWidth) / sourceWidth;
				yRatio = (img.height - targetHeight) / sourceHeight;

				offset = $source.offset()!;
			},
			move: function (e: JQuery.MouseMoveEvent | Touch) {
				if(offset === undefined) {
					return;
				}

				if(eLatestMove === undefined) {
					requestAnimationFrame(updatePosition);
				}

				eLatestMove	= e;
			}
		};
	};

	const ZoomStatic = function (this: JQuery, options?: ZoomOptions) {
		return this.each(function (this: HTMLElement) {
			let settings = $.extend({}, defaults, options || {}) as ZoomOptionsDefault,
				//target will display the zoomed image
				target = settings.target && $(settings.target)[0] || this,
				//source will provide zoom location info (thumbnail)
				source = this,
				$source = $(source),
				img = document.createElement('img'),
				$img = $(img);

			const mousemove = 'mousemove.zoom';

			// If a url wasn't specified, look for an image element.
			if (!settings.url) {
				const srcElement = source.querySelector('img');
				if (srcElement) {
					settings.url = srcElement.getAttribute('data-src') || srcElement.currentSrc || srcElement.src;
				}
				if (!settings.url) {
					return;
				}
			}

			$source.one('zoom.destroy', function() {
				$source.off(".zoom");
				img.onload = null;
				$img.remove();
			});

			img.onload = function () {
				img.onload = null

				const zoom = $.zoom(target, source, img, settings.magnify);
				let touchStarted = false;

				function start(e: any) {
					zoom.init();
					zoom.move(e);

					$img.addClass('zoomImg-visible');

					if(typeof settings.onZoomIn === 'function') {
						settings.onZoomIn.call(img);
					}
				}

				function stop() {
					$img.removeClass('zoomImg-visible');

					if(typeof settings.onZoomOut === 'function') {
						settings.onZoomOut.call(img);
					}
				}

				$source
					.on('touchstart.zoom', () => {
						touchStarted	= true;
					})
					.on('mouseenter.zoom', (e) => {
						if(touchStarted) {
							touchStarted	= false;
							return;
						}

						start(e);
					})
					.on('mouseleave.zoom', () => {
						stop();
					})
					.on(mousemove, zoom.move);

				if ($.isFunction(settings.callback)) {
					settings.callback.call(img);
				}
			};

			img.setAttribute('role', 'presentation');
			img.alt = '';
			img.src = settings.url;
		});
	};

	ZoomStatic.defaults = defaults;

	$.fn.zoom = ZoomStatic;
}(window.jQuery));
