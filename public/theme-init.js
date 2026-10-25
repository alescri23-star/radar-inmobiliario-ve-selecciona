try {
  document.documentElement.dataset.theme = localStorage.getItem('radar-theme') === 'dark' ? 'dark' : 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}
