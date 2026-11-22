(() => {
	const toggle = document.querySelector('.menu-toggle');
	const navigation = document.querySelector('.site-nav');
	if (!toggle || !navigation) return;

	const setOpen = (open) => {
		toggle.setAttribute('aria-expanded', String(open));
		navigation.classList.toggle('is-open', open);
	};

	toggle.addEventListener('click', () => {
		setOpen(toggle.getAttribute('aria-expanded') !== 'true');
	});

	navigation.addEventListener('click', (event) => {
		if (event.target.closest('a')) setOpen(false);
	});

	document.addEventListener('click', (event) => {
		if (!navigation.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
			setOpen(false);
			toggle.focus();
		}
	});

	window.addEventListener('resize', () => {
		if (window.innerWidth > 1000) setOpen(false);
	});
})();
