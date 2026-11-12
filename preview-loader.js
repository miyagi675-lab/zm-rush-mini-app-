export function createPreviewLoader() {
  function load(image) {
    image.src = image.dataset.preview;
    delete image.dataset.preview;
  }

  const observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries, activeObserver) => {
      for (const {target, isIntersecting} of entries) {
        if (!isIntersecting || !target.isConnected || !target.dataset.preview) continue;
        activeObserver.unobserve(target);
        load(target);
      }
    }, {rootMargin: '160px 0px'})
    : null;

  return function loadPreviews(container) {
    observer?.disconnect();
    for (const image of container.querySelectorAll('img[data-preview]')) {
      if (observer) observer.observe(image);
      else load(image);
    }
  };
}
