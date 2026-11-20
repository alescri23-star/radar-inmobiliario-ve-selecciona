(function () {
	'use strict';

	var figures = document.querySelectorAll('.radar-report-count[data-report-value]');
	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var formatter = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 });

	function parseFigure(element) {
		var raw = element.getAttribute('data-report-value') || element.textContent || '';
		var match = raw.match(/[\d.]+/);
		if (!match) {
			return null;
		}
		return {
			raw: raw,
			prefix: raw.slice(0, match.index),
			suffix: raw.slice((match.index || 0) + match[0].length),
			value: Number(match[0].replace(/\./g, ''))
		};
	}

	function animateFigure(element) {
		if (element.dataset.reportAnimated === 'true') {
			return;
		}
		var figure = parseFigure(element);
		element.dataset.reportAnimated = 'true';
		if (!figure || !Number.isFinite(figure.value) || reduceMotion) {
			element.textContent = figure ? figure.raw : element.textContent;
			element.classList.add('is-counted');
			return;
		}

		var duration = 1250;
		var start = performance.now();
		element.classList.add('is-counting');
		function frame(now) {
			var progress = Math.min((now - start) / duration, 1);
			var eased = 1 - Math.pow(1 - progress, 3);
			var current = Math.round(figure.value * eased);
			element.textContent = figure.prefix + formatter.format(current) + figure.suffix;
			if (progress < 1) {
				window.requestAnimationFrame(frame);
			} else {
				element.textContent = figure.raw;
				element.classList.remove('is-counting');
				element.classList.add('is-counted');
			}
		}
		window.requestAnimationFrame(frame);
	}

	if (!('IntersectionObserver' in window)) {
		figures.forEach(animateFigure);
		return;
	}

	var observer = new IntersectionObserver(function (entries) {
		entries.forEach(function (entry) {
			if (entry.isIntersecting) {
				animateFigure(entry.target);
				observer.unobserve(entry.target);
			}
		});
	}, { threshold: 0.35 });
	figures.forEach(function (figure) { observer.observe(figure); });
}());
