import { useEffect } from 'react';

/**
 * Fades `.reveal` elements inside `ref` into view as they scroll in.
 * Elements stay visible once revealed. Reduced motion is handled in CSS.
 */
export default function useReveal(ref) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const elements = root.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('reveal--visible'));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ref]);
}
